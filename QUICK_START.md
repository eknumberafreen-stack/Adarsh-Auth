# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

✅ Node.js 18+ installed  
✅ MongoDB running  
✅ Redis running  

## Installation

### 1. Install Dependencies

```bash
# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

### 2. Configure Environment

```bash
# Backend
cp .env.example .env

# Frontend
cd frontend
cp .env.local.example .env.local
cd ..
```

**Edit `.env`** and set:
- `JWT_ACCESS_SECRET` (generate with: `openssl rand -base64 32`)
- `JWT_REFRESH_SECRET` (generate with: `openssl rand -base64 32`)

### 3. Start Services

```bash
# Option 1: Start both together
npm run dev

# Option 2: Start separately
npm run server    # Terminal 1
npm run client    # Terminal 2
```

## First Steps

### 1. Access Dashboard
Open [http://localhost:3000](http://localhost:3000)

### 2. Create Account
- Click "Sign up"
- Enter email and password (min 8 chars)
- Click "Create Account"

### 3. Create Application
- Go to "Applications"
- Click "Create Application"
- Enter name (e.g., "My App")
- Click "Create"

### 4. Get Credentials
- Click "Credentials" button
- **Copy and save**:
  - Owner ID
  - App Secret
- These are needed for client integration

### 5. Generate License
- Go to "Licenses"
- Select your application
- Click "Generate Licenses"
- Choose:
  - Type: Lifetime or Days
  - Count: 1
- Click "Generate"
- **Copy the license key**

### 6. Test with C# Client

```bash
cd client-examples/csharp
dotnet build
dotnet run
```

Edit `AuthClient.cs` first:
```csharp
string appName = "My App";
string ownerId = "your_owner_id";
string appSecret = "your_app_secret";
```

Select option 1 (Register):
- Username: testuser
- Password: password123
- License: (paste your license key)

## API Endpoints

### Dashboard API
```
POST /api/auth/register
POST /api/auth/login
GET  /api/applications
POST /api/applications
POST /api/licenses/generate
```

### Client API
```
POST /api/client/init
POST /api/client/register
POST /api/client/login
POST /api/client/validate
POST /api/client/heartbeat
```

## Common Commands

```bash
# Start development
npm run dev

# Backend only
npm run server

# Frontend only
npm run client

# Install all dependencies
npm run install-all

# Check MongoDB
mongosh

# Check Redis
redis-cli ping
```

## Troubleshooting

### Port Already in Use
```bash
# Change PORT in .env
PORT=5001
```

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongosh

# Start MongoDB
# Windows: Start MongoDB service
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
# Windows: Run redis-server.exe
# Mac: brew services start redis
# Linux: sudo systemctl start redis-server
```

### Frontend Build Errors
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. ✅ Explore the dashboard
2. ✅ Create more applications
3. ✅ Generate license keys
4. ✅ Test client integration
5. ✅ Read full documentation
6. ✅ Customize for your needs

## Documentation

- **README.md** - Main documentation
- **SETUP.md** - Detailed setup guide
- **API.md** - Complete API reference
- **SECURITY.md** - Security features
- **DEPLOYMENT.md** - Production deployment

## Support

Having issues? Check:
1. Console logs for errors
2. MongoDB is running
3. Redis is running
4. Environment variables are set
5. Ports are not in use

## Quick Tips

💡 **Tip 1**: Use the dashboard to manage everything  
💡 **Tip 2**: Keep your app secret secure  
💡 **Tip 3**: Test with the C# client first  
💡 **Tip 4**: Monitor the audit logs  
💡 **Tip 5**: Read the security documentation  

---

You're all set! Start building your secure application! 🚀
