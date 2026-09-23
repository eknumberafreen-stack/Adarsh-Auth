using System;
using System.Security.Cryptography;
using System.Text;
using System.Net.Http;
using System.IO;
using System.Collections.Generic;
using System.Threading;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Linq;

namespace AdarshAuth
{
    public class api
    {
        // ── Credentials ──────────────────────────────────────────────────────
        public string name, ownerid, secret, version, apiUrl;
        public static long responseTime;

        // ── Server URL ───────────────────────────────────────────────────────
        private const string DEFAULT_API_BASE = "https://adarshauth.store/api/client";

        // ── Session state ────────────────────────────────────────────────────
        private string? _sessionToken;
        private bool _initialized;
        private string? _lastNonce;
        private static readonly HttpClient _httpClient = new HttpClient();

        public string? SessionToken
        {
            get => _sessionToken;
            set => _sessionToken = value;
        }

        // ── Public data classes ──────────────────────────────────────────────
        public user_data_class user_data = new user_data_class();
        public app_data_class app_data = new app_data_class();
        public response_class response = new response_class();

        public api(string name, string ownerid, string secret, string version, string? url = null)
        {
            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(ownerid))
            {
                error("Application not setup correctly. Check your Application Name and Owner ID.");
            }

            this.name = name.Trim();
            this.ownerid = ownerid.Trim();
            this.secret = secret?.Trim() ?? "";
            this.version = string.IsNullOrWhiteSpace(version) ? "1.0" : version.Trim();
            this.apiUrl = string.IsNullOrWhiteSpace(url) ? DEFAULT_API_BASE : url.TrimEnd('/');
        }

        public void init()
        {
            if (_initialized) return;

            var sw = System.Diagnostics.Stopwatch.StartNew();
            var result = PostRequest("/init", new Dictionary<string, object>());
            sw.Stop();
            responseTime = sw.ElapsedMilliseconds;

            response.success = result.success;
            response.message = result.message;

            if (!result.success)
            {
                error(string.IsNullOrEmpty(result.message) ? "Application not found or is paused. Check your credentials." : result.message);
                return;
            }

            app_data.version = string.IsNullOrEmpty(result.version) ? version : result.version;
            _initialized = true;
        }

        public void CheckInit()
        {
            if (!_initialized)
            {
                error("You must run AdarshAuthApp.init(); first before calling authentication methods.");
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
                ["hwid"] = hwid
            };
            var result = PostRequest("/login", payload);
            response.success = result.success;
            response.message = result.message;
            if (result.success)
            {
                SessionToken = result.sessionToken;
                LoadUserData(result, hwid);
            }
        }

        public void register(string username, string pass, string key)
        {
            CheckInit();
            string hwid = GetHWID();
            var payload = new Dictionary<string, object>
            {
                ["username"] = username,
                ["password"] = pass,
                ["license_key"] = key,
                ["hwid"] = hwid
            };
            var result = PostRequest("/register", payload);
            response.success = result.success;
            response.message = result.message;
            if (result.success)
            {
                SessionToken = result.sessionToken;
                LoadUserData(result, hwid);
            }
        }

        public void upgrade(string username, string key)
        {
            CheckInit();
            var payload = new Dictionary<string, object>
            {
                ["username"] = username,
                ["license_key"] = key
            };
            var result = PostRequest("/upgrade", payload);
            response.success = result.success;
            response.message = result.message;
        }

        public void license(string key)
        {
            CheckInit();
            string hwid = GetHWID();
            var payload = new Dictionary<string, object>
            {
                ["key"] = key,
                ["hwid"] = hwid
            };
            var result = PostRequest("/license", payload);
            response.success = result.success;
            response.message = result.message;
            if (result.success)
            {
                SessionToken = result.sessionToken;
                LoadUserData(result, hwid);
            }
        }

        public bool check()
        {
            CheckInit();
            if (string.IsNullOrEmpty(SessionToken))
            {
                response.success = false;
                response.message = "No active session.";
                return false;
            }
            string hwid = GetHWID();
            var payload = new Dictionary<string, object>
            {
                ["session_token"] = SessionToken,
                ["hwid"] = hwid
            };
            var result = PostRequest("/validate", payload);
            response.success = result.success;
            response.message = result.message;
            if (result.success)
            {
                LoadUserData(result, hwid);
                return true;
            }
            SessionToken = null;
            return false;
        }

        public string? var(string varId)
        {
            CheckInit();
            var payload = new Dictionary<string, object>
            {
                ["varid"] = varId,
                ["session_token"] = SessionToken ?? ""
            };
            var result = PostRequest("/var", payload);
            response.success = result.success;
            response.message = result.message;
            return result.value;
        }

