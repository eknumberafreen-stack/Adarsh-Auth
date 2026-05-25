using System;
using System.Security.Cryptography;
using System.Text;
using System.Net;
using System.IO;
using System.Diagnostics;
using System.Security.Principal;
using System.Collections.Generic;
using System.Threading;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Timers;
using System.Runtime.InteropServices;
using System.Linq;

namespace Keyauth
{
    public class api
    {
        // ── Credentials ──────────────────────────────────────────────────────
        public string name, ownerid, secret, version;
        public static long responseTime;

        // ── Server URL ───────────────────────────────────────────────────────
        private const string API_BASE = "https://api.adarshauth.online/api/client";

        // ── Session state ────────────────────────────────────────────────────
        private byte[] _sessionEnc;
        private byte[] _sessionKey;
        private bool   _initialized;
        private string _lastNonce;
        private System.Timers.Timer _heartbeatTimer;

        private string SessionToken
        {
            get => Decrypt(_sessionEnc, _sessionKey);
            set => Encrypt(value);
        }

        private void Encrypt(string value)
        {
            if (string.IsNullOrEmpty(value)) { _sessionEnc = null; _sessionKey = null; return; }
            _sessionKey = new byte[32];
            using (var rng = RandomNumberGenerator.Create()) rng.GetBytes(_sessionKey);
            byte[] plain = Encoding.UTF8.GetBytes(value);
            _sessionEnc = new byte[plain.Length];
            for (int i = 0; i < plain.Length; i++) _sessionEnc[i] = (byte)(plain[i] ^ _sessionKey[i % _sessionKey.Length]);
        }

        private string Decrypt(byte[] enc, byte[] key)
        {
            if (enc == null || key == null) return null;
            byte[] plain = new byte[enc.Length];
            for (int i = 0; i < enc.Length; i++) plain[i] = (byte)(enc[i] ^ key[i % key.Length]);
            return Encoding.UTF8.GetString(plain);
        }

        // ── Public data (identical to original KeyAuth) ───────────────────────
        public user_data_class  user_data  = new user_data_class();
        public app_data_class   app_data   = new app_data_class();
        public response_class   response   = new response_class();

        // ── Runtime Offset State ─────────────────────────────────────────────
        public int offsetVersion = 0;
        public bool isFeatureActive = false;
        public Dictionary<string, string> inMemoryOffsets = new Dictionary<string, string>();

        // ── Native Imports for Hardening ─────────────────────────────────────
        [DllImport("kernel32.dll", SetLastError = true, ExactSpelling = true)]
        static extern bool CheckRemoteDebuggerPresent(IntPtr hProcess, ref bool isDebuggerPresent);

        [DllImport("kernel32.dll", SetLastError = true, ExactSpelling = true)]
        static extern bool IsDebuggerPresent();

        /// <summary>
        /// Set up your application credentials.
        /// </summary>
        public api(string name, string ownerid, string secret, string version)
        {
            // Initial Security Checks
            SecurityCheck();

            // Enforce TLS 1.2
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | (SecurityProtocolType)3072;
            // REMOVED: Insecure SSL bypass. Default validation is now used for security.

            if (string.IsNullOrEmpty(ownerid) || string.IsNullOrEmpty(secret))
            {
                Thread.Sleep(2000);
                error("Application not setup correctly. Check your Owner ID and App Secret.");
                Environment.Exit(0);
            }

            this.name    = name;
            this.ownerid = ownerid;
            this.secret  = secret;
            this.version = version;
        }

        private void SecurityCheck()
        {
            if (Debugger.IsAttached || IsDebuggerPresent())
            {
                error("Debugger detected! Please close all debuggers and try again.");
                Environment.Exit(0);
            }

            bool isDebuggerPresent = false;
            CheckRemoteDebuggerPresent(Process.GetCurrentProcess().Handle, ref isDebuggerPresent);
            if (isDebuggerPresent)
            {
                error("Remote debugger detected!");
                Environment.Exit(0);
            }

            // Check for HTTP Debuggers / Proxies
            string[] forbiddenProcs = { "fiddler", "wireshark", "httpdebugger", "charles", "dnspy", "ilspy" };
            foreach (var proc in Process.GetProcesses())
            {
                if (forbiddenProcs.Any(p => proc.ProcessName.ToLower().Contains(p)))
                {
                    error("Forbidden tool detected: " + proc.ProcessName);
                    Environment.Exit(0);
                }
            }
        }

