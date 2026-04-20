"""
================================================================
  Adarsh Auth — Python Client
  Same API as keyauth.cs: init(), login(), register(), etc.
  
  Usage:
    from keyauth import api
    app = api()          # uses default credentials
    app.init()
    app.login("user", "pass")
================================================================
"""

import hmac
import hashlib
import json
import time
import secrets
import platform
import subprocess
import threading
import requests
from dataclasses import dataclass, field
from typing import Optional

# ── Server URL ────────────────────────────────────────────────
API_BASE = "http://localhost:5000/api/client"

# ── Default Credentials (from your dashboard) ─────────────────
DEFAULT_NAME    = "Adarsh Internal"
DEFAULT_OWNERID = "c0b5729a55347ef1854c9beb32041cca"
DEFAULT_SECRET  = "87b81e1eba8b821d8f38704e3ab32420cd442c67c354b2e265dc7741a7840907a52712d8160241db17bd5bd644af95b068d04e5904330eb98972f30e95323985"
DEFAULT_VERSION = "1.0.0"


# ── Data Classes ──────────────────────────────────────────────
@dataclass
class UserData:
    username:    str = ""
    expiry:      str = ""
    hwid:        str = ""


@dataclass
class AppData:
    version:     str = ""


@dataclass
class Response:
    success:     bool = False
    message:     str  = ""


