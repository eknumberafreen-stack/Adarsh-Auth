# Complete Step-by-Step Usage Guide

## 🚀 Getting Started

### Prerequisites Check
Before starting, make sure you have:
- ✅ Node.js 18+ installed
- ✅ MongoDB running
- ✅ Redis running
- ✅ All npm packages installed

---

## Part 1: Initial Setup (5 minutes)

### Step 1: Configure Environment Variables

**Backend Configuration:**
```bash
# In the root directory, copy the example file
cp .env.example .env
```

**Edit `.env` file and set these important values:**
```env
# Generate strong JWT secrets (IMPORTANT!)
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# MongoDB (default is fine for local development)
MONGODB_URI=mongodb://localhost:27017/saas_auth_platform

# Redis (default is fine for local development)
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Generate Strong Secrets:**
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Frontend Configuration:**
```bash
# In the frontend directory
cd frontend
cp .env.local.example .env.local
```

The default values in `.env.local` are fine for local development.

---

### Step 2: Start MongoDB

**Windows:**
- Open Services (Win+R, type `services.msc`)
- Find "MongoDB Server"
- Click "Start"

**Mac:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

**Verify MongoDB is running:**
```bash
mongosh
# You should see a MongoDB shell prompt
# Type 'exit' to quit
```

---

### Step 3: Start Redis

**Windows:**
- Run `redis-server.exe` from your Redis installation folder

**Mac:**
```bash
brew services start redis
```

**Linux:**
```bash
sudo systemctl start redis-server
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

---

### Step 4: Start the Application

**Option 1: Start Both Servers Together (Recommended)**
```bash
# In the root directory
npm run dev
```

**Option 2: Start Separately**

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

**Wait for both servers to start:**
- Backend: `🚀 Server running on port 5000`
- Frontend: `✓ Ready on http://localhost:3000`

---

## Part 2: Using the Dashboard (10 minutes)

### Step 5: Create Your Account

1. **Open your browser** and go to: http://localhost:3000
2. You'll be redirected to the **Login page**
3. Click **"Sign up"** at the bottom
4. **Enter your details:**
   - Email: `your-email@example.com`
   - Password: `password123` (minimum 8 characters)
   - Confirm Password: `password123`
5. Click **"Create Account"**
6. ✅ You'll be automatically logged in and redirected to the dashboard

---

### Step 6: Create Your First Application

1. In the dashboard, click **"Applications"** in the sidebar
2. Click the **"Create Application"** button (top right)
3. **Fill in the form:**
   - Name: `My First App`
   - Version: `1.0.0`
4. Click **"Create"**
5. ✅ Your application appears in the list!

---

### Step 7: Get Your Application Credentials

**IMPORTANT: You'll need these for client integration!**

1. Find your application in the list
2. Click the **"Credentials"** button (key icon)
3. A modal will open showing:
   - **Application Name**: My First App
   - **Owner ID**: `abc123...` (32 characters)
   - **App Secret**: `xyz789...` (128 characters)
4. **Copy and save these values:**
   - Click the copy icon next to Owner ID → Save it
   - Click the copy icon next to App Secret → Save it
5. ⚠️ **Keep the App Secret secure!** It's like a password

---

### Step 8: Generate License Keys

1. Click **"Licenses"** in the sidebar
2. Make sure your application is selected in the dropdown
3. Click **"Generate Licenses"** button
4. **Choose license type:**
   - **Lifetime**: Never expires
   - **Fixed Days**: Expires after X days
5. **Example - Generate 5 lifetime licenses:**
   - Expiry Type: `Lifetime`
   - Count: `5`
6. Click **"Generate"**
7. ✅ Five license keys appear in the list!
8. **Copy a license key** (click on it to copy)
   - Format: `XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`

---

## Part 3: Testing with C# Client (15 minutes)

### Step 9: Configure the C# Client

1. **Navigate to the C# client folder:**
```bash
cd client-examples/csharp
```

2. **Open `AuthClient.cs` in a text editor**

3. **Find the `Main` method** (around line 200) and update these values:
```csharp
// Replace with your actual values from Step 7
string apiUrl = "http://localhost:5000/api";
string appName = "My First App";  // Your application name
string ownerId = "paste-your-owner-id-here";  // From Step 7
string appSecret = "paste-your-app-secret-here";  // From Step 7
```

4. **Save the file**

---

### Step 10: Build and Run the C# Client

**Build the client:**
```bash
dotnet build
```

**Run the client:**
```bash
dotnet run
```

You'll see:
```
=== Auth Platform Client Example ===

1. Register
2. Login

Select option:
```

