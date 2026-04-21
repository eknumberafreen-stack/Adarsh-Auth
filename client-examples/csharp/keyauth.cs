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

// ============================================================
//  Adarsh Auth — Drop-in replacement for KeyAuth
//  Replace your old keyauth.cs with this file.
//  Same public API: init(), login(), register(), check(), etc.
// ============================================================

namespace Keyauth
{
    public class api
    {
        // ── Credentials (same fields as original KeyAuth) ────────────────────
        public string name, ownerid, secret, version;
        public static long responseTime;

        // ── Your server URL — change this to your deployed URL ───────────────
        private const string API_BASE = "https://adarsh-auth.up.railway.app/api/client";

        // ── Pre-filled credentials from your dashboard ───────────────────────
        private const string DEFAULT_NAME    = "Adarsh Internal";
        private const string DEFAULT_OWNERID = "c0b5729a55347ef1854c9beb32041cca";
        private const string DEFAULT_SECRET  = "87b81e1eba8b821d8f38704e3ab32420cd442c67c354b2e265dc7741a7840907a52712d8160241db17bd5bd644af95b068d04e5904330eb98972f30e95323985";
        private const string DEFAULT_VERSION = "1.0.0";

        // ── Session state ────────────────────────────────────────────────────
        private string _sessionToken;
        private bool   _initialized;
        private System.Timers.Timer _heartbeatTimer;

        // ── Public data (same as original KeyAuth) ───────────────────────────
        public user_data_class  user_data  = new user_data_class();
        public app_data_class   app_data   = new app_data_class();
        public response_class   response   = new response_class();

        // ── Constructor — same signature as original KeyAuth ─────────────────
        /// <summary>
        /// Use pre-filled credentials from your dashboard.
        /// </summary>
        public api() : this(DEFAULT_NAME, DEFAULT_OWNERID, DEFAULT_SECRET, DEFAULT_VERSION) { }

        /// <summary>
        /// Set up your application credentials.
        /// </summary>
        /// <param name="name">Application Name (from your dashboard)</param>
        /// <param name="ownerid">Owner ID (from Credentials panel)</param>
        /// <param name="secret">App Secret (from Credentials panel)</param>
        /// <param name="version">Application Version</param>
        public api(string name, string ownerid, string secret, string version)
        {
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

        // ── init() — same as original KeyAuth ────────────────────────────────
        /// <summary>
        /// Initializes the connection with your auth server.
        /// Call this before any other function.
        /// </summary>
        public void init()
        {
            if (_initialized) return;

            var sw = Stopwatch.StartNew();
            var result = PostSigned("/init", new Dictionary<string, object>());
            sw.Stop();
            responseTime = sw.ElapsedMilliseconds;

            if (!result.success)
            {
                error("Application not found or is paused. Check your credentials.");
                Environment.Exit(0);
            }

            _initialized = true;
        }

        // ── CheckInit ────────────────────────────────────────────────────────
        public void CheckInit()
        {
            if (!_initialized)
            {
                error("You must call init() first.");
                Environment.Exit(0);
            }
        }

        // ── login() — same as original KeyAuth ───────────────────────────────
        /// <summary>
        /// Authenticates the user using username and password.
        /// </summary>
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
                _sessionToken = result.sessionToken;

                // Populate user_data (same fields as original KeyAuth)
                user_data.username  = username;
                user_data.hwid      = hwid;
                user_data.lastlogin = DateTime.Now.ToString();
                user_data.ip        = "";

                // Map expiry to subscriptions list (KeyAuth compatibility)
                user_data.subscriptions = new List<Data>();
                if (result.expiryDate != null)
                {
                    var expUnix = ((DateTimeOffset)result.expiryDate.Value).ToUnixTimeSeconds().ToString();
                    user_data.subscriptions.Add(new Data
                    {
                        subscription = "default",
                        expiry       = expUnix,
                        timeleft     = ((result.expiryDate.Value - DateTime.Now).Days).ToString() + " days"
                    });
                }
                else
                {
                    // Lifetime — set far future
                    user_data.subscriptions.Add(new Data
                    {
                        subscription = "default",
                        expiry       = "9999999999",
                        timeleft     = "Lifetime"
                    });
                }

                StartHeartbeat();
            }
            else
            {
                // Show ban message if present
                if (!string.IsNullOrEmpty(result.message))
                    response.message = result.message;
            }
        }

