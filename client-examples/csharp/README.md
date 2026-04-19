# C# Client Example

This is a complete C# client implementation for the SaaS Authentication Platform.

## Features

- ✅ HMAC SHA256 signature generation
- ✅ Nonce generation for replay attack prevention
- ✅ Timestamp validation
- ✅ Secure HWID generation
- ✅ Session management
- ✅ Automatic heartbeat
- ✅ Complete API integration

## Requirements

- .NET 6.0 or higher
- Internet connection to API server

## Installation

### 1. Install .NET SDK

Download from [dotnet.microsoft.com](https://dotnet.microsoft.com/download)

Verify installation:
```bash
dotnet --version
```

### 2. Build the Project

```bash
cd client-examples/csharp
dotnet build
```

## Configuration

Edit `AuthClient.cs` in the `Main` method:

```csharp
// Configuration
string apiUrl = "http://localhost:5000/api";
string appName = "Your Application Name";
string ownerId = "your_owner_id_from_dashboard";
string appSecret = "your_app_secret_from_dashboard";
```

**Get credentials from dashboard**:
1. Login to dashboard
2. Go to Applications
3. Click "Credentials" on your application
4. Copy Owner ID and App Secret

## Usage

### Run the Client

```bash
dotnet run
```

### Register New User

1. Select option `1` (Register)
2. Enter username
3. Enter password
4. Enter license key (get from dashboard)
5. Client will register and start heartbeat

### Login Existing User

1. Select option `2` (Login)
2. Enter username
3. Enter password
4. Client will login and start heartbeat

## Code Structure

### AuthClient Class

```csharp
public class AuthClient
{
    // Constructor
    public AuthClient(string apiUrl, string appName, string ownerId, string appSecret)
    
    // Initialize connection
    public async Task<bool> Initialize()
    
    // Register new user
    public async Task<bool> Register(string username, string password, string licenseKey)
    
    // Login existing user
    public async Task<bool> Login(string username, string password)
    
    // Validate session
    public async Task<bool> ValidateSession()
    
    // Cleanup
    public void Dispose()
}
```

### Security Features

#### 1. Signature Generation
```csharp
private string GenerateSignature(string appName, string ownerId, long timestamp, string nonce, string bodyJson)
{
    string dataToSign = $"{appName}{ownerId}{timestamp}{nonce}{bodyJson}";
    using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_appSecret)))
    {
        byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dataToSign));
        return BitConverter.ToString(hash).Replace("-", "").ToLower();
    }
}
```

#### 2. Nonce Generation
```csharp
private string GenerateNonce()
{
    byte[] nonceBytes = new byte[16];
    using (var rng = RandomNumberGenerator.Create())
    {
        rng.GetBytes(nonceBytes);
    }
    return BitConverter.ToString(nonceBytes).Replace("-", "").ToLower();
}
```

#### 3. HWID Generation
```csharp
private string GetHWID()
{
    // Simplified example - use proper hardware identification in production
    string machineInfo = Environment.MachineName + Environment.ProcessorCount;
    using (var sha256 = SHA256.Create())
    {
        byte[] hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(machineInfo));
        return BitConverter.ToString(hash).Replace("-", "").ToLower();
    }
}
```

## Heartbeat Mechanism

The client automatically sends heartbeat requests every 30 seconds to keep the session alive:

```csharp
private void StartHeartbeat()
{
    _heartbeatTimer = new System.Timers.Timer(30000); // 30 seconds
    _heartbeatTimer.Elapsed += async (sender, e) => await SendHeartbeat();
    _heartbeatTimer.Start();
}
```

## Error Handling

All API methods return `bool` indicating success/failure:

```csharp
if (await client.Login(username, password))
{
    Console.WriteLine("✓ Login successful");
}
else
{
    Console.WriteLine("✗ Login failed");
}
```

Detailed errors are printed to console.

## Production Considerations

### 1. Proper HWID Implementation

Replace the simplified HWID with proper hardware identification:

```csharp
// Use WMI or other methods to get:
// - CPU ID
// - Motherboard serial
// - MAC address
// - Hard drive serial
// Combine and hash for unique HWID
```

### 2. Secure Credential Storage

Never hardcode credentials:

```csharp
// Use configuration files
// Or environment variables
// Or secure key storage
string appSecret = ConfigurationManager.AppSettings["AppSecret"];
```

### 3. Obfuscation

Protect your client binary:
- Use code obfuscation tools
- Encrypt sensitive strings
- Use anti-debugging techniques

### 4. Error Handling

Implement robust error handling:

```csharp
try
{
    await client.Login(username, password);
}
catch (HttpRequestException ex)
{
    // Network error
}
catch (JsonException ex)
{
    // Invalid response
}
catch (Exception ex)
{
    // Other errors
}
```

### 5. Logging

Add logging for debugging:

```csharp
private void Log(string message)
{
    File.AppendAllText("client.log", $"{DateTime.Now}: {message}\n");
}
```

## Integration Example

### Game Integration

```csharp
public class GameAuth
{
    private AuthClient _authClient;
    
    public async Task<bool> Authenticate()
    {
        _authClient = new AuthClient(apiUrl, appName, ownerId, appSecret);
        
        if (!await _authClient.Initialize())
            return false;
        
        // Show login form
        string username = GetUsernameFromUI();
        string password = GetPasswordFromUI();
        
        return await _authClient.Login(username, password);
    }
    
    public void OnGameExit()
    {
        _authClient?.Dispose();
    }
}
```

### Desktop Application

```csharp
public partial class MainForm : Form
{
    private AuthClient _authClient;
    
    private async void LoginButton_Click(object sender, EventArgs e)
    {
        _authClient = new AuthClient(apiUrl, appName, ownerId, appSecret);
        
        if (await _authClient.Login(usernameTextBox.Text, passwordTextBox.Text))
        {
            // Show main application
            this.Hide();
            new MainAppForm().Show();
        }
        else
        {
            MessageBox.Show("Login failed");
        }
    }
}
```

## Testing

### Test Registration

1. Get a license key from dashboard
2. Run client and select Register
3. Enter new username and password
4. Enter license key
5. Should see success message

### Test Login

1. Use previously registered credentials
2. Run client and select Login
3. Enter username and password
4. Should see success message

### Test HWID Lock

1. Login on one machine
2. Try to login with same credentials on different machine
3. Should fail with HWID mismatch

### Test Session Expiry

1. Login successfully
2. Wait 24 hours without heartbeat
3. Session should expire
4. Need to login again

## Troubleshooting

### Connection Failed

```
Error: Unable to connect to the remote server
```

**Solution**: Check API URL and ensure server is running

### Invalid Signature

```
Error: Invalid signature
```

**Solution**: Verify app secret is correct

### HWID Mismatch

```
Error: HWID mismatch
```

**Solution**: Reset HWID from dashboard or use same machine

### License Invalid

```
Error: Invalid or expired license
```

**Solution**: Generate new license from dashboard

## Advanced Features

### Custom HWID Strategy

```csharp
public interface IHWIDProvider
{
    string GetHWID();
}

public class WindowsHWIDProvider : IHWIDProvider
{
    public string GetHWID()
    {
        // Implement Windows-specific HWID
    }
}
```

### Offline Mode

```csharp
public class OfflineAuthClient : AuthClient
{
    public async Task<bool> ValidateOffline()
    {
        // Check cached credentials
        // Validate expiry date
        // Allow limited offline access
    }
}
```

### Multi-Threading

```csharp
// Heartbeat runs on separate thread
// Safe for multi-threaded applications
private readonly object _lock = new object();

private async Task SendHeartbeat()
{
    lock (_lock)
    {
        // Thread-safe heartbeat
    }
}
```

## Support

For issues or questions:
1. Check API documentation
2. Review security documentation
3. Test with example credentials
4. Check server logs

---

Happy coding! 🚀
