"""
================================================================
  AdarshAuth — Python SDK
  Modern, Production-Grade Authentication for Python Applications
  
  Documentation & Dashboard: https://adarshauth.store
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
import urllib.request
import urllib.error
from dataclasses import dataclass
from typing import Optional, Dict, Any

API_BASE_DEFAULT = "https://adarshauth.store/api/client"


@dataclass
class UserData:
    username: str = ""
    ip: str = ""
    hwid: str = ""
    createdate: str = ""
    lastlogin: str = ""
    subscription: str = ""
    expiry: str = ""


@dataclass
class AppData:
    version: str = "1.0"
    status: str = "active"


@dataclass
class ResponseData:
    success: bool = False
    message: str = ""


def _hmac_sha256(key: str, message: str) -> str:
    return hmac.new(
        key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def _get_hwid() -> str:
    try:
        if platform.system() == "Windows":
            cmd = "wmic csproduct get uuid"
            output = subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL).decode()
            lines = [line.strip() for line in output.splitlines() if line.strip()]
            if len(lines) > 1:
                return lines[1]
        elif platform.system() == "Linux":
            try:
                with open("/etc/machine-id", "r") as f:
                    return f.read().strip()
            except Exception:
                pass
        import uuid
        return str(uuid.getnode())
    except Exception:
        import uuid
        return str(uuid.uuid4())


class api:
    def __init__(
        self,
        name: str,
        ownerid: str,
        secret: str,
        version: str = "1.0",
        url: str = API_BASE_DEFAULT
    ):
        if not name or not ownerid:
            raise ValueError("Application name and Owner ID cannot be empty.")

        self.name = name.strip()
        self.ownerid = ownerid.strip()
        self.secret = secret.strip() if secret else ""
        self.version = version.strip() if version else "1.0"
        self.url = url.rstrip("/") if url else API_BASE_DEFAULT

        self.session_token: Optional[str] = None
        self.initialized: bool = False
        self._last_nonce: str = ""
        self._heartbeat_timer: Optional[threading.Timer] = None

        self.user_data = UserData()
        self.app_data = AppData(version=self.version)
        self.response = ResponseData()

    def _post(self, endpoint: str, extra_params: Dict[str, Any]) -> Dict[str, Any]:
        timestamp = int(time.time() * 1000)
        nonce = secrets.token_hex(16)
        self._last_nonce = nonce

        # Build payload with security layers
        sorted_body = {k: extra_params[k] for k in sorted(extra_params.keys())}
        body_json_sorted = json.dumps(sorted_body, separators=(",", ":"))

        # Sign payload using HMAC-SHA256
        data_to_sign = f"{self.name}{self.ownerid}{timestamp}{nonce}{body_json_sorted}"
        signature = _hmac_sha256(self.secret, data_to_sign) if self.secret else ""

        full_payload = {
            "app_name": self.name,
            "owner_id": self.ownerid,
            "timestamp": timestamp,
            "nonce": nonce,
            "signature": signature,
            "version": self.version,
            **extra_params
        }

        req_data = json.dumps(full_payload).encode("utf-8")
        req_url = f"{self.url}{endpoint}"

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "AdarshAuth-Python/1.0",
            "Accept": "application/json"
        }

        req = urllib.request.Request(req_url, data=req_data, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                resp_bytes = resp.read()
                resp_text = resp_bytes.decode("utf-8")
                return json.loads(resp_text)
        except urllib.error.HTTPError as e:
            try:
                error_body = e.read().decode("utf-8")
                return json.loads(error_body)
            except Exception:
                return {"success": False, "message": f"HTTP Error {e.code}: {e.reason}"}
        except Exception as e:
            return {"success": False, "message": f"Connection error: {str(e)}"}

    def init(self) -> bool:
        """Initializes connection to AdarshAuth server."""
        res = self._post("/init", {})
        self.response.success = bool(res.get("success", False))
        self.response.message = res.get("message", "Unknown error")

        if self.response.success:
            self.initialized = True
            self.app_data.version = str(res.get("version", self.version))
            return True
        return False

    def _check_init(self) -> None:
        if not self.initialized:
            raise RuntimeError("You must call AdarshAuthApp.init() before performing any authentication actions.")

    def _load_user(self, res: Dict[str, Any], hwid: str) -> None:
        self.session_token = res.get("sessionToken") or res.get("session_token")
        self.user_data.username = res.get("username", "")
        self.user_data.ip = res.get("ip", "")
        self.user_data.hwid = res.get("hwid", hwid)
        self.user_data.createdate = str(res.get("createdate", ""))
        self.user_data.lastlogin = str(res.get("lastlogin", ""))
        self.user_data.subscription = res.get("subscription", "default")
        self.user_data.expiry = str(res.get("expiryDate", res.get("expiry", "Lifetime")))

    def login(self, username: str, password: str) -> bool:
        """Logs in a user with username and password."""
        self._check_init()
        hwid = _get_hwid()
        payload = {
            "username": username,
            "password": password,
            "hwid": hwid
        }
        res = self._post("/login", payload)
        self.response.success = bool(res.get("success", False))
        self.response.message = res.get("message", "")

        if self.response.success:
            self._load_user(res, hwid)
            self._start_heartbeat()
            return True
        return False

    def register(self, username: str, password: str, license_key: str) -> bool:
        """Registers a new user account with a license key."""
        self._check_init()
        hwid = _get_hwid()
        payload = {
            "username": username,
            "password": password,
            "license_key": license_key,
            "hwid": hwid
        }
        res = self._post("/register", payload)
        self.response.success = bool(res.get("success", False))
        self.response.message = res.get("message", "")

        if self.response.success:
            self._load_user(res, hwid)
            self._start_heartbeat()
            return True
        return False

    def license(self, license_key: str) -> bool:
        """Authenticates directly using a license key."""
        self._check_init()
        hwid = _get_hwid()
        payload = {
            "key": license_key,
            "hwid": hwid
        }
        res = self._post("/license", payload)
        self.response.success = bool(res.get("success", False))
        self.response.message = res.get("message", "")

        if self.response.success:
            self._load_user(res, hwid)
            self._start_heartbeat()
            return True
        return False

    def check(self) -> bool:
        """Validates current active session token."""
        self._check_init()
        if not self.session_token:
            self.response.success = False
            self.response.message = "No active session."
            return False

        payload = {
            "session_token": self.session_token,
            "hwid": _get_hwid()
        }
        res = self._post("/validate", payload)
        self.response.success = bool(res.get("success", False))
        self.response.message = res.get("message", "")

        if not self.response.success:
            self._stop_heartbeat()
            self.session_token = None
        return self.response.success

    def var(self, var_id: str) -> Optional[str]:
        """Retrieves a secure server-side variable."""
        self._check_init()
        payload = {
            "varid": var_id,
            "session_token": self.session_token or ""
        }
        res = self._post("/var", payload)
        self.response.success = bool(res.get("success", False))
        self.response.message = res.get("message", "")
        return res.get("value")

    def log(self, message: str) -> bool:
        """Sends an audit log entry to the server."""
        self._check_init()
        payload = {
            "message": message,
            "session_token": self.session_token or ""
        }
        res = self._post("/log", payload)
        return bool(res.get("success", False))

    def _start_heartbeat(self, interval: float = 30.0) -> None:
        self._stop_heartbeat()
        def _beat():
            if self.session_token:
                self.check()
                self._heartbeat_timer = threading.Timer(interval, _beat)
                self._heartbeat_timer.daemon = True
                self._heartbeat_timer.start()

        self._heartbeat_timer = threading.Timer(interval, _beat)
        self._heartbeat_timer.daemon = True
        self._heartbeat_timer.start()

    def _stop_heartbeat(self) -> None:
        if self._heartbeat_timer:
            self._heartbeat_timer.cancel()
            self._heartbeat_timer = None
