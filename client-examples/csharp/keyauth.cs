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
//  Same public API surface as the original keyauth.cs.
//  Replace your old keyauth.cs with this file.
// ============================================================

namespace Keyauth
{
    public class api
    {
        // ── Credentials ──────────────────────────────────────────────────────
        public string name, ownerid, secret, version;
        public static long responseTime;

        // ── Server URL ───────────────────────────────────────────────────────
        private const string API_BASE = "https://adarsh-auth-backend-production.up.railway.app/api/client";

        // ── Session state ────────────────────────────────────────────────────
        private string _sessionToken;
        private bool   _initialized;
        private System.Timers.Timer _heartbeatTimer;

        // ── Public data (identical to original KeyAuth) ───────────────────────
        public user_data_class  user_data  = new user_data_class();
        public app_data_class   app_data   = new app_data_class();
        public response_class   response   = new response_class();

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

        // ── init() ───────────────────────────────────────────────────────────
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
        /// <summary>
        /// Checks if init() has been called. Exits if not.
        /// </summary>
        public void CheckInit()
        {
            if (!_initialized)
            {
                error("You must run the function KeyAuthApp.init(); first");
                Environment.Exit(0);
            }
        }

        // ── login() ──────────────────────────────────────────────────────────
        /// <summary>
        /// Authenticates the user using their username and password.
        /// </summary>
        /// <param name="username">Username</param>
        /// <param name="pass">Password</param>
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
                LoadUserData(result, hwid);
                StartHeartbeat();
            }
        }

        // ── register() ───────────────────────────────────────────────────────
        /// <summary>
        /// Registers a new user with a license key.
        /// </summary>
        /// <param name="username">Username</param>
        /// <param name="pass">Password</param>
        /// <param name="key">License key</param>
        /// <param name="email">Email (optional, ignored server-side)</param>
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
                LoadUserData(result, hwid);
                StartHeartbeat();
            }
        }

        // ── license() ────────────────────────────────────────────────────────
        /// <summary>
        /// Authenticate using only a license key (no username/password).
        /// On first use the key is activated; on subsequent uses it logs in.
        /// </summary>
        /// <param name="key">License key</param>
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
                _sessionToken = result.sessionToken;
                LoadUserData(result, hwid);
                StartHeartbeat();
            }
        }

        // ── check() ──────────────────────────────────────────────────────────
        /// <summary>
        /// Checks if the current session is validated or not.
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

            if (result.success)
            {
                // Refresh user data from validate response
                LoadUserData(result, GetHWID());
            }
            else
            {
                StopHeartbeat();
                _sessionToken = null;
            }
        }

        // ── logout() ─────────────────────────────────────────────────────────
        /// <summary>
        /// Logs out the current user and clears the session.
        /// </summary>
        public void logout()
        {
            StopHeartbeat();
            _sessionToken = null;
            _initialized  = false;
            response.success = true;
            response.message = "Logged out";
        }

        // ── expirydaysleft() ─────────────────────────────────────────────────
        /// <summary>
        /// Converts Unix expiry time to Days, Months, or Hours remaining.
        /// </summary>
        /// <param name="Type">One of: "days", "months", "hours"</param>
        /// <param name="subscription">Subscription index (0-based)</param>
        public string expirydaysleft(string Type, int subscription)
        {
            CheckInit();

            if (user_data.subscriptions == null || user_data.subscriptions.Count <= subscription)
                return "0";

            var sub = user_data.subscriptions[subscription];

            if (sub.timeleft == "Lifetime")
            {
                switch (Type.ToLower())
                {
                    case "months": return "99999";
                    case "days":   return "99999";
                    case "hours":  return "99999";
                }
                return "99999";
            }

            var epoch = new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Local);
            var expiry = epoch.AddSeconds(long.Parse(sub.expiry)).ToLocalTime();
            TimeSpan diff = expiry - DateTime.Now;

            switch (Type.ToLower())
            {
                case "months": return Convert.ToString(diff.Days / 30);
                case "days":   return Convert.ToString(diff.Days);
                case "hours":  return Convert.ToString(diff.Hours);
            }
            return null;
        }

        // ── Stub methods — KeyAuth API compatibility ──────────────────────────
        // These keep your existing code compiling without changes.
        // Implement the matching backend endpoints to make them functional.

        /// <summary>
        /// Allow users to reset their password via email.
        /// Not supported in this version — use the dashboard.
        /// </summary>
        public void forgot(string username, string email)
        {
            response.success = false;
            response.message = "Password reset not supported. Use the dashboard.";
        }

        /// <summary>
        /// Upgrade a user's subscription with a new license key.
        /// Not supported in this version — use the dashboard.
        /// </summary>
        public void upgrade(string username, string key)
        {
            response.success = false;
            response.message = "Use the dashboard to manage subscriptions.";
        }

        /// <summary>
        /// Change the data of an existing user variable.
        /// Not supported in this version.
        /// </summary>
        public void setvar(string var, string data)
        {
            response.success = false;
            response.message = "Variables not supported in this version.";
        }

        /// <summary>
        /// Gets an existing user variable.
        /// Not supported in this version.
        /// </summary>
        public string getvar(string var) => null;

        /// <summary>
        /// Bans the current logged-in user.
        /// Not supported in this version — use the dashboard.
        /// </summary>
        public void ban(string reason = null)
        {
            response.success = false;
            response.message = "Use the dashboard to ban users.";
        }

        /// <summary>
        /// Gets an existing global variable.
        /// Not supported in this version.
        /// </summary>
        public string var_get(string varid) => null;

        /// <summary>
        /// Fetch usernames of online users.
        /// Not supported in this version.
        /// </summary>
        public List<users> fetchOnline() => new List<users>();

        /// <summary>
        /// Fetch app statistic counts.
        /// Not supported in this version.
        /// </summary>
        public void fetchStats() { }

        /// <summary>
        /// Gets the last 50 messages of a chat channel.
        /// Not supported in this version.
        /// </summary>
        public List<msg> chatget(string channelname) => new List<msg>();

        /// <summary>
        /// Sends a message to a chat channel.
        /// Not supported in this version.
        /// </summary>
        public bool chatsend(string msg, string channelname) => false;

        /// <summary>
        /// Checks if the current IP/HWID is blacklisted.
        /// Not supported in this version.
        /// </summary>
        public bool checkblack() => false;

        /// <summary>
        /// Sends a request to a registered webhook.
        /// Not supported in this version.
        /// </summary>
        public string webhook(string webid, string param, string body = "", string conttype = "") => null;

        /// <summary>
        /// Downloads a file via the auth server proxy.
        /// Not supported in this version.
        /// </summary>
        public byte[] download(string fileid) => null;

        /// <summary>
        /// Logs a message with the user's IP and PC name.
        /// Not supported in this version.
        /// </summary>
        public void log(string message) { }

        /// <summary>
        /// Change the username of the current logged-in user.
        /// Not supported in this version — use the dashboard.
        /// </summary>
        public void changeUsername(string username)
        {
            response.success = false;
            response.message = "Use the dashboard to change usernames.";
        }

        // ── Heartbeat ─────────────────────────────────────────────────────────
        private void StartHeartbeat()
        {
            StopHeartbeat();
            _heartbeatTimer          = new System.Timers.Timer(15_000); // every 15 s
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
            catch { /* swallow — heartbeat is best-effort */ }
        }

        // ── HWID ──────────────────────────────────────────────────────────────
        private string GetHWID()
        {
            try
            {
                // Matches original KeyAuth: Windows SID as base
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

        // ── User data loader ──────────────────────────────────────────────────
        /// <summary>
        /// Populates user_data from a successful API response.
        /// </summary>
        private void LoadUserData(ApiResult result, string hwid)
        {
            user_data.username   = result.username  ?? user_data.username;
            user_data.ip         = result.ip        ?? "";
            user_data.hwid       = hwid;
            user_data.createdate = result.createdate ?? "";
            user_data.lastlogin  = result.lastlogin  ?? DateTime.Now.ToString();

            // Build subscriptions list (KeyAuth-compatible)
            user_data.subscriptions = new List<Data>();

            if (result.expiryDate != null)
            {
                var expUnix    = ((DateTimeOffset)result.expiryDate.Value).ToUnixTimeSeconds().ToString();
                var daysLeft   = (result.expiryDate.Value - DateTime.Now).Days;
                var timeleft   = daysLeft > 0 ? daysLeft + " days" : "Expired";

                user_data.subscriptions.Add(new Data
                {
                    subscription = result.subscription ?? "default",
                    expiry       = expUnix,
                    timeleft     = timeleft
                });
            }
            else
            {
                // Lifetime — far-future Unix timestamp
                user_data.subscriptions.Add(new Data
                {
                    subscription = result.subscription ?? "default",
                    expiry       = "9999999999",
                    timeleft     = "Lifetime"
                });
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

                // Signature = HMAC-SHA256(secret, appName + ownerId + timestamp + nonce + bodyJson)
                string dataToSign = $"{name}{ownerid}{timestamp}{nonce}{bodyJson}";
                string signature  = encryption.HashHMAC(secret, dataToSign);

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
                        error("You're connecting too fast to loader, slow down.");
                        Environment.Exit(0);
                    }

                    try { return ParseResponse(body); } catch { }
                }

                return new ApiResult { success = false, message = "Connection failure. Please try again." };
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
                using var doc  = JsonDocument.Parse(json);
                var root = doc.RootElement;

                var result = new ApiResult
                {
                    success      = root.TryGetProperty("success",      out var s)  && s.GetBoolean(),
                    message      = root.TryGetProperty("message",      out var m)  ? m.GetString()  : "",
                    sessionToken = root.TryGetProperty("sessionToken", out var st) ? st.GetString() : null,
                    banned       = root.TryGetProperty("banned",       out var b)  && b.GetBoolean(),
                    username     = root.TryGetProperty("username",     out var u)  ? u.GetString()  : null,
                    ip           = root.TryGetProperty("ip",           out var ip) ? ip.GetString() : null,
                    createdate   = root.TryGetProperty("createdate",   out var cd) ? cd.GetString() : null,
                    lastlogin    = root.TryGetProperty("lastlogin",    out var ll) ? ll.GetString() : null,
                    subscription = root.TryGetProperty("subscription", out var sub)? sub.GetString(): null,
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
                File.AppendAllText(file, DateTime.Now + " > This is the start of your error logs file\n");

            File.AppendAllText(file, DateTime.Now + $" > {message}" + Environment.NewLine);

            Process.Start(new ProcessStartInfo("cmd.exe",
                $"/c start cmd /C \"color b && title Error && echo {message} && timeout /t 5\"")
            {
                CreateNoWindow         = true,
                RedirectStandardOutput = true,
                RedirectStandardError  = true,
                UseShellExecute        = false
            });

            Environment.Exit(0);
        }

        /// <summary>
        /// Computes the MD5 checksum of a file (same as original KeyAuth).
        /// </summary>
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
            public string    username     { get; set; }
            public string    ip           { get; set; }
            public string    createdate   { get; set; }
            public string    lastlogin    { get; set; }
            public string    subscription { get; set; }
        }

        // ── Public data classes (identical to original KeyAuth) ───────────────
        public class user_data_class
        {
            public string     username      { get; set; }
            public string     ip            { get; set; }
            public string     hwid          { get; set; }
            public string     createdate    { get; set; }
            public string     lastlogin     { get; set; }
            public List<Data> subscriptions { get; set; }
        }

        public class Data
        {
            public string subscription { get; set; }
            public string expiry       { get; set; }
            public string timeleft     { get; set; }
        }

        public class app_data_class
        {
            public string numUsers          { get; set; }
            public string numOnlineUsers    { get; set; }
            public string numKeys           { get; set; }
            public string version           { get; set; }
            public string customerPanelLink { get; set; }
            public string downloadLink      { get; set; }
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

    // ── Encryption helpers (identical to original KeyAuth) ────────────────────
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
            try
            {
                int len   = hex.Length;
                var bytes = new byte[len / 2];
                for (int i = 0; i < len; i += 2)
                    bytes[i / 2] = Convert.ToByte(hex.Substring(i, 2), 16);
                return bytes;
            }
            catch
            {
                api.error("The session has ended, open program again.");
                Environment.Exit(0);
                return null;
            }
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
