"""Read live BTP users through XSUAA SCIM, including local service bindings."""
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import requests
from fastapi import HTTPException


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


def require_user_admin(authorization: str | None) -> None:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "SAP XSUAA authentication required.")
    credentials = xsuaa_credentials("application")
    if not credentials:
        raise HTTPException(503, "XSUAA application binding is required to validate access.")
    try:
        from sap import xssec
    except ImportError:
        raise HTTPException(503, "Install the backend requirements (sap-xssec) and restart the backend.")
    try:
        context = xssec.create_security_context(authorization.split(" ", 1)[1].strip(), credentials)
    except Exception:
        raise HTTPException(401, "Invalid or expired SAP XSUAA token.")
    if not context.check_local_scope("Admin"):
        raise HTTPException(403, "The platform Administrator role is required to view users.")


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