---

### Step 11: Register a New User

1. **Type `1`** and press Enter (for Register)
2. **Enter username:** `testuser`
3. **Enter password:** `password123`
4. **Enter license key:** Paste the license key you copied in Step 8
5. Press Enter

**Expected output:**
```
✓ Application initialized successfully
✓ Registration successful
♥ Heartbeat started
✓ Successfully registered and logged in!
Press any key to exit...
```

6. ✅ **Success!** The user is now registered and logged in
7. The heartbeat will automatically send every 30 seconds

---

### Step 12: View the User in Dashboard

1. **Go back to the dashboard** in your browser
2. Click **"Users"** in the sidebar
3. Select your application from the dropdown
4. ✅ You'll see your new user: `testuser`
5. **User details shown:**
   - Username: testuser
   - HWID: (hardware ID captured)
   - Last Login: (timestamp)
   - Last IP: 127.0.0.1
   - Status: Active

---

### Step 13: View Active Session

1. Click **"Sessions"** in the sidebar
2. Select your application
3. ✅ You'll see an active session for `testuser`
4. **Session details:**
   - User: testuser
   - IP: 127.0.0.1
   - HWID: (hardware ID)
   - Last Heartbeat: (updates every 30 seconds)
   - Created: (timestamp)
   - Expires: (24 hours from creation)

---

### Step 14: Test Login (Existing User)

1. **Close the C# client** (press any key)
2. **Run it again:**
```bash
dotnet run
```
3. **Type `2`** and press Enter (for Login)
4. **Enter username:** `testuser`
5. **Enter password:** `password123`
6. Press Enter

**Expected output:**
```
✓ Application initialized successfully
✓ Login successful
♥ Heartbeat started
✓ Successfully logged in!
Press any key to exit...
```

7. ✅ **Success!** The user logged in with existing credentials

---

## Part 4: Dashboard Features (10 minutes)

### Step 15: Manage Users

**Ban a User:**
1. Go to **Users** page
2. Find the user
3. Click the **ban icon** (shield with exclamation)
4. ✅ User is banned
5. Try to login with C# client → Will fail with "Account is banned"

**Unban a User:**
1. Click the **unban icon** (shield with check)
2. ✅ User can login again

**Reset HWID:**
1. Click the **reset icon** (circular arrow)
2. Confirm the action
3. ✅ User can now login from a different computer

**Delete a User:**
1. Click the **delete icon** (trash)
2. Confirm the action
3. ✅ User is permanently deleted

---

### Step 16: Manage Licenses

**View License Status:**
1. Go to **Licenses** page
2. See all licenses with status:
   - 🟢 **Unused**: Not redeemed yet
   - 🟢 **Used**: Redeemed by a user
   - 🔴 **Revoked**: Invalidated

**Revoke a License:**
1. Find a license
2. Click the **revoke icon** (X in circle)
3. Confirm
4. ✅ License is revoked and can't be used

**Generate More Licenses:**
1. Click **"Generate Licenses"**
2. Choose type and count
3. Click **"Generate"**
4. ✅ New licenses created

---

### Step 17: Manage Sessions

**View Active Sessions:**
1. Go to **Sessions** page
2. See all active sessions with:
   - User information
   - IP address
   - Hardware ID
   - Last heartbeat time

**Terminate a Session:**
1. Click the **delete icon** on a session
2. ✅ Session is terminated
3. The client will be disconnected

**Terminate All Sessions:**
1. Click **"Terminate All"** button
2. Confirm
3. ✅ All sessions for the application are terminated

---

### Step 18: Manage Applications

**Pause an Application:**
1. Go to **Applications** page
2. Click the **pause icon** on your app
3. ✅ Application is paused
4. Users can't login while paused

**Resume an Application:**
1. Click the **play icon**
2. ✅ Application is active again

**Regenerate App Secret:**
1. Click **"Credentials"** button
2. Click **"Regenerate Secret"**
3. Confirm (this will invalidate all active sessions)
4. ✅ New secret is generated
5. ⚠️ Update your C# client with the new secret

**Delete an Application:**
1. Click the **delete icon** (trash)
2. Confirm (this will delete ALL users, licenses, and sessions)
3. ✅ Application is permanently deleted

---

## Part 5: Advanced Usage

### Step 19: Monitor Statistics

**Dashboard Home:**
1. Click **"Dashboard"** in the sidebar
2. View statistics:
   - Total Applications
   - Total Licenses
   - Total Users
   - Active Sessions

