"""Read live BTP users through XSUAA SCIM, including local service bindings."""
import base64
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

import requests
from fastapi import HTTPException

logger = logging.getLogger(__name__)


def xsuaa_credentials(plan: str = "application") -> dict:
    if plan != "application":
        raise HTTPException(503, "Only the project XSUAA application service is supported.")
    try:
        vcap = os.getenv("VCAP_SERVICES")
        if vcap:
            services = json.loads(vcap)
        else:
            local_bindings = Path(__file__).resolve().parents[3] / "default-env.json"
            services = json.loads(local_bindings.read_text(encoding="utf-8-sig")).get("VCAP_SERVICES", {}) if local_bindings.exists() else {}
        for service in services.get("xsuaa", []):
            expected_name = os.getenv("XSUAA_SERVICE_NAME")
            if service.get("plan") == "application" and (not expected_name or service.get("name") == expected_name):
                return service.get("credentials", {})
        # A service-key JSON is useful for local development; never send it to the UI.
        return json.loads(os.getenv("XSUAA_APPLICATION_CREDENTIALS", "{}"))
    except (ValueError, TypeError, OSError):
        raise HTTPException(503, "Invalid XSUAA binding configuration.")


def _parse_jwt_claims(token: str) -> dict:
    """Decode JWT payload without signature/expiry verification (for local dev fallback)."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return {}
        payload_b64 = parts[1]
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        return json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
    except Exception:
        return {}


def _has_user_management_access(scopes: list) -> bool:
    """Check if any scope grants access to the user management endpoint.

    Access is granted by either:
      - $XSAPPNAME.Admin  (Administrator role collection)
      - xs_user.read      (User Management role collection / UserManagementReader)
    """
    for s in scopes:
        scope_str = str(s).strip()
        if (
            scope_str.endswith(".Admin")
            or scope_str.endswith(":Admin")
            or scope_str == "Admin"
            or scope_str == "$XSAPPNAME.Admin"
        ):
            return True
        if scope_str == "xs_user.read":
            return True
    return False


def require_user_admin(authorization: str | None) -> None:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "SAP XSUAA authentication required.")
    credentials = xsuaa_credentials("application")
    if not credentials:
        raise HTTPException(503, "XSUAA application binding is required to validate access.")

    token = authorization.split(" ", 1)[1].strip()
    is_dev = os.getenv("APP_ENV", "development") == "development"

    # Attempt strict sap-xssec offline validation first
    try:
        from sap import xssec
        context = xssec.create_security_context(token, credentials)
        # check_local_scope only works for $XSAPPNAME scopes; xs_user.read is a
        # foreign scope so we must also inspect the JWT claims directly.
        claims = _parse_jwt_claims(token)
        if not context.check_local_scope("Admin") and not _has_user_management_access(claims.get("scope", [])):
            raise HTTPException(403, "The platform Administrator or User Management role is required to view users.")
        return  # Validation passed
    except ImportError:
        if not is_dev:
            raise HTTPException(503, "Install the backend requirements (sap-xssec) and restart the backend.")
        logger.warning("sap-xssec not installed; falling back to JWT claim parsing (dev mode).")
    except HTTPException:
        raise
    except Exception as exc:
        if not is_dev:
            raise HTTPException(401, "Invalid or expired SAP XSUAA token.")
        logger.warning(f"sap-xssec rejected the token ({exc}); falling back to JWT claim parsing (dev mode).")

    # Development-only fallback: parse JWT claims without expiry enforcement
    claims = _parse_jwt_claims(token)
    if not claims or not (claims.get("sub") or claims.get("user_id") or claims.get("email")):
        raise HTTPException(401, "Invalid SAP XSUAA token — could not extract user identity.")
    scopes = claims.get("scope", [])
    if not _has_user_management_access(scopes):
        raise HTTPException(403, "The platform Administrator or User Management role is required to view users.")


def login_timestamp(value) -> str | None:
    try:
        milliseconds = float(value)
        if milliseconds <= 0:
            return None
        return datetime.fromtimestamp(milliseconds / 1000, timezone.utc).isoformat()
    except (ValueError, TypeError, OverflowError, OSError):
        return None


def normalize_user(user: dict, groups: dict) -> dict:
    email_records = user.get("emails") or []
    primary = next((email for email in email_records if email.get("primary")), None)
    email = (primary or (email_records[0] if email_records else {})).get("value", "")
    name = user.get("name") or {}
    full_name = name.get("formatted") or " ".join(filter(None, [name.get("givenName"), name.get("familyName")]))
    collections = sorted({
        group.get("display") or groups.get(group.get("value"))
        for group in user.get("groups", [])
        if group.get("display") or groups.get(group.get("value"))
    })
    admin_collection = os.getenv("XSUAA_ADMIN_ROLE_COLLECTION", "GEN-AI Analytics Platform Administrator")
    member_collection = os.getenv("XSUAA_MEMBER_ROLE_COLLECTION", "GEN-AI Analytics Platform Member")
    tier = "Administrator" if admin_collection in collections else "Member" if member_collection in collections else "No direct platform role"
    active = user.get("active")
    return {
        "id": user["id"],
        "name": full_name or user.get("displayName") or user.get("userName") or email or user["id"],
        "email": email,
        "role": ", ".join(collections) or "No directly assigned role collections",
        "tier": tier,
        "status": "Active" if active is True else "Inactive" if active is False else "Unknown",
        "last_login": login_timestamp(user.get("lastLogonTime")),
        "origin": user.get("origin", ""),
        "role_collections": collections,
    }


def _resources(session: requests.Session, base_url: str, resource: str) -> list:
    records = []
    start = 1
    while True:
        response = session.get(
            f"{base_url}/{resource}", params={"startIndex": start, "count": 100}, timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        page = data.get("resources", data.get("Resources"))
        if not isinstance(page, list) or "totalResults" not in data:
            raise ValueError("Invalid XSUAA SCIM response")
        total = int(data.get("totalResults", len(records) + len(page)))
        if not page and len(records) < total:
            raise ValueError("Incomplete XSUAA SCIM response")
        records.extend(page)
        if len(records) >= total:
            return records
        start += len(page)


def list_users(authorization: str) -> dict:
    credentials = xsuaa_credentials()
    if not credentials.get("apiurl"):
        raise HTTPException(503, "The project XSUAA application binding must include apiurl.")
    project_collections = {
        os.getenv("XSUAA_ADMIN_ROLE_COLLECTION", "GEN-AI Analytics Platform Administrator"),
        os.getenv("XSUAA_MEMBER_ROLE_COLLECTION", "GEN-AI Analytics Platform Member"),
    }
    try:
        with requests.Session() as session:
            # Forward the verified project administrator's token. No technical
            # account or second XSUAA instance is used for directory reads.
            session.headers.update({"Authorization": authorization, "Accept": "application/json"})
            base_url = credentials["apiurl"].rstrip("/")
            raw_users = _resources(session, base_url, "Users")
            # SCIM group values are IDs; resolve them to actual role collection names.
            groups = {}
            if any(group.get("value") and not group.get("display") for user in raw_users for group in user.get("groups", [])):
                groups = {group["id"]: group["displayName"] for group in _resources(session, base_url, "Groups")}
            users = []
            for raw_user in raw_users:
                user = normalize_user(raw_user, groups)
                assigned = sorted(project_collections.intersection(user["role_collections"]))
                if not assigned:
                    continue
                user["role_collections"] = assigned
                user["role"] = ", ".join(assigned)
                users.append(user)
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code in (401, 403):
            raise HTTPException(403, "Assign the GEN-AI Analytics Platform User Management role collection for this space in addition to Administrator, then sign out and in again to enable read-only user management.")
        raise HTTPException(502, "Could not read project users from XSUAA.")
    except (requests.RequestException, ValueError, KeyError, TypeError):
        raise HTTPException(502, "Could not read project users from the XSUAA application service.")
    return {"users": users, "total": len(users), "source": "xsuaa", "fetched_at": datetime.now(timezone.utc).isoformat()}
