using System;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace AuthPlatformClient
{
    /// <summary>
    /// Secure authentication client with HMAC signature verification
    /// </summary>
    public class AuthClient
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiUrl;
        private readonly string _appName;
        private readonly string _ownerId;
        private readonly string _appSecret;
        
        private string _sessionToken;
        private System.Timers.Timer _heartbeatTimer;

        public AuthClient(string apiUrl, string appName, string ownerId, string appSecret)
        {
            _httpClient = new HttpClient();
            _apiUrl = apiUrl.TrimEnd('/');
            _appName = appName;
            _ownerId = ownerId;
            _appSecret = appSecret;
        }

        /// <summary>
        /// Generate HMAC SHA256 signature for request
        /// </summary>
        private string GenerateSignature(string appName, string ownerId, long timestamp, string nonce, string bodyJson)
        {
            // Signature = HMAC SHA256 of: app_name + owner_id + timestamp + nonce + body
            string dataToSign = $"{appName}{ownerId}{timestamp}{nonce}{bodyJson}";
            
            using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_appSecret)))
            {
                byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dataToSign));
                return BitConverter.ToString(hash).Replace("-", "").ToLower();
            }
        }

        /// <summary>
        /// Generate random nonce
        /// </summary>
        private string GenerateNonce()
        {
            byte[] nonceBytes = new byte[16];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(nonceBytes);
            }
            return BitConverter.ToString(nonceBytes).Replace("-", "").ToLower();
        }

        /// <summary>
        /// Get current Unix timestamp in milliseconds
        /// </summary>
        private long GetTimestamp()
        {
            return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }

        /// <summary>
        /// Get hardware ID (simplified - use proper HWID in production)
        /// </summary>
        private string GetHWID()
        {
            // In production, use proper hardware identification
            // This is a simplified example using machine name
            string machineInfo = Environment.MachineName + Environment.ProcessorCount;
            using (var sha256 = SHA256.Create())
            {
                byte[] hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(machineInfo));
                return BitConverter.ToString(hash).Replace("-", "").ToLower();
            }
        }

        /// <summary>
        /// Make signed API request
        /// </summary>
        private async Task<string> MakeSignedRequest(string endpoint, object data)
        {
            long timestamp = GetTimestamp();
            string nonce = GenerateNonce();
            
            // Serialize data
            string bodyJson = JsonSerializer.Serialize(data);
            
            // Generate signature
            string signature = GenerateSignature(_appName, _ownerId, timestamp, nonce, bodyJson);
            
            // Build request body
            var requestBody = new
            {
                app_name = _appName,
                owner_id = _ownerId,
                timestamp = timestamp,
                nonce = nonce,
                signature = signature,
                // Merge with data
            };

            // Merge data into request body
            var mergedData = JsonSerializer.Deserialize<Dictionary<string, object>>(bodyJson);
            var requestDict = new Dictionary<string, object>
            {
                ["app_name"] = _appName,
                ["owner_id"] = _ownerId,
                ["timestamp"] = timestamp,
                ["nonce"] = nonce,
                ["signature"] = signature
            };

            foreach (var kvp in mergedData)
            {
                requestDict[kvp.Key] = kvp.Value;
            }

            string finalJson = JsonSerializer.Serialize(requestDict);
            var content = new StringContent(finalJson, Encoding.UTF8, "application/json");

            // Make request
            var response = await _httpClient.PostAsync($"{_apiUrl}{endpoint}", content);
            string responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"API Error: {responseBody}");
            }

            return responseBody;
        }

        /// <summary>
        /// Initialize - Check if application is active
        /// </summary>
        public async Task<bool> Initialize()
        {
            try
            {
                string response = await MakeSignedRequest("/client/init", new { });
                Console.WriteLine("✓ Application initialized successfully");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ Initialization failed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Register new user with license key
        /// </summary>
        public async Task<bool> Register(string username, string password, string licenseKey)
        {
            try
            {
                string hwid = GetHWID();
                var data = new
                {
                    username = username,
                    password = password,
                    license_key = licenseKey,
                    hwid = hwid
                };

                string response = await MakeSignedRequest("/client/register", data);
                var result = JsonSerializer.Deserialize<JsonElement>(response);
                
                _sessionToken = result.GetProperty("sessionToken").GetString();
                
                Console.WriteLine("✓ Registration successful");
                StartHeartbeat();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ Registration failed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Login existing user
        /// </summary>
        public async Task<bool> Login(string username, string password)
        {
            try
            {
                string hwid = GetHWID();
                var data = new
                {
                    username = username,
                    password = password,
                    hwid = hwid
                };

                string response = await MakeSignedRequest("/client/login", data);
                var result = JsonSerializer.Deserialize<JsonElement>(response);
                
                _sessionToken = result.GetProperty("sessionToken").GetString();
                
                Console.WriteLine("✓ Login successful");
                StartHeartbeat();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ Login failed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Validate current session
        /// </summary>
        public async Task<bool> ValidateSession()
        {
            try
            {
                string hwid = GetHWID();
                var data = new
                {
                    session_token = _sessionToken,
                    hwid = hwid
                };

                await MakeSignedRequest("/client/validate", data);
                return true;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Send heartbeat to keep session alive
        /// </summary>
        private async Task SendHeartbeat()
        {
            try
            {
                string hwid = GetHWID();
                var data = new
                {
                    session_token = _sessionToken,
                    hwid = hwid
                };

                await MakeSignedRequest("/client/heartbeat", data);
                Console.WriteLine("♥ Heartbeat sent");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ Heartbeat failed: {ex.Message}");
                StopHeartbeat();
            }
        }

        /// <summary>
        /// Start automatic heartbeat (every 30 seconds)
        /// </summary>
        private void StartHeartbeat()
        {
            _heartbeatTimer = new System.Timers.Timer(30000); // 30 seconds
            _heartbeatTimer.Elapsed += async (sender, e) => await SendHeartbeat();
            _heartbeatTimer.Start();
            Console.WriteLine("♥ Heartbeat started");
        }

        /// <summary>
        /// Stop heartbeat
        /// </summary>
        private void StopHeartbeat()
        {
            _heartbeatTimer?.Stop();
            _heartbeatTimer?.Dispose();
            Console.WriteLine("♥ Heartbeat stopped");
        }

        /// <summary>
        /// Cleanup resources
        /// </summary>
        public void Dispose()
        {
            StopHeartbeat();
            _httpClient?.Dispose();
        }
    }

    /// <summary>
    /// Example usage
    /// </summary>
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("=== Auth Platform Client Example ===\n");

            // Configuration (replace with your actual credentials)
            string apiUrl = "http://localhost:5000/api";
            string appName = "My Application";
            string ownerId = "your_owner_id_here";
            string appSecret = "your_app_secret_here";

            var client = new AuthClient(apiUrl, appName, ownerId, appSecret);

            // Initialize
            if (!await client.Initialize())
            {
                Console.WriteLine("Failed to initialize. Check your credentials.");
                return;
            }

            Console.WriteLine("\n1. Register");
            Console.WriteLine("2. Login");
            Console.Write("\nSelect option: ");
            string option = Console.ReadLine();

            if (option == "1")
            {
                // Register
                Console.Write("Username: ");
                string username = Console.ReadLine();
                
                Console.Write("Password: ");
                string password = Console.ReadLine();
                
                Console.Write("License Key: ");
                string licenseKey = Console.ReadLine();

                if (await client.Register(username, password, licenseKey))
                {
                    Console.WriteLine("\n✓ Successfully registered and logged in!");
                    Console.WriteLine("Press any key to exit...");
                    Console.ReadKey();
                }
            }
            else if (option == "2")
            {
                // Login
                Console.Write("Username: ");
                string username = Console.ReadLine();
                
                Console.Write("Password: ");
                string password = Console.ReadLine();

                if (await client.Login(username, password))
                {
                    Console.WriteLine("\n✓ Successfully logged in!");
                    Console.WriteLine("Press any key to exit...");
                    Console.ReadKey();
                }
            }

            client.Dispose();
        }
    }
}
