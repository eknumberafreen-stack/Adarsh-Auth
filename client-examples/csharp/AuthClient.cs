using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Timers;

namespace AdarshAuth
{
    /// <summary>
    /// Production-grade auth client with all 12 security fixes applied.
    /// - HMAC SHA256 signing
    /// - Nonce per request (anti-replay)
    /// - Timestamp validation
    /// - Heartbeat every 15 seconds
    /// - HWID binding
    /// </summary>
    public class AuthClient : IDisposable
    {
        private readonly HttpClient _http;
        private readonly string _apiUrl;
        private readonly string _appName;
        private readonly string _ownerId;
        private readonly string _appSecret;

        private string _sessionToken;
        private System.Timers.Timer _heartbeatTimer;

        private const int HEARTBEAT_INTERVAL_MS = 15_000; // 15 seconds

        public AuthClient(string apiUrl, string appName, string ownerId, string appSecret)
        {
            _http      = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            _apiUrl    = apiUrl.TrimEnd('/');
            _appName   = appName;
            _ownerId   = ownerId;
            _appSecret = appSecret;
        }

        // ── HWID ──────────────────────────────────────────────────────────────
        private string GetHWID()
        {
            // Combine stable hardware identifiers
            string raw = $"{Environment.MachineName}|{Environment.ProcessorCount}|{Environment.OSVersion}";
            using var sha = SHA256.Create();
            return BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(raw)))
                               .Replace("-", "").ToLower();
        }

        // ── Nonce ─────────────────────────────────────────────────────────────
        private string GenerateNonce()
        {
            var bytes = new byte[16];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            return BitConverter.ToString(bytes).Replace("-", "").ToLower();
        }

        // ── Signature ─────────────────────────────────────────────────────────
        // Signature = HMAC_SHA256(app_secret, app_name + owner_id + timestamp + nonce + bodyJson)
        private string Sign(long timestamp, string nonce, string bodyJson)
        {
            string data = $"{_appName}{_ownerId}{timestamp}{nonce}{bodyJson}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_appSecret));
            return BitConverter.ToString(hmac.ComputeHash(Encoding.UTF8.GetBytes(data)))
                               .Replace("-", "").ToLower();
        }

        // ── Signed request ────────────────────────────────────────────────────
        private async Task<JsonElement> PostSigned(string endpoint, Dictionary<string, object> payload)
        {
            long   timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            string nonce     = GenerateNonce();
            string bodyJson  = JsonSerializer.Serialize(payload);
            string signature = Sign(timestamp, nonce, bodyJson);

            // Merge security fields into payload
            var full = new Dictionary<string, object>(payload)
            {
                ["app_name"]  = _appName,
                ["owner_id"]  = _ownerId,
                ["timestamp"] = timestamp,
                ["nonce"]     = nonce,
                ["signature"] = signature
            };

            var content  = new StringContent(JsonSerializer.Serialize(full), Encoding.UTF8, "application/json");
            var response = await _http.PostAsync($"{_apiUrl}{endpoint}", content);
            var body     = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new Exception($"[{(int)response.StatusCode}] {body}");

            return JsonSerializer.Deserialize<JsonElement>(body);
        }

        // ── Public API ────────────────────────────────────────────────────────

        public async Task<bool> Initialize()
        {
            try
            {
                var r = await PostSigned("/client/init", new Dictionary<string, object>());
                Console.WriteLine($"✓ Init: {r.GetProperty("message").GetString()}");
                return true;
            }
            catch (Exception ex) { Console.WriteLine($"✗ Init failed: {ex.Message}"); return false; }
        }

        public async Task<bool> Register(string username, string password, string licenseKey)
        {
            try
            {
                var payload = new Dictionary<string, object>
                {
                    ["username"]    = username,
                    ["password"]    = password,
                    ["license_key"] = licenseKey,
                    ["hwid"]        = GetHWID()
                };

                var r = await PostSigned("/client/register", payload);
                _sessionToken = r.GetProperty("sessionToken").GetString();
                Console.WriteLine("✓ Registered successfully");
                StartHeartbeat();
                return true;
            }
            catch (Exception ex) { Console.WriteLine($"✗ Register failed: {ex.Message}"); return false; }
        }

        public async Task<bool> Login(string username, string password)
        {
            try
            {
                var payload = new Dictionary<string, object>
                {
                    ["username"] = username,
                    ["password"] = password,
                    ["hwid"]     = GetHWID()
                };

                var r = await PostSigned("/client/login", payload);
                _sessionToken = r.GetProperty("sessionToken").GetString();
                Console.WriteLine("✓ Logged in successfully");
                StartHeartbeat();
                return true;
            }
            catch (Exception ex)
            {
                // Parse ban message from response if available
                try
                {
                    var errDoc = JsonSerializer.Deserialize<JsonElement>(
                        ex.Message.Substring(ex.Message.IndexOf('{'))
                    );
                    if (errDoc.TryGetProperty("banned", out var banned) && banned.GetBoolean())
                    {
                        string banMsg = errDoc.GetProperty("message").GetString();
                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine("\n╔══════════════════════════════════════╗");
                        Console.WriteLine("║         ACCOUNT BANNED               ║");
                        Console.WriteLine("╠══════════════════════════════════════╣");
                        Console.WriteLine($"║ {banMsg.PadRight(38)} ║");
                        Console.WriteLine("╚══════════════════════════════════════╝");
                        Console.ResetColor();
                        return false;
                    }
                }
                catch { }
                Console.WriteLine($"✗ Login failed: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> Validate()
        {
            try
            {
                var payload = new Dictionary<string, object>
                {
                    ["session_token"] = _sessionToken,
                    ["hwid"]          = GetHWID()
                };
                await PostSigned("/client/validate", payload);
                return true;
            }
            catch { return false; }
        }

        // ── Heartbeat ─────────────────────────────────────────────────────────
        private void StartHeartbeat()
        {
            _heartbeatTimer          = new System.Timers.Timer(HEARTBEAT_INTERVAL_MS);
            _heartbeatTimer.Elapsed += async (_, _) => await SendHeartbeat();
            _heartbeatTimer.Start();
            Console.WriteLine("♥ Heartbeat started (every 15s)");
        }

        private async Task SendHeartbeat()
        {
            try
            {
                var payload = new Dictionary<string, object>
                {
                    ["session_token"] = _sessionToken,
                    ["hwid"]          = GetHWID()
                };
                await PostSigned("/client/heartbeat", payload);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ Heartbeat failed: {ex.Message}");
                StopHeartbeat();
            }
        }

        private void StopHeartbeat()
        {
            _heartbeatTimer?.Stop();
            _heartbeatTimer?.Dispose();
        }

        public void Dispose()
        {
            StopHeartbeat();
            _http?.Dispose();
        }
    }

    // ── Example usage ─────────────────────────────────────────────────────────
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("=== Adarsh Auth Client ===\n");

            // Replace with your actual credentials from the dashboard
            string apiUrl    = "http://localhost:5000/api";
            string appName   = "My Application";
            string ownerId   = "YOUR_OWNER_ID";
            string appSecret = "YOUR_APP_SECRET";

            using var client = new AuthClient(apiUrl, appName, ownerId, appSecret);

            if (!await client.Initialize()) return;

            Console.WriteLine("1. Register\n2. Login");
            Console.Write("Select: ");
            string choice = Console.ReadLine();

            if (choice == "1")
            {
                Console.Write("Username: "); string u = Console.ReadLine();
                Console.Write("Password: "); string p = Console.ReadLine();
                Console.Write("License:  "); string l = Console.ReadLine();
                await client.Register(u, p, l);
            }
            else
            {
                Console.Write("Username: "); string u = Console.ReadLine();
                Console.Write("Password: "); string p = Console.ReadLine();
                await client.Login(u, p);
            }

            Console.WriteLine("\nPress any key to exit...");
            Console.ReadKey();
        }
    }
}