        public void init()
        {
            if (_initialized) return;

            var sw = Stopwatch.StartNew();
            var result = PostSigned("/init", new Dictionary<string, object>());
            sw.Stop();
            responseTime = sw.ElapsedMilliseconds;

            if (!result.success)
            {
                if (!string.IsNullOrEmpty(result.downloadUrl))
                {
                    Process.Start(new ProcessStartInfo(result.downloadUrl) { UseShellExecute = true });
                }
                error(string.IsNullOrEmpty(result.message) ? "Application not found or is paused. Check your credentials." : result.message);
                Environment.Exit(0);
            }

            _initialized = true;
        }

        public void CheckInit()
        {
            if (!_initialized)
            {
                error("You must run the function KeyAuthApp.init(); first");
                Environment.Exit(0);
            }
        }

        public void login(string username, string pass)
        {
            CheckInit();
            string hwid = GetHWID();
            var payload = new Dictionary<string, object>
            {
                ["username"] = username,
                ["password"] = pass,
                ["hwid"]     = hwid
            };
            var result = PostSigned("/login", payload);
            response.success = result.success;
            response.message = result.message;
            if (result.success)
            {
                SessionToken = result.sessionToken;
                LoadUserData(result, hwid);
                StartHeartbeat();
            }
        }

        public void register(string username, string pass, string key, string email = "")
        {
            CheckInit();
            string hwid = GetHWID();
            var payload = new Dictionary<string, object>
            {
                ["username"]    = username,
                ["password"]    = pass,
                ["license_key"] = key,
                ["hwid"]        = hwid
            };
            var result = PostSigned("/register", payload);
            response.success = result.success;
            response.message = result.message;
            if (result.success)
            {
                SessionToken = result.sessionToken;
                LoadUserData(result, hwid);
                StartHeartbeat();
            }
        }

        public void license(string key)
        {
            CheckInit();
            string hwid = GetHWID();
            var payload = new Dictionary<string, object>
            {
                ["key"]  = key,
                ["hwid"] = hwid
            };
            var result = PostSigned("/license", payload);
            response.success = result.success;
            response.message = result.message;
            if (result.success)
            {
                SessionToken = result.sessionToken;
                LoadUserData(result, hwid);
                StartHeartbeat();
            }
        }

        public void check()
        {
            CheckInit();
            if (string.IsNullOrEmpty(SessionToken))
            {
                response.success = false;
                response.message = "Not logged in";
                return;
            }
            var payload = new Dictionary<string, object>
            {
                ["session_token"] = SessionToken,
                ["hwid"]          = GetHWID()
            };
            var result = PostSigned("/validate", payload);
            response.success = result.success;
            response.message = result.message;
            if (result.success) LoadUserData(result, GetHWID());
            else { StopHeartbeat(); SessionToken = null; }
        }

        public void logout()
        {
            StopHeartbeat();
            SessionToken = null;
            _initialized  = false;
            response.success = true;
            response.message = "Logged out";
        }

        public bool fetchValues()
        {
            CheckInit();
            if (string.IsNullOrEmpty(SessionToken))
            {
                error("Not logged in");
                return false;
            }
            var payload = new Dictionary<string, object>
            {
                ["session_token"] = SessionToken,
                ["hwid"]          = GetHWID()
            };
            var result = PostSigned("/values", payload);
            if (result.success)
            {
                offsetVersion = result.offsetVersion;
                isFeatureActive = true;
                inMemoryOffsets = result.values ?? new Dictionary<string, string>();
                return true;
            }
            return false;
        }

