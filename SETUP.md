# Complete Setup Guide

## Prerequisites Installation

### 1. Install Node.js
Download and install Node.js 18+ from [nodejs.org](https://nodejs.org/)

Verify installation:
```bash
node --version
npm --version
```

### 2. Install MongoDB

**Windows**:
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run the installer
3. Choose "Complete" installation
4. Install as a Windows Service
5. Start MongoDB service

**macOS** (using Homebrew):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux** (Ubuntu/Debian):
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

Verify MongoDB is running:
```bash
mongosh
```

### 3. Install Redis

**Windows**:
1. Download Redis from [github.com/microsoftarchive/redis/releases](https://github.com/microsoftarchive/redis/releases)
2. Extract and run `redis-server.exe`

Or use WSL2 and follow Linux instructions.

**macOS** (using Homebrew):
```bash
brew install redis
brew services start redis
```

**Linux** (Ubuntu/Debian):
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
```

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

## Project Setup

### 1. Clone or Extract Project
```bash
cd /path/to/project
```

### 2. Install Backend Dependencies
```bash
npm install
```

This will install:
- express
- mongoose
- redis
- jsonwebtoken
- bcrypt
- cors
- helmet
- joi
- dotenv
- and more...

### 3. Configure Backend Environment
```bash
cp .env.example .env
```

Edit `.env` file with your settings:
```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/saas_auth_platform

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secrets (CHANGE THESE!)
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# JWT Expiry
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=900000

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Request Validation
TIMESTAMP_TOLERANCE=30000
NONCE_TTL=60

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

**Generate Strong Secrets**:
```bash
# On Linux/macOS
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 4. Install Frontend Dependencies
```bash
cd frontend
npm install
```

This will install:
- next
- react
- react-dom
- axios
- zustand
- tailwindcss
- typescript
- and more...

### 5. Configure Frontend Environment
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Running the Application

### Option 1: Run Both Servers Together
From the root directory:
```bash
npm run dev
```

This starts both backend and frontend concurrently.

### Option 2: Run Separately

**Terminal 1 - Backend**:
```bash
npm run server
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

## Verify Installation

### 1. Check Backend
Open browser to [http://localhost:5000/health](http://localhost:5000/health)

Should see:
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

### 2. Check Frontend
Open browser to [http://localhost:3000](http://localhost:3000)

Should see the login page.

### 3. Check Database Connection
Look for console output:
```
✅ MongoDB Connected: localhost
✅ Redis Connected
🚀 Server running on port 5000
```

## First Time Usage

### 1. Register Account
1. Go to [http://localhost:3000/register](http://localhost:3000/register)
2. Enter email and password (min 8 characters)
3. Click "Create Account"

### 2. Create Application
1. Navigate to "Applications" in sidebar
2. Click "Create Application"
3. Enter application name and version
4. Click "Create"
5. Click "Credentials" button
6. **SAVE** the Owner ID and App Secret

### 3. Generate License Keys
1. Navigate to "Licenses" in sidebar
2. Select your application
3. Click "Generate Licenses"
4. Choose:
   - Expiry Type: Lifetime or Fixed Days
   - Days: (if fixed days)
   - Count: Number of keys to generate
5. Click "Generate"
6. Copy license keys

### 4. Test with C# Client

**Install .NET SDK**:
Download from [dotnet.microsoft.com](https://dotnet.microsoft.com/download)

**Build and Run**:
```bash
cd client-examples/csharp
dotnet build
dotnet run
```

**Configure Client**:
Edit `AuthClient.cs` and replace:
```csharp
string apiUrl = "http://localhost:5000/api";
string appName = "Your Application Name";
string ownerId = "your_owner_id_from_dashboard";
string appSecret = "your_app_secret_from_dashboard";
```

**Test Registration**:
1. Run the client
2. Select option "1" (Register)
3. Enter username
4. Enter password
5. Enter license key (from dashboard)
6. Should see: "✓ Successfully registered and logged in!"

## Troubleshooting

### MongoDB Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**:
- Verify MongoDB is running: `mongosh`
- Check MongoDB service status
- Ensure port 27017 is not blocked

### Redis Connection Failed
```
Error: Redis connection failed
```

**Solution**:
- Verify Redis is running: `redis-cli ping`
- Check Redis service status
- Ensure port 6379 is not blocked

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution**:
- Change PORT in `.env` file
- Or kill process using the port:
  ```bash
  # Linux/macOS
  lsof -ti:5000 | xargs kill -9
  
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  ```

### Frontend Build Errors
```
Error: Cannot find module 'next'
```

**Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution**:
- Verify `FRONTEND_URL` in backend `.env` matches your frontend URL
- Restart backend server after changing `.env`

## Production Deployment

### 1. Build Frontend
```bash
cd frontend
npm run build
npm start
```

### 2. Configure Production Environment
Update `.env`:
```env
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
```

### 3. Use Process Manager
```bash
npm install -g pm2
pm2 start backend/server.js --name auth-backend
pm2 startup
pm2 save
```

### 4. Enable HTTPS
- Use nginx or Apache as reverse proxy
- Install SSL certificate (Let's Encrypt)
- Redirect HTTP to HTTPS

### 5. Secure Database
- Enable MongoDB authentication
- Set Redis password
- Use firewall rules
- Regular backups

## Next Steps

1. ✅ Customize the UI to match your brand
2. ✅ Implement additional security features
3. ✅ Add email verification
4. ✅ Set up monitoring and alerts
5. ✅ Configure automated backups
6. ✅ Implement rate limiting adjustments
7. ✅ Add webhook notifications
8. ✅ Create admin panel

## Support

If you encounter issues:
1. Check console logs for errors
2. Verify all services are running
3. Check environment variables
4. Review the troubleshooting section
5. Open an issue on GitHub

---

Happy coding! 🚀