# ── HMAC Helper ───────────────────────────────────────────────
def _hmac_sha256(key: str, message: str) -> str:
    return hmac.new(
        key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


# ── HWID Helper ───────────────────────────────────────────────
def _get_hwid() -> str:
    try:
        if platform.system() == "Windows":
            out = subprocess.check_output(
                "wmic csproduct get uuid", shell=True
            ).decode().strip().split("\n")[-1].strip()
            return out
        else:
            import uuid
            return str(uuid.getnode())
    except Exception:
        import uuid
        return str(uuid.uuid4())


# ── Main API Class ────────────────────────────────────────────
class api:
    def __init__(
        self,
        name:    str = DEFAULT_NAME,
        ownerid: str = DEFAULT_OWNERID,
        secret:  str = DEFAULT_SECRET,
        version: str = DEFAULT_VERSION,
    ):
        if not ownerid or not secret:
            raise ValueError("Owner ID and Secret cannot be empty.")

        self.name         = name
        self.ownerid      = ownerid
        self.secret       = secret
        self.version      = version

        self.user_data    = UserData()
        self.app_data     = AppData()
        self.response     = Response()

        self._session_token: Optional[str] = None
        self._initialized:   bool          = False
        self._heartbeat_timer: Optional[threading.Timer] = None

    # ── init ──────────────────────────────────────────────────
    def init(self):
        """Initialize connection with auth server. Call before anything else."""
        if self._initialized:
            return

        result = self._post_signed("/init", {})

        if not result.get("success"):
            self._error("Application not found or is paused. Check your credentials.")
            raise SystemExit(0)

        self.app_data.version = result.get("version", "")
        self._initialized = True

    # ── login ─────────────────────────────────────────────────
    def login(self, username: str, password: str):
        """Login with username and password."""
        self._check_init()
        hwid = _get_hwid()

        result = self._post_signed("/login", {
            "username": username,
            "password": password,
            "hwid":     hwid,
        })

        self.response.success = result.get("success", False)
        self.response.message = result.get("message", "")

        if result.get("success"):
            self._session_token          = result.get("sessionToken")
            self.user_data.username      = username
            self.user_data.expiry        = str(result.get("expiryDate", ""))
            self.user_data.hwid          = hwid
            self._start_heartbeat()

    # ── register ──────────────────────────────────────────────
    def register(self, username: str, password: str, license_key: str, email: str = ""):
        """Register a new user with a license key."""
        self._check_init()
        hwid = _get_hwid()

        result = self._post_signed("/register", {
            "username":    username,
            "password":    password,
            "license_key": license_key,
            "hwid":        hwid,
            "email":       email,
        })

        self.response.success = result.get("success", False)
        self.response.message = result.get("message", "")

        if result.get("success"):
            self._session_token     = result.get("sessionToken")
            self.user_data.username = username
            self.user_data.expiry   = str(result.get("expiryDate", ""))
            self.user_data.hwid     = hwid
            self._start_heartbeat()

    # ── license ───────────────────────────────────────────────
    def license(self, key: str):
        """Login using a license key directly."""
        self._check_init()
        hwid = _get_hwid()

        result = self._post_signed("/license", {
            "license_key": key,
            "hwid":        hwid,
        })

        self.response.success = result.get("success", False)
        self.response.message = result.get("message", "")

        if result.get("success"):
            self._session_token = result.get("sessionToken")
            self._start_heartbeat()

    # ── check (validate session) ──────────────────────────────
    def check(self):
        """Validate current session is still active."""
        self._check_init()
        if not self._session_token:
            self.response.success = False
            self.response.message = "Not logged in"
            return

        result = self._post_signed("/validate", {
            "session_token": self._session_token,
        })

        self.response.success = result.get("success", False)
        self.response.message = result.get("message", "")

    # ── logout ────────────────────────────────────────────────
    def logout(self):
        """Logout and invalidate session."""
        self._stop_heartbeat()
        self._session_token = None
        self._initialized   = False
        self.response.success = True
        self.response.message = "Logged out"

    # ── Internal helpers ──────────────────────────────────────

    def _check_init(self):
        if not self._initialized:
            self._error("You must call init() first.")
            raise SystemExit(0)

    def _post_signed(self, endpoint: str, payload: dict) -> dict:
        """Sign and POST a request to the auth server."""
        timestamp  = int(time.time() * 1000)
        nonce      = secrets.token_hex(8)
        body_json  = json.dumps(payload, separators=(",", ":"))

        # Signature = HMAC_SHA256(secret, name + ownerid + timestamp + nonce + body)
        data_to_sign = f"{self.name}{self.ownerid}{timestamp}{nonce}{body_json}"
        signature    = _hmac_sha256(self.secret, data_to_sign)

        full_payload = {
            **payload,
            "app_name":  self.name,
            "owner_id":  self.ownerid,
            "timestamp": timestamp,
            "nonce":     nonce,
            "signature": signature,
        }

        try:
            resp = requests.post(
                API_BASE + endpoint,
                json=full_payload,
                timeout=10,
            )
            return resp.json()
        except requests.exceptions.ConnectionError:
            return {"success": False, "message": "Connection failed. Is the server running?"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def _start_heartbeat(self):
        """Send heartbeat every 30 seconds to keep session alive."""
        self._stop_heartbeat()
        self._send_heartbeat()

    def _send_heartbeat(self):
        if not self._session_token:
            return
        try:
            self._post_signed("/heartbeat", {"session_token": self._session_token})
        except Exception:
            pass
        self._heartbeat_timer = threading.Timer(30.0, self._send_heartbeat)
        self._heartbeat_timer.daemon = True
        self._heartbeat_timer.start()

    def _stop_heartbeat(self):
        if self._heartbeat_timer:
            self._heartbeat_timer.cancel()
            self._heartbeat_timer = None

    @staticmethod
    def _error(message: str):
        print(f"\n[ERROR] {message}\n")


# ── Example usage ─────────────────────────────────────────────
if __name__ == "__main__":
    app = api()

    print("Initializing...")
    app.init()
    print(f"App version: {app.app_data.version}")

    username = input("Username: ")
    password = input("Password: ")

    app.login(username, password)

    if app.response.success:
        print(f"Login successful! Welcome {app.user_data.username}")
        print(f"Expiry: {app.user_data.expiry}")
    else:
        print(f"Login failed: {app.response.message}")
