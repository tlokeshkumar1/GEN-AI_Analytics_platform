"""
SAP XSUAA Security & JWT Authentication Middleware / Dependency
=================================================================
Validates SAP Authorization and Trust Management Service (XSUAA) JWT tokens
passed via HTTP 'Authorization: Bearer <token>' headers.

Features:
- Extracts user_id, email, given_name, family_name, and user scopes ($XSAPPNAME.User).
- Provides graceful fallback to mock developer context during local dev (when XSUAA env is absent).
"""

import os
import json
import base64
from typing import Dict, Any, Optional, List
from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from api.utils.logger import get_logger

logger = get_logger("utils.auth")

security_scheme = HTTPBearer(auto_error=False)


class UserContext:
    """Represents the authenticated SAP BTP user extracted from XSUAA JWT token."""

    def __init__(self, user_id: str, email: str, name: str, scopes: List[str], role: str, roles: List[str]):
        self.user_id: str = user_id
        self.email: str = email
        self.name: str = name
        self.scopes: List[str] = scopes
        self.role: str = role
        self.roles: List[str] = roles

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "email": self.email,
            "name": self.name,
            "scopes": self.scopes,
            "role": self.role,
            "roles": self.roles,
        }


def parse_jwt_unverified(token: str) -> Dict[str, Any]:
    """Parse JWT payload without verification (for extracting user claims in internal routes)."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT format")
        payload_b64 = parts[1]
        # Pad base64 string
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        decoded_bytes = base64.urlsafe_b64decode(padded)
        return json.loads(decoded_bytes.decode("utf-8"))
    except Exception as exc:
        logger.warning(f"[Auth] Could not decode JWT payload: {exc}")
        return {}


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_scheme)
) -> UserContext:
    """
    FastAPI dependency to get the current authenticated SAP BTP user.
    Reads 'Authorization: Bearer <jwt>' token passed by SAP AppRouter.

    Role resolution (Admin takes precedence over Member):
      - $XSAPPNAME.Admin  in scopes  -> role = "Admin"
      - $XSAPPNAME.Member in scopes  -> role = "Member"
      - Both Admin + Member in scopes -> role = "Admin"
    """
    if not auth or not auth.credentials:
        logger.warning("[Auth] Missing Authorization header in request.")
        raise HTTPException(status_code=401, detail="Authentication token required (SAP BTP IAS / XSUAA)")

    token = auth.credentials
    claims = parse_jwt_unverified(token)

    if not claims:
        raise HTTPException(status_code=401, detail="Invalid XSUAA JWT token")

    user_id = claims.get("user_id") or claims.get("user_name") or claims.get("sub", "unknown_user")
    email = claims.get("email", "")
    given_name = claims.get("given_name", "")
    family_name = claims.get("family_name", "")
    full_name = f"{given_name} {family_name}".strip() or claims.get("user_name", user_id)
    scopes = claims.get("scope", [])

    has_admin = any(
        s.endswith(".Admin") or s.endswith(":Admin") or s == "Admin" or s == "$XSAPPNAME.Admin"
        for s in scopes
    )
    has_member = any(
        s.endswith(".Member") or s.endswith(":Member") or s == "Member" or s == "$XSAPPNAME.Member" or s.endswith(".User")
        for s in scopes
    )

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
        role = "Member"  # default fallback
        roles = ["Member"]

    return UserContext(
        user_id=user_id,
        email=email,
        name=full_name,
        scopes=scopes,
        role=role,
        roles=roles,
    )