        // ── register() — same as original KeyAuth ────────────────────────────
        /// <summary>
        /// Registers a new user with a license key.
        /// </summary>
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
                _sessionToken = result.sessionToken;
                user_data.username = username;
                user_data.hwid     = hwid;
                StartHeartbeat();
            }
        }

        // ── check() — same as original KeyAuth ───────────────────────────────
        /// <summary>
        /// Validates the current session.
        /// </summary>
        public void check()
        {
            CheckInit();

            if (string.IsNullOrEmpty(_sessionToken))
            {
                response.success = false;
                response.message = "Not logged in";
                return;
            }

            var payload = new Dictionary<string, object>
            {
                ["session_token"] = _sessionToken,
                ["hwid"]          = GetHWID()
            };

            var result = PostSigned("/validate", payload);

            response.success = result.success;
            response.message = result.message;

            if (!result.success)
            {
                StopHeartbeat();
                _sessionToken = null;
            }
        }

        // ── logout() — same as original KeyAuth ──────────────────────────────
        public void logout()
        {
            StopHeartbeat();
            _sessionToken = null;
            _initialized  = false;
            response.success = true;
            response.message = "Logged out";
        }

        // ── license() — authenticate with just a key (KeyAuth compatibility) ─
        /// <summary>
        /// Authenticate using only a license key (no username/password).
        /// Maps to register on first use, login on subsequent uses.
        /// </summary>
        public void license(string key)
        {
            CheckInit();

            // Generate a username from the key for compatibility
            string autoUser = "user_" + key.Replace("-", "").Substring(0, 8).ToLower();
            string autoPass = encryption.HashHMAC(secret, key).Substring(0, 16);

            // Try login first, then register
            login(autoUser, autoPass);

            if (!response.success)
            {
                register(autoUser, autoPass, key);
                if (!response.success)
                {
                    response.message = "Invalid License Key.";
                }
            }
        }

        // ── expirydaysleft() — same as original KeyAuth ───────────────────────
        public string expirydaysleft(string Type, int subscription)
        {
            CheckInit();

            if (user_data.subscriptions == null || user_data.subscriptions.Count <= subscription)
                return "0";

            if (user_data.subscriptions[subscription].timeleft == "Lifetime")
                return Type.ToLower() == "days" ? "99999" : "99999";

            var dtDateTime = new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Local);
            dtDateTime = dtDateTime.AddSeconds(long.Parse(user_data.subscriptions[subscription].expiry)).ToLocalTime();
            TimeSpan difference = dtDateTime - DateTime.Now;

            switch (Type.ToLower())
            {
                case "months": return Convert.ToString(difference.Days / 30);
                case "days":   return Convert.ToString(difference.Days);
                case "hours":  return Convert.ToString(difference.Hours);
            }
            return null;
        }

        // ── Stub methods for KeyAuth compatibility ────────────────────────────
        // These exist so your existing code compiles without changes.

        public void forgot(string username, string email)
        {
            response.success = false;
            response.message = "Password reset not supported in this version.";
        }

        public void upgrade(string username, string key)
        {
            response.success = false;
            response.message = "Use the dashboard to manage subscriptions.";
        }

        public void setvar(string var, string data)
        {
            response.success = false;
            response.message = "Variables not supported in this version.";
        }

        public string getvar(string var) => null;

        public void ban(string reason = null)
        {
            response.success = false;
            response.message = "Use the dashboard to ban users.";
        }

        public string var_get(string varid) => null;

        public List<users> fetchOnline() => new List<users>();

        public void fetchStats() { }

        public List<msg> chatget(string channelname) => new List<msg>();

        public bool chatsend(string msg, string channelname) => false;

        public bool checkblack() => false;

        public string webhook(string webid, string param, string body = "", string conttype = "") => null;

        public byte[] download(string fileid) => null;

        public void log(string message) { }

        public void changeUsername(string username)
        {
            response.success = false;
            response.message = "Use the dashboard to change usernames.";
        }

        // ── Heartbeat ─────────────────────────────────────────────────────────
        private void StartHeartbeat()
        {
            StopHeartbeat();
            _heartbeatTimer          = new System.Timers.Timer(15_000); // 15 seconds
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
            try
            {
                if (string.IsNullOrEmpty(_sessionToken)) return;

                var payload = new Dictionary<string, object>
                {
                    ["session_token"] = _sessionToken,
                    ["hwid"]          = GetHWID()
                };

                var result = PostSigned("/heartbeat", payload);

                if (!result.success)
                {
                    StopHeartbeat();
                    _sessionToken = null;
                }
            }
            catch { }
        }

        // ── HWID ──────────────────────────────────────────────────────────────
        private string GetHWID()
        {
            try
            {
                // Use Windows SID as base (same as original KeyAuth)
                string sid = WindowsIdentity.GetCurrent().User.Value;
                string raw = sid + Environment.MachineName + Environment.ProcessorCount;
                using var sha = SHA256.Create();
                return BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(raw)))
                                   .Replace("-", "").ToLower();
            }
            catch
            {
                return Environment.MachineName + "_" + Environment.ProcessorCount;
            }
        }

        // ── Signed HTTP request ───────────────────────────────────────────────
        private ApiResult PostSigned(string endpoint, Dictionary<string, object> payload)
        {
            try
            {
                long   timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                string nonce     = GenerateNonce();
                string bodyJson  = JsonSerializer.Serialize(payload);

                // Signature = HMAC_SHA256(secret, appName + ownerId + timestamp + nonce + bodyJson)
                string dataToSign = $"{name}{ownerid}{timestamp}{nonce}{bodyJson}";
                string signature  = encryption.HashHMAC(secret, dataToSign);

                // Merge security fields into request
                var fullPayload = new Dictionary<string, object>(payload)
                {
                    ["app_name"]  = name,
                    ["owner_id"]  = ownerid,
                    ["timestamp"] = timestamp,
                    ["nonce"]     = nonce,
                    ["signature"] = signature
                };

                string requestJson = JsonSerializer.Serialize(fullPayload);

                var sw = Stopwatch.StartNew();
                using var client = new WebClient();
                client.Proxy = null;
                client.Headers[HttpRequestHeader.ContentType] = "application/json";

                string rawResponse = client.UploadString(API_BASE + endpoint, "POST", requestJson);
                sw.Stop();
                responseTime = sw.ElapsedMilliseconds;

                return ParseResponse(rawResponse);
            }
            catch (WebException webEx)
            {
                if (webEx.Response is HttpWebResponse httpResp)
                {
                    using var reader = new StreamReader(httpResp.GetResponseStream());
                    string body = reader.ReadToEnd();

                    if (httpResp.StatusCode == (HttpStatusCode)429)
                    {
                        error("Too many requests. Please slow down.");
                        Environment.Exit(0);
                    }

                    // Try to parse error response (may contain ban message)
                    try
                    {
                        var errResult = ParseResponse(body);
                        return errResult;
                    }
                    catch { }
                }

                return new ApiResult { success = false, message = "Connection failed. Check your internet." };
            }
            catch (Exception ex)
            {
                return new ApiResult { success = false, message = ex.Message };
            }
        }

        private ApiResult ParseResponse(string json)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                var result = new ApiResult
                {
                    success      = root.TryGetProperty("success", out var s) && s.GetBoolean(),
                    message      = root.TryGetProperty("message", out var m) ? m.GetString() : "",
                    sessionToken = root.TryGetProperty("sessionToken", out var st) ? st.GetString() : null,
                    banned       = root.TryGetProperty("banned", out var b) && b.GetBoolean()
                };

                if (root.TryGetProperty("expiryDate", out var exp) && exp.ValueKind != JsonValueKind.Null)
                {
                    if (DateTime.TryParse(exp.GetString(), out var dt))
                        result.expiryDate = dt;
                }

                return result;
            }
            catch
            {
                return new ApiResult { success = false, message = "Invalid server response" };
            }
        }

        private string GenerateNonce()
        {
            var bytes = new byte[16];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            return BitConverter.ToString(bytes).Replace("-", "").ToLower();
        }

        // ── Error helper ──────────────────────────────────────────────────────
        public static void error(string message)
        {
            string folder = @"Logs";
            string file   = Path.Combine(folder, "ErrorLogs.txt");

            if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);
            if (!File.Exists(file))
                File.AppendAllText(file, DateTime.Now + " > Error log started\n");

            File.AppendAllText(file, DateTime.Now + $" > {message}\n");

            Process.Start(new ProcessStartInfo("cmd.exe",
                $"/c start cmd /C \"color b && title Error && echo {message} && timeout /t 5\"")
            {
                CreateNoWindow        = true,
                RedirectStandardOutput = true,
                RedirectStandardError  = true,
                UseShellExecute        = false
            });

            Environment.Exit(0);
        }

        public static string checksum(string filename)
        {
            using var md5 = MD5.Create();
            using var fs  = File.OpenRead(filename);
            return BitConverter.ToString(md5.ComputeHash(fs)).Replace("-", "").ToLowerInvariant();
        }

        // ── Internal result class ─────────────────────────────────────────────
        private class ApiResult
        {
            public bool      success      { get; set; }
            public string    message      { get; set; }
            public string    sessionToken { get; set; }
            public DateTime? expiryDate   { get; set; }
            public bool      banned       { get; set; }
        }

        // ── Public data classes (same as original KeyAuth) ────────────────────
        public class user_data_class
        {
            public string      username      { get; set; }
            public string      ip            { get; set; }
            public string      hwid          { get; set; }
            public string      createdate    { get; set; }
            public string      lastlogin     { get; set; }
            public List<Data>  subscriptions { get; set; }
        }

        public class Data
        {
            public string subscription { get; set; }
            public string expiry       { get; set; }
            public string timeleft     { get; set; }
        }

        public class app_data_class
        {
            public string numUsers         { get; set; }
            public string numOnlineUsers   { get; set; }
            public string numKeys          { get; set; }
            public string version          { get; set; }
            public string customerPanelLink { get; set; }
            public string downloadLink     { get; set; }
        }

        public class response_class
        {
            public bool   success { get; set; }
            public string message { get; set; }
        }

        public class msg
        {
            public string message   { get; set; }
            public string author    { get; set; }
            public string timestamp { get; set; }
        }

        public class users
        {
            public string credential { get; set; }
        }
    }

    // ── Encryption helpers (same as original KeyAuth) ─────────────────────────
    public static class encryption
    {
        public static string HashHMAC(string key, string message)
        {
            var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
            return BitConverter.ToString(hmac.ComputeHash(Encoding.UTF8.GetBytes(message)))
                               .Replace("-", "").ToLower();
        }

        public static string byte_arr_to_str(byte[] ba)
        {
            var sb = new StringBuilder(ba.Length * 2);
            foreach (byte b in ba) sb.AppendFormat("{0:x2}", b);
            return sb.ToString();
        }

        public static byte[] str_to_byte_arr(string hex)
        {
            int len   = hex.Length;
            var bytes = new byte[len / 2];
            for (int i = 0; i < len; i += 2)
                bytes[i / 2] = Convert.ToByte(hex.Substring(i, 2), 16);
            return bytes;
        }

        [MethodImpl(MethodImplOptions.NoInlining | MethodImplOptions.NoOptimization)]
        public static bool CheckStringsFixedTime(string str1, string str2)
        {
            if (str1.Length != str2.Length) return false;
            int result = 0;
            for (int i = 0; i < str1.Length; i++)
                result |= str1[i] ^ str2[i];
            return result == 0;
        }

        public static string iv_key() =>
            Guid.NewGuid().ToString().Substring(0, 16);
    }
}