**Application Statistics:**
1. Go to **Applications** page
2. Each application card shows:
   - User count
   - Status
   - Version
   - Creation date

---

### Step 20: Security Features in Action

**Test Rate Limiting:**
1. Try to login with wrong password 10 times quickly
2. ✅ You'll be rate limited after too many attempts

**Test Account Lockout:**
1. Try to login with wrong password 5 times
2. ✅ Account is locked for 15 minutes

**Test HWID Lock:**
1. Login from one computer
2. Try to login from another computer with same credentials
3. ✅ Login fails with "HWID mismatch"
4. Reset HWID from dashboard to allow login from new computer

**View Audit Logs:**
- All security events are logged in the database
- Check MongoDB for audit logs:
```bash
mongosh
use saas_auth_platform
db.auditlogs.find().pretty()
```

---

## Part 6: Integration with Your Software

### Step 21: Integrate into Your Application

**Basic Integration Pattern:**

```csharp
// 1. Initialize on application startup
var authClient = new AuthClient(apiUrl, appName, ownerId, appSecret);
await authClient.Initialize();

// 2. Show login/register form to user
string username = GetUsernameFromUI();
string password = GetPasswordFromUI();

// 3. Try to login
if (await authClient.Login(username, password))
{
    // User authenticated successfully
    // Show your main application
    ShowMainApplication();
}
else
{
    // Authentication failed
    ShowError("Login failed");
}

// 4. Heartbeat runs automatically in background

// 5. On application exit
authClient.Dispose();
```

**For New Users (Registration):**
```csharp
string licenseKey = GetLicenseKeyFromUI();
if (await authClient.Register(username, password, licenseKey))
{
    // Registration successful
    ShowMainApplication();
}
```

---

## Common Workflows

### Workflow 1: Selling Software with Licenses

1. **Customer purchases your software**
2. **Generate a license key** in the dashboard
3. **Send the license key** to the customer
4. **Customer runs your software**
5. **Software shows registration form**
6. **Customer enters license key** and creates account
7. **Software validates** with your server
8. ✅ **Customer can use your software**

---

### Workflow 2: Subscription Management

1. **Generate 30-day licenses** for monthly subscriptions
2. **Customer registers** with the license
3. **After 30 days**, license expires
4. **Customer renews subscription**
5. **Generate new license** and send to customer
6. **Customer uses new license** to extend access

---

### Workflow 3: Hardware-Locked Licenses

1. **Customer registers** on their computer
2. **HWID is captured** automatically
3. **Customer tries to use on another computer**
4. ✅ **Login fails** (HWID mismatch)
5. **Customer contacts support**
6. **You reset HWID** from dashboard
7. **Customer can login** on new computer

---

## Troubleshooting

### Issue: Can't login to dashboard
**Solution:** Check if backend is running on port 5000

### Issue: C# client can't connect
**Solution:** 
- Verify backend is running
- Check apiUrl in C# client
- Verify Owner ID and App Secret are correct

### Issue: License key invalid
**Solution:**
- Check if license was generated for correct application
- Verify license hasn't been revoked
- Check if license has expired

### Issue: HWID mismatch
**Solution:** Reset HWID from dashboard Users page

### Issue: Session expired
**Solution:** Login again (sessions expire after 24 hours)

---

## Next Steps

1. ✅ **Customize the UI** - Edit frontend files to match your brand
2. ✅ **Add more features** - Extend the API as needed
3. ✅ **Deploy to production** - See DEPLOYMENT.md
4. ✅ **Integrate with your software** - Use the C# client as reference
5. ✅ **Monitor and maintain** - Check logs and statistics regularly

---

## Quick Reference

### Important URLs
- **Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/health

### Important Files
- **Backend Config**: `.env`
- **Frontend Config**: `frontend/.env.local`
- **C# Client**: `client-examples/csharp/AuthClient.cs`

### Important Commands
```bash
# Start everything
npm run dev

# Start backend only
npm run server

# Start frontend only
cd frontend && npm run dev

# Build C# client
cd client-examples/csharp && dotnet build

# Run C# client
cd client-examples/csharp && dotnet run
```

---

## 🎉 Congratulations!

You now know how to:
- ✅ Set up and run the platform
- ✅ Create applications and generate licenses
- ✅ Manage users and sessions
- ✅ Integrate with C# client
- ✅ Use all dashboard features
- ✅ Troubleshoot common issues

**You're ready to protect your software with secure authentication and licensing!** 🚀

For more details, see:
- **API.md** - Complete API reference
- **SECURITY.md** - Security features explained
- **DEPLOYMENT.md** - Production deployment guide
