import json
import sys
import time
import types
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# These packages eagerly initialize unrelated database/AI services. Keep this
# test suite isolated from HANA connections and dataset loading.
for package in ("routes", "services"):
    module = types.ModuleType(f"api.{package}")
    module.__path__ = [str(Path(__file__).resolve().parents[1] / "api" / package)]
    sys.modules.setdefault(f"api.{package}", module)

import jwt
import requests
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes.users import router
from api.services import xsuaa_users_service as service


class XsuaaUsersTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        cls.application = {
            "clientid": "platform-client!t1", "clientsecret": "test-only",
            "xsappname": "platform!t1", "url": "https://tenant.example.test",
            "identityzoneid": "test-zone",
            "verificationkey": cls.private_key.public_key().public_bytes(
                serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo,
            ).decode(),
        }

    def setUp(self):
        self.env = patch.dict("os.environ", {
            "VCAP_SERVICES": json.dumps({"xsuaa": [{"plan": "application", "credentials": self.application}]}),
            "XSUAA_ADMIN_ROLE_COLLECTION": "Platform Administrator (dev)",
            "XSUAA_MEMBER_ROLE_COLLECTION": "Platform Member (dev)",
        }, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)
        app = FastAPI()
        app.include_router(router)
        self.client = TestClient(app)

    def token(self, scope="platform!t1.Admin", **extra):
        claims = {"cid": self.application["clientid"], "zid": "test-zone",
                  "aud": [self.application["clientid"]], "scope": [scope],
                  "user_name": "admin@example.test", "grant_type": "authorization_code",
                  "exp": int(time.time()) + 300, **extra}
        return jwt.encode(claims, self.private_key, algorithm="RS256")

    def test_admin_can_read_and_response_is_not_cached(self):
        with patch("api.routes.users.list_users", return_value={"users": [], "total": 0}) as listing:
            response = self.client.get("/api/users", headers={"Authorization": "Bearer " + self.token()})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.headers["cache-control"], "no-store")
        listing.assert_called_once()

    def test_missing_member_foreign_scope_expired_and_forged_tokens_are_denied(self):
        tokens = [None, self.token("platform!t1.Member"), self.token("other.Admin"),
                  self.token(exp=int(time.time()) - 100),
                  jwt.encode({"scope": ["platform!t1.Admin"]}, "forged-secret" * 4, algorithm="HS256")]
        for token in tokens:
            with self.subTest(token_type="missing" if token is None else "supplied"):
                with patch("api.routes.users.list_users") as listing:
                    response = self.client.get("/api/users", headers={"Authorization": "Bearer " + token} if token else {})
                    self.assertIn(response.status_code, (401, 403))
                    listing.assert_not_called()

    def test_normalizes_live_identity_role_and_login(self):
        user = service.normalize_user({
            "id": "u1", "name": {"givenName": "Ada", "familyName": "Lovelace"},
            "emails": [{"value": "secondary@example.test"}, {"value": "ada@example.test", "primary": True}],
            "groups": [{"value": "g1"}], "active": True, "lastLogonTime": 1700000000000,
        }, {"g1": "Platform Administrator (dev)"})
        self.assertEqual(user["name"], "Ada Lovelace")
        self.assertEqual(user["email"], "ada@example.test")
        self.assertEqual(user["tier"], "Administrator")
        self.assertEqual(user["last_login"], "2023-11-14T22:13:20+00:00")

    def test_other_administrator_collection_does_not_grant_platform_tier(self):
        user = service.normalize_user({"id": "u1", "active": False, "groups": [{"display": "Subaccount Administrator"}]}, {})
        self.assertEqual(user["tier"], "No direct platform role")
        self.assertEqual(user["status"], "Inactive")
        self.assertIsNone(user["last_login"])

    def test_unknown_login_and_status_are_not_fabricated(self):
        for value in [None, -1, 0, "invalid", float("inf")]:
            self.assertIsNone(service.login_timestamp(value))
        self.assertEqual(service.normalize_user({"id": "u1"}, {})["status"], "Unknown")

    def test_pagination_reads_every_page(self):
        session = Mock()
        session.get.side_effect = [self.response({"resources": [{"id": "1"}], "totalResults": 2}),
                                   self.response({"Resources": [{"id": "2"}], "totalResults": 2})]
        self.assertEqual(len(service._resources(session, "https://api.example.test", "Users")), 2)
        self.assertEqual(session.get.call_args.kwargs["params"]["startIndex"], 2)

    def test_incomplete_page_is_an_error(self):
        session = Mock()
        session.get.return_value = self.response({"resources": [], "totalResults": 1})
        with self.assertRaises(ValueError):
            service._resources(session, "https://api.example.test", "Users")

    def test_binding_selection_and_missing_application_api_url(self):
        self.assertEqual(service.xsuaa_credentials("application"), self.application)
        with self.assertRaises(service.HTTPException) as error:
            service.list_users("Bearer administrator-token")
        self.assertEqual(error.exception.status_code, 503)

    def test_local_default_env_credentials_are_loaded(self):
        bindings = {"VCAP_SERVICES": {"xsuaa": [{"plan": "application", "credentials": self.application},
                                               {"plan": "apiaccess", "credentials": {"clientid": "read-client"}}]}}
        with patch.dict("os.environ", {}, clear=True), patch.object(Path, "exists", return_value=True), patch.object(Path, "read_text", return_value=json.dumps(bindings)):
            self.assertEqual(service.xsuaa_credentials("application"), self.application)
            with self.assertRaises(service.HTTPException):
                service.xsuaa_credentials("apiaccess")

    def test_malformed_scim_is_not_reported_as_zero_users(self):
        session = Mock()
        session.get.return_value = self.response({"unexpected": []})
        with self.assertRaises(ValueError):
            service._resources(session, "https://api.example.test", "Users")

    def test_live_fetch_resolves_group_ids_without_exposing_credentials(self):
        credentials = {"url": "https://tenant.example.test", "apiurl": "https://api.example.test",
                       "clientid": "technical-client", "clientsecret": "technical-secret"}
        session = Mock()
        session.__enter__ = Mock(return_value=session)
        session.__exit__ = Mock(return_value=False)
        session.get.side_effect = [self.response({"resources": [{"id": "u1", "groups": [{"value": "g1"}]}], "totalResults": 1}),
                                   self.response({"resources": [{"id": "g1", "displayName": "Platform Member (dev)"}], "totalResults": 1})]
        with patch.object(service, "xsuaa_credentials", return_value=credentials), patch.object(requests, "Session", return_value=session):
            data = service.list_users("Bearer administrator-token")
        self.assertEqual(data["users"][0]["tier"], "Member")
        self.assertNotIn("technical-secret", json.dumps(data))
        self.assertNotIn("technical-token", json.dumps(data))
        session.post.assert_not_called()
        session.headers.update.assert_called_once_with({"Authorization": "Bearer administrator-token", "Accept": "application/json"})

    def test_unrelated_users_and_roles_are_excluded_from_api_response(self):
        session = Mock()
        session.__enter__ = Mock(return_value=session)
        session.__exit__ = Mock(return_value=False)
        session.get.return_value = self.response({"resources": [
            {"id": "project-admin", "groups": [{"display": "Platform Administrator (dev)"}, {"display": "Unrelated Admin"}]},
            {"id": "project-member", "groups": [{"display": "Platform Member (dev)"}]},
            {"id": "unrelated", "groups": [{"display": "Subaccount Administrator"}]},
            {"id": "other-space", "groups": [{"display": "Platform Member (prod)"}]},
            {"id": "unassigned"},
        ], "totalResults": 5})
        with patch.object(service, "xsuaa_credentials", return_value={"apiurl": "https://api.example.test"}), patch.object(requests, "Session", return_value=session):
            data = service.list_users("Bearer administrator-token")
        self.assertEqual(data["total"], 2)
        self.assertEqual([user["id"] for user in data["users"]], ["project-admin", "project-member"])
        self.assertNotIn("Unrelated Admin", json.dumps(data))

    def test_only_the_configured_application_service_is_selected(self):
        bindings = {"xsuaa": [
            {"name": "unrelated", "plan": "application", "credentials": {"clientid": "wrong"}},
            {"name": "project", "plan": "application", "credentials": self.application},
            {"name": "project-apiaccess", "plan": "apiaccess", "credentials": {"clientid": "wrong"}},
        ]}
        with patch.dict("os.environ", {"VCAP_SERVICES": json.dumps(bindings), "XSUAA_SERVICE_NAME": "project"}):
            self.assertEqual(service.xsuaa_credentials(), self.application)

    def test_upstream_failure_has_no_credential_details(self):
        credentials = {"url": "https://tenant.example.test", "apiurl": "https://api.example.test",
                       "clientid": "technical-client", "clientsecret": "technical-secret"}
        with patch.object(service, "xsuaa_credentials", return_value=credentials), patch.object(requests, "Session", side_effect=requests.ConnectionError("technical-secret")):
            with self.assertRaises(service.HTTPException) as error:
                service.list_users("Bearer administrator-token")
        self.assertEqual(error.exception.status_code, 502)
        self.assertNotIn("technical-secret", error.exception.detail)

    @staticmethod
    def response(data):
        response = Mock()
        response.json.return_value = data
        return response


if __name__ == "__main__":
    unittest.main()