        private void StartHeartbeat()
        {
            StopHeartbeat();
            _heartbeatTimer          = new System.Timers.Timer(15_000);
            _heartbeatTimer.Elapsed += async (s, e) => await SendHeartbeatAsync();
            _heartbeatTimer.Start();
        }

        private void StopHeartbeat()
        {
            _heartbeatTimer?.Stop();
            _heartbeatTimer?.Dispose();
            _heartbeatTimer = null;
        }

        private async System.Threading.Tasks.Task SendHeartbeatAsync()
        {
            try {
                string token = SessionToken;
                if (string.IsNullOrEmpty(token)) return;

                var payload = new Dictionary<string, object> { 
                    ["session_token"] = token, 
                    ["hwid"] = GetHWID() 
                };
                if (isFeatureActive) {
                    payload["offsetVersion"] = offsetVersion;
                }

                var result = PostSigned("/heartbeat", payload);
                
                if (result.forceClose) {
                    StopHeartbeat();
                    SessionToken = null;
                    Environment.Exit(0);
                }

                if (result.success) {
                    if (isFeatureActive) {
                        if (result.offsetStatus == "refresh_required" || result.offsetStatus == "revoked") {
                            isFeatureActive = false;
                            inMemoryOffsets.Clear();
                            offsetVersion = 0;
                        }
                    }
                } else {
                    string msg = result.message?.ToLower() ?? "";
                    // Only terminate for confirmed invalid-session states from the backend.
                    // This prevents crashes due to temporary network lag or server downtime.
                    if (msg.Contains("session") || msg.Contains("invalid") || msg.Contains("expired") || msg.Contains("not found") || msg.Contains("not active")) {
                        StopHeartbeat();
                        SessionToken = null;
                        error("Session Validation Failed: " + result.message);
                        Environment.Exit(0);
                    }
                }
            } catch { 
                // Ignore transient network errors during heartbeat to maintain stability.
            }
        }