        public void log(string message)
        {
            CheckInit();
            var payload = new Dictionary<string, object>
            {
                ["message"] = message,
                ["session_token"] = SessionToken ?? ""
            };
            PostRequest("/log", payload);
        }

        public void logout()
        {
            SessionToken = null;
            _initialized = false;
            response.success = true;
            response.message = "Logged out successfully.";
        }

        public static string GetHWID()
        {
            try
            {
                string mName = Environment.MachineName;
                string uName = Environment.UserName;
                string pCount = Environment.ProcessorCount.ToString();
                string osVer = Environment.OSVersion.ToString();

                string raw = $"{mName}-{uName}-{pCount}-{osVer}";
                using (var sha = SHA256.Create())
                {
                    byte[] bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(raw));
                    return Convert.ToHexString(bytes).ToLower();
                }
            }
            catch
            {
                return Environment.MachineName;
            }
        }

        private ApiResult PostRequest(string endpoint, Dictionary<string, object> payload)
        {
            try
            {
                long timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                string nonce = Guid.NewGuid().ToString("N");
                _lastNonce = nonce;

                var sortedPayload = new SortedDictionary<string, object>(payload);
                string bodyJson = JsonSerializer.Serialize(sortedPayload);
                string dataToSign = $"{name}{ownerid}{timestamp}{nonce}{bodyJson}";
                string signature = string.IsNullOrEmpty(secret) ? "" : HashHMAC(secret, dataToSign);

                var fullPayload = new Dictionary<string, object>(payload)
                {
                    ["app_name"] = name,
                    ["owner_id"] = ownerid,
                    ["timestamp"] = timestamp,
                    ["nonce"] = nonce,
                    ["signature"] = signature,
                    ["version"] = version
                };

                string requestJson = JsonSerializer.Serialize(fullPayload);
                using (var request = new HttpRequestMessage(HttpMethod.Post, apiUrl + endpoint))
                {
                    request.Content = new StringContent(requestJson, Encoding.UTF8, "application/json");
                    request.Headers.Add("User-Agent", "AdarshAuth-CSharp/1.0");

                    var httpResponse = _httpClient.Send(request);
                    string rawResponse = new StreamReader(httpResponse.Content.ReadAsStream()).ReadToEnd();

                    try
                    {
                        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                        var res = JsonSerializer.Deserialize<ApiResult>(rawResponse, options);
                        return res ?? new ApiResult { success = false, message = "Empty response from server." };
                    }
                    catch
                    {
                        return new ApiResult { success = false, message = rawResponse };
                    }
                }
            }
            catch (Exception ex)
            {
                return new ApiResult { success = false, message = "Connection error: " + ex.Message };
            }
        }

        private static string HashHMAC(string key, string message)
        {
            byte[] keyBytes = Encoding.UTF8.GetBytes(key);
            byte[] msgBytes = Encoding.UTF8.GetBytes(message);
            using (var hmac = new HMACSHA256(keyBytes))
            {
                byte[] hash = hmac.ComputeHash(msgBytes);
                return Convert.ToHexString(hash).ToLower();
            }
        }

        private void LoadUserData(ApiResult result, string hwid)
        {
            user_data.username = result.username ?? user_data.username;
            user_data.ip = result.ip ?? "";
            user_data.hwid = hwid;
            user_data.createdate = result.createdate ?? "";
            user_data.lastlogin = result.lastlogin ?? DateTime.Now.ToString("dd-MM-yyyy HH:mm:ss");
            user_data.subscriptions = new List<Data>();

            string subName = result.subscription ?? "default";
            string expiryStr = result.expiryDate ?? "Lifetime";
            user_data.subscriptions.Add(new Data { subscription = subName, expiry = expiryStr });
        }

        public static void error(string message)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"[AdarshAuth Error] {message}");
            Console.ResetColor();
        }
    }

    public class ApiResult
    {
        public bool success { get; set; }
        public string? message { get; set; }
        public string? sessionToken { get; set; }
        public string? version { get; set; }
        public string? username { get; set; }
        public string? ip { get; set; }
        public string? hwid { get; set; }
        public string? createdate { get; set; }
        public string? lastlogin { get; set; }
        public string? subscription { get; set; }
        public string? expiryDate { get; set; }
        public string? value { get; set; }
    }

    public class user_data_class
    {
        public string username { get; set; } = "";
        public string ip { get; set; } = "";
        public string hwid { get; set; } = "";
        public string createdate { get; set; } = "";
        public string lastlogin { get; set; } = "";
        public List<Data> subscriptions { get; set; } = new List<Data>();
    }

    public class Data
    {
        public string subscription { get; set; } = "";
        public string expiry { get; set; } = "";
    }

    public class app_data_class
    {
        public string version { get; set; } = "1.0";
    }

    public class response_class
    {
        public bool success { get; set; }
        public string message { get; set; } = "";
    }
}
