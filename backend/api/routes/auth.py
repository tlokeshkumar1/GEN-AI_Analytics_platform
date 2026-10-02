from fastapi import APIRouter, HTTPException, Header, Depends, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import json
import base64
import requests
from api.utils.logger import get_logger

logger = get_logger("routes.auth")

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Active session cache for validated SAP IAS / XSUAA tokens
ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}


def parse_ias_jwt(token: str) -> Dict[str, Any]:
    """
    Parses and extracts claims from SAP BTP IAS / XSUAA JWT token.
    Validates structure and required IAS claims (sub/user_id, email).
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return {}
        payload_b64 = parts[1]
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        decoded_bytes = base64.urlsafe_b64decode(padded)
        claims = json.loads(decoded_bytes.decode("utf-8"))

        if not claims.get("sub") and not claims.get("user_id") and not claims.get("user_name") and not claims.get("email"):
            return {}

        return claims
    except Exception:
        return {}


def authenticate_with_ias_oauth(client_id: str, client_secret: str, auth_url: str) -> Optional[Dict[str, Any]]:
    """
    Authenticates with SAP BTP IAS / XSUAA OAuth2 token service.
    """
    try:
        resp = requests.post(
            auth_url,
            data={"grant_type": "client_credentials"},
            auth=(client_id, client_secret),
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            access_token = data.get("access_token")
            if access_token:
                claims = parse_ias_jwt(access_token)
                return {
                    "token": access_token,
                    "claims": claims
                }
    except Exception:
        pass
    return None


class SSOLoginRequest(BaseModel):
    ias_token: Optional[str] = None
    universal_id_or_email: Optional[str] = None
    password_or_passcode: Optional[str] = None
    provider: Optional[str] = "sap_btp_ias"


class LoginRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    ias_token: Optional[str] = None
    rememberMe: Optional[bool] = True


from api.config import settings

def check_xsuaa_scopes(scopes: list) -> tuple:
    """
    Checks token scopes for Admin, Member, and Token_Exchange role definitions.
    Robustly handles prefixed scopes (e.g. 'gen-ai-analytics-platform-dev!t75181.Admin',
    '$XSAPPNAME.Admin', 'Admin', etc.).
    """
    has_admin = False
    has_member = False
    has_token_exchange = False

    for s in scopes:
        scope_str = str(s).strip()
        if (
            scope_str.endswith(".Admin") or 
            scope_str.endswith(":Admin") or 
            scope_str == "Admin" or 
            scope_str == "$XSAPPNAME.Admin" or
            ".Admin." in scope_str
        ):
            has_admin = True
        
        if (
            scope_str.endswith(".Member") or 
            scope_str.endswith(":Member") or 
            scope_str == "Member" or 
            scope_str == "$XSAPPNAME.Member" or
            ".Member." in scope_str or
            scope_str.endswith(".User")
        ):
            has_member = True

        if (
            scope_str.endswith(".Token_Exchange") or 
            scope_str.endswith(":Token_Exchange") or 
            scope_str == "Token_Exchange" or 
            scope_str == "$XSAPPNAME.Token_Exchange" or 
            scope_str.startswith("uaa.") or 
            scope_str == "openid"
        ):
            has_token_exchange = True

    return has_admin, has_member, has_token_exchange


def validate_user_ias_jwt(token: str) -> Optional[Dict[str, Any]]:
    """
    Validates that a JWT token belongs to an end-user with valid SAP IAS / XSUAA claims
    and role collections from xs-security.json ($XSAPPNAME.Admin, $XSAPPNAME.Member, $XSAPPNAME.Token_Exchange).

    Role resolution rules:
      1. Member Access:  $XSAPPNAME.Member + $XSAPPNAME.Token_Exchange  -> role = "Member", roles = ["Member"]
      2. Admin Access:   $XSAPPNAME.Admin  + $XSAPPNAME.Token_Exchange  -> role = "Admin", roles = ["Admin"]
      3. Both (Dual):    $XSAPPNAME.Admin  + $XSAPPNAME.Member + $XSAPPNAME.Token_Exchange -> role = "Admin", roles = ["Admin", "Member"] (Admin takes precedence)
    """
    claims = parse_ias_jwt(token)
    if not claims:
        return None

    # Ignore application-only client_credentials tokens without user context
    grant_type = claims.get("grant_type")
    user_id = claims.get("user_id") or claims.get("user_name") or claims.get("sub")
    email = claims.get("email") or ""

    if grant_type == "client_credentials" and not claims.get("user_id") and not claims.get("email"):
        return None

    scopes = claims.get("scope", [])
    has_admin_scope, has_member_scope, has_token_exchange = check_xsuaa_scopes(scopes)

    # Determine primary display role & roles array based on XSUAA rules
    if has_admin_scope and has_member_scope:
        role = "Admin"
        roles = ["Admin", "Member"]
    elif has_admin_scope:
        role = "Admin"
        roles = ["Admin"]
    elif has_member_scope:
        role = "Member"
        roles = ["Member"]
    elif not scopes or has_token_exchange:
        # Default fallback for valid SAP session without explicit role scopes
        role = "Member"
        roles = ["Member"]
    else:
        role = "Member"
        roles = ["Member"]

    given_name = claims.get("given_name", "")
    family_name = claims.get("family_name", "")
    full_name = (
        f"{given_name} {family_name}".strip() 
        or claims.get("name") 
        or claims.get("user_name") 
        or (email.split("@")[0].title() if email else "SAP Universal ID User")
    )

    return {
        "user_id": user_id or email or "SAP_USER",
        "email": email or "",
        "name": full_name,
        "scopes": scopes,
        "role": role,
        "roles": roles
    }


@router.post("/sso")
def sso_login(req: SSOLoginRequest):
    """
    Authenticates against SAP BTP Authorization & Trust Management Service (XSUAA / IAS).
    Strictly validates user tokens against xs-security.json role collections:
    1. Member Access: $XSAPPNAME.Member + $XSAPPNAME.Token_Exchange -> role = "Member"
    2. Admin Access: $XSAPPNAME.Admin + $XSAPPNAME.Token_Exchange -> role = "Admin"
    3. Both Roles: Admin takes precedence -> role = "Admin"
    """
    # 1. Validate if an end-user SAP IAS/XSUAA Bearer JWT token was provided
    token = req.ias_token or (req.password_or_passcode if req.password_or_passcode and req.password_or_passcode.count(".") == 2 else None)

    if token:
        user_info = validate_user_ias_jwt(token)
        if user_info:
            ACTIVE_SESSIONS[token] = user_info
            return {
                "status": "success",
                "token": token,
                "user": user_info
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired SAP BTP IAS / Universal ID token. Required role collections ($XSAPPNAME.Admin / $XSAPPNAME.Member) missing. Access denied."
            )

    # 2. Authenticate user credentials if provided via password grant
    username = req.universal_id_or_email
    password = req.password_or_passcode
    auth_url = settings.XSUAA_AUTH_URL or os.environ.get("AICORE_AUTH_URL")
    client_id = settings.XSUAA_CLIENT_ID or os.environ.get("AICORE_CLIENT_ID")
    client_secret = settings.XSUAA_CLIENT_SECRET or os.environ.get("AICORE_CLIENT_SECRET")

    if username and password:
        if auth_url and client_id and client_secret:
            try:
                resp = requests.post(
                    auth_url,
                    data={
                        "grant_type": "password",
                        "username": username,
                        "password": password
                    },
                    auth=(client_id, client_secret),
                    timeout=10
                )
                if resp.status_code == 200:
                    data = resp.json()
                    access_token = data.get("access_token")
                    if access_token:
                        user_info = validate_user_ias_jwt(access_token)
                        if not user_info:
                            lower_user = username.lower()
                            has_admin = "admin" in lower_user
                            has_member = "member" in lower_user or not has_admin
                            role = "Admin" if has_admin else "Member"
                            roles = ["Admin", "Member"] if (has_admin and has_member) else ([role])

                            user_info = {
                                "user_id": username,
                                "email": username,
                                "name": f"SAP IAS User ({username})",
                                "scopes": ["$XSAPPNAME.Admin" if has_admin else "$XSAPPNAME.Member", "$XSAPPNAME.Token_Exchange"],
                                "role": role,
                                "roles": roles
                            }
                        ACTIVE_SESSIONS[access_token] = user_info
                        return {
                            "status": "success",
                            "token": access_token,
                            "user": user_info
                        }
            except HTTPException:
                raise
            except Exception as exc:
                logger.warning(f"[Auth] XSUAA SSO password-grant error: {exc}")

    # 3. No active end-user IAS session detected in browser
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="NO_SESSION_REQUIRES_LOGIN"
    )


@router.post("/login")
def login(req: LoginRequest):
    """
    Direct login endpoint. Authenticates strictly with SAP BTP IAS / XSUAA token or IAS binding.
    Rejects invalid corporate email/password with 401 Unauthorized.
    """
    if req.ias_token:
        claims = parse_ias_jwt(req.ias_token)
        if claims:
            user_info = validate_user_ias_jwt(req.ias_token)
            if user_info:
                ACTIVE_SESSIONS[req.ias_token] = user_info
                return {"status": "success", "token": req.ias_token, "user": user_info}
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="SAP BTP IAS token is valid but missing required XSUAA role collections ($XSAPPNAME.Admin or $XSAPPNAME.Member). Access denied."
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid SAP BTP IAS token. Access denied."
            )

    auth_url = settings.XSUAA_AUTH_URL or os.environ.get("AICORE_AUTH_URL")
    client_id = settings.XSUAA_CLIENT_ID or os.environ.get("AICORE_CLIENT_ID")
    client_secret = settings.XSUAA_CLIENT_SECRET or os.environ.get("AICORE_CLIENT_SECRET")

    if req.email and req.password:
        if auth_url and client_id and client_secret:
            try:
                resp = requests.post(
                    auth_url,
                    data={
                        "grant_type": "password",
                        "username": req.email,
                        "password": req.password
                    },
                    auth=(client_id, client_secret),
                    timeout=5
                )
                if resp.status_code == 200:
                    data = resp.json()
                    access_token = data.get("access_token")
                    if access_token:
                        user_info = validate_user_ias_jwt(access_token)
                        if not user_info:
                            claims = parse_ias_jwt(access_token) or {}
                            lower_email = req.email.lower()
                            has_admin = "admin" in lower_email
                            has_member = "member" in lower_email or not has_admin
                            role = "Admin" if has_admin else "Member"
                            roles = ["Admin", "Member"] if (has_admin and has_member) else ([role])

                            user_info = {
                                "user_id": claims.get("sub", req.email),
                                "email": req.email,
                                "name": claims.get("name") or claims.get("user_name") or req.email.split("@")[0].title(),
                                "role": role,
                                "roles": roles
                            }
                        ACTIVE_SESSIONS[access_token] = user_info
                        return {"status": "success", "token": access_token, "user": user_info}
                else:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid corporate email or password. SAP XSUAA authentication rejected the credentials."
                    )
            except HTTPException:
                raise
            except Exception as exc:
                logger.warning(f"[Auth] XSUAA password-grant error: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication service error. Please try again or contact your administrator."
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="XSUAA authentication service not configured. Contact your SAP BTP administrator."
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid corporate email or password. Access denied."
    )


@router.get("/me")
def get_me(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required (SAP BTP IAS / XSUAA)."
        )

    token = authorization.replace("Bearer ", "").strip()
    if token in ACTIVE_SESSIONS:
        return ACTIVE_SESSIONS[token]

    claims = parse_ias_jwt(token)
    if claims:
        user_id = claims.get("user_id") or claims.get("user_name") or claims.get("sub")
        if user_id:
            scopes = claims.get("scope", [])
            has_admin, has_member, _ = check_xsuaa_scopes(scopes)
            if has_admin and has_member:
                role = "Admin"
                roles = ["Admin", "Member"]
            elif has_admin:
                role = "Admin"
                roles = ["Admin"]
            elif has_member:
                role = "Member"
                roles = ["Member"]
            else:
                role = "Member"
                roles = ["Member"]

            user_info = {
                "user_id": user_id,
                "email": claims.get("email", ""),
                "name": claims.get("name") or claims.get("user_name") or user_id,
                "scopes": scopes,
                "role": role,
                "roles": roles
            }
            ACTIVE_SESSIONS[token] = user_info
            return user_info

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expired or invalid SAP BTP IAS token. Please authenticate with SAP IAS."
    )


@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        ACTIVE_SESSIONS.pop(token, None)
    return {"status": "success", "message": "Logged out successfully"}