        private string GetHWID()
        {
            try {
                // Hardened HWID (more factors)
                string sid = WindowsIdentity.GetCurrent().User.Value;
                string mName = Environment.MachineName;
                string pCount = Environment.ProcessorCount.ToString();
                
                // Combining multiple static factors
                string raw = $"{sid}-{mName}-{pCount}-{Environment.UserName}";
                
                using (var sha = SHA256.Create())
                {
                    return BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(raw))).Replace("-", "").ToLower();
                }
            } catch { return Environment.MachineName + "_" + Environment.ProcessorCount; }
        }

        private string GetFileHash()
        {
            try
            {
                string path = Process.GetCurrentProcess().MainModule.FileName;
                using (var sha = SHA256.Create())
                {
                    using (var fs = File.OpenRead(path))
                    {
                        return BitConverter.ToString(sha.ComputeHash(fs)).Replace("-", "").ToLower();
                    }
                }
            }
            catch { return "unknown"; }
        }

        private long GetNetworkTime()
        {
            try {
                var request = (HttpWebRequest)WebRequest.Create("http://www.google.com");
                request.Method = "HEAD";
                request.Timeout = 3000;
                request.Proxy = null;
                using (var response = (HttpWebResponse)request.GetResponse()) {
                    string dateStr = response.Headers["Date"];
                    return DateTimeOffset.Parse(dateStr).ToUnixTimeMilliseconds();
                }
            } catch { return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); }
        }

        private void LoadUserData(ApiResult result, string hwid)
        {
            user_data.username   = result.username  ?? user_data.username;
            user_data.ip         = result.ip        ?? "";
            user_data.hwid       = hwid;
            user_data.createdate = result.createdate ?? "";
            user_data.lastlogin  = result.lastlogin  ?? DateTime.Now.ToString();
            user_data.subscriptions = new List<Data>();
            if (result.expiryDate != null) {
                var expUnix    = ((DateTimeOffset)result.expiryDate.Value).ToUnixTimeSeconds().ToString();
                var daysLeft   = (result.expiryDate.Value - DateTime.Now).Days;
                user_data.subscriptions.Add(new Data { subscription = result.subscription ?? "default", expiry = expUnix, timeleft = daysLeft > 0 ? daysLeft + " days" : "Expired" });
            } else {
                user_data.subscriptions.Add(new Data { subscription = result.subscription ?? "default", expiry = "9999999999", timeleft = "Lifetime" });
            }
        }

        private ApiResult PostSigned(string endpoint, Dictionary<string, object> payload)
        {
            try {
                SecurityCheck(); // Re-verify on every request

                long   timestamp = GetNetworkTime();
                string nonce     = GenerateNonce();
                _lastNonce       = nonce; // Store for response verification

                // Sort keys alphabetically for signature consistency
                var sortedPayload = new SortedDictionary<string, object>(payload);
                string bodyJson  = JsonSerializer.Serialize(sortedPayload);
                string dataToSign = $"{name}{ownerid}{timestamp}{nonce}{bodyJson}";
                string signature  = encryption.HashHMAC(secret, dataToSign);

                var fullPayload = new Dictionary<string, object>(payload) { 
                    ["app_name"] = name, 
                    ["owner_id"] = ownerid, 
                    ["timestamp"] = timestamp, 
                    ["nonce"] = nonce, 
                    ["signature"] = signature,
                    ["version"] = version,
                    ["client_hash"] = GetFileHash() // Integrity check
                };

                string requestJson = JsonSerializer.Serialize(fullPayload);
                using (var client = new WebClient())
                {
                    client.Proxy = null;
                    client.Headers[HttpRequestHeader.ContentType] = "application/json";
                    string rawResponse = client.UploadString(API_BASE + endpoint, "POST", requestJson);
                    
                    // CRITICAL: Verify server response signature
                    return ParseAndVerifyResponse(rawResponse);
                }
            } catch (WebException webEx) {
                if (webEx.Response is HttpWebResponse httpResp) {
                    using (var reader = new StreamReader(httpResp.GetResponseStream()))
                    {
                        string body = reader.ReadToEnd();
                        try { return ParseAndVerifyResponse(body); } catch { }
                    }
                }
                return new ApiResult { success = false, message = "Connection failure: " + webEx.Message };
            } catch (Exception ex) { return new ApiResult { success = false, message = ex.Message }; }
        }

        private ApiResult ParseAndVerifyResponse(string json)
        {
            try {
                using (var doc = JsonDocument.Parse(json))
                {
                    var root = doc.RootElement;

                    // 1. Check for signature
                    if (!root.TryGetProperty("signature", out var sigProp))
                    {
                        // If not successful and no signature, might be a standard error
                        bool isSuccess = root.TryGetProperty("success", out var s) && s.GetBoolean();
                        if (!isSuccess) return ParseSimpleResponse(root);
                        
                        error("Server response was not signed! MITM attempt detected.");
                        Environment.Exit(0);
                    }

                    string serverSig = sigProp.GetString();

                    // 2. Prepare data for verification
                    // The server signs: JSON_WITHOUT_SIGNATURES + REQUEST_NONCE
                    var responseData = new SortedDictionary<string, JsonElement>();
                    foreach (var prop in root.EnumerateObject())
                    {
                        if (prop.Name != "signature" && prop.Name != "rsa_sig")
                        {
                            responseData[prop.Name] = prop.Value;
                        }
                    }

                    // We need the EXACT JSON string the server signed. 
                    // Our backend signs the full body minus the signature field.
                    string bodyToVerify = JsonSerializer.Serialize(responseData);
                    string expectedSig = encryption.HashHMAC(secret, bodyToVerify + _lastNonce);

                    if (!string.Equals(serverSig, expectedSig, StringComparison.OrdinalIgnoreCase))
                    {
                        error("Server response signature mismatch! Possible response manipulation.");
                        Environment.Exit(0);
                    }

                    return ParseSimpleResponse(root);
                }
            } catch (Exception ex) { return new ApiResult { success = false, message = "Security error: " + ex.Message }; }
        }

        private ApiResult ParseSimpleResponse(JsonElement root)
        {
            var result = new ApiResult {
                success      = root.TryGetProperty("success",      out var s)  && s.GetBoolean(),
                message      = root.TryGetProperty("message",      out var m)  ? m.GetString()  : "",
                sessionToken = root.TryGetProperty("sessionToken", out var st) ? st.GetString() : null,
                banned       = root.TryGetProperty("banned",       out var b)  && b.GetBoolean(),
                username     = root.TryGetProperty("username",     out var u)  ? u.GetString()  : null,
                ip           = root.TryGetProperty("ip",           out var ip) ? ip.GetString() : null,
                createdate   = root.TryGetProperty("createdate",   out var cd) ? cd.GetString() : null,
                lastlogin    = root.TryGetProperty("lastlogin",    out var ll) ? ll.GetString() : null,
                subscription = root.TryGetProperty("subscription", out var sub)? sub.GetString(): null,
                downloadUrl  = root.TryGetProperty("downloadUrl",  out var d)  ? d.GetString()  : null,
                forceClose   = root.TryGetProperty("forceClose",   out var fc) && fc.GetBoolean(),
                offsetVersion = root.TryGetProperty("offsetVersion", out var ov) ? ov.GetInt32() : 0,
                offsetStatus = root.TryGetProperty("offsetStatus", out var os) ? os.GetString() : null
            };
            if (root.TryGetProperty("values", out var val) && val.ValueKind == JsonValueKind.Object) {
                result.values = new Dictionary<string, string>();
                foreach (var prop in val.EnumerateObject()) {
                    if (prop.Value.ValueKind == JsonValueKind.String) {
                        result.values[prop.Name] = prop.Value.GetString();
                    } else {
                        result.values[prop.Name] = prop.Value.GetRawText();
                    }
                }
            }
            if (root.TryGetProperty("expiryDate", out var exp) && exp.ValueKind != JsonValueKind.Null) {
                if (DateTime.TryParse(exp.GetString(), out var dt)) result.expiryDate = dt;
            }
            return result;
        }

        private string GenerateNonce()
        {
            var bytes = new byte[16];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(bytes);
                return BitConverter.ToString(bytes).Replace("-", "").ToLower();
            }
        }

        public static void error(string message)
        {
            Process.Start(new ProcessStartInfo("cmd.exe", $"/c start cmd /C \"color b && title Error && echo {message} && timeout /t 5\"") { CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false });
            Environment.Exit(0);
        }

        private class ApiResult
        {
            public bool      success      { get; set; }
            public string    message      { get; set; }
            public string    sessionToken { get; set; }
            public DateTime? expiryDate   { get; set; }
            public bool      banned       { get; set; }
            public string    username     { get; set; }
            public string    ip           { get; set; }
            public string    createdate   { get; set; }
            public string    lastlogin    { get; set; }
            public string    subscription { get; set; }
            public string    downloadUrl  { get; set; }
            public bool      forceClose   { get; set; }
            public int       offsetVersion { get; set; }
            public string    offsetStatus { get; set; }
            public Dictionary<string, string> values { get; set; }
        }

        public class user_data_class {
            public string username { get; set; }
            public string ip { get; set; }
            public string hwid { get; set; }
            public string createdate { get; set; }
            public string lastlogin { get; set; }
            public List<Data> subscriptions { get; set; }
        }

        public class Data {
            public string subscription { get; set; }
            public string expiry { get; set; }
            public string timeleft { get; set; }
        }

        public class app_data_class {
            public string numUsers { get; set; }
            public string numOnlineUsers { get; set; }
            public string numKeys { get; set; }
            public string version { get; set; }
            public string customerPanelLink { get; set; }
            public string downloadLink { get; set; }
        }

        public class response_class {
            public bool success { get; set; }
            public string message { get; set; }
        }
    }

    public static class encryption {
        public static string HashHMAC(string key, string message) {
            var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
            return BitConverter.ToString(hmac.ComputeHash(Encoding.UTF8.GetBytes(message))).Replace("-", "").ToLower();
        }
    }
}
