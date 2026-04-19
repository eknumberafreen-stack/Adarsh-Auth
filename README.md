# SaaS Authentication & Licensing Platform

A production-ready, secure authentication and licensing platform similar to KeyAuth, built with modern technologies and strong security practices.

## 🎯 Features

### Core Systems
- **User Authentication**: Secure registration/login with JWT tokens
- **Application Management**: Create and manage multiple applications
- **License System**: Generate, redeem, and manage license keys
- **User Management**: Ban/unban users, reset HWID, track activity
- **Session Management**: Active session monitoring with heartbeat
- **Audit Logging**: Track all security events and suspicious activity

### Security Features
- ✅ HMAC SHA256 signature verification
- ✅ Replay attack prevention (timestamp + nonce validation)
- ✅ Rate limiting (global + per-endpoint + per-application)
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ JWT access + refresh tokens
- ✅ HWID locking
- ✅ Session expiration and heartbeat monitoring
- ✅ Request validation and sanitization
- ✅ Audit logging for security events
- ✅ Account lockout after failed attempts

## 🧱 Tech Stack

### Backend
- **Node.js** + **Express**: REST API server
- **MongoDB** + **Mongoose**: Database and ODM
- **Redis**: Rate limiting, nonce storage, sessions
- **JWT**: Token-based authentication
- **bcrypt**: Password hashing
- **Helmet**: Security headers
- **Joi**: Request validation

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Modern styling
- **Zustand**: State management
- **Axios**: HTTP client
- **React Hot Toast**: Notifications

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- MongoDB 5+
- Redis 6+

### Backend Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
```

Edit `.env` and set your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/saas_auth_platform
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_ACCESS_SECRET=your-super-secret-access-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
BCRYPT_ROUNDS=12
FRONTEND_URL=http://localhost:3000
```

3. **Start the server**:
```bash
npm run server
```

### Frontend Setup

1. **Navigate to frontend**:
```bash
cd frontend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment**:
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

4. **Start development server**:
```bash
npm run dev
```

5. **Access the dashboard**:
Open [http://localhost:3000](http://localhost:3000)

## 🚀 Quick Start

### 1. Register an Account
- Navigate to [http://localhost:3000/register](http://localhost:3000/register)
- Create your account with email and password

### 2. Create an Application
- Go to **Applications** page
- Click **Create Application**
- Enter name and version
- Save the **Owner ID** and **App Secret** (you'll need these for client integration)

### 3. Generate License Keys
- Go to **Licenses** page
- Select your application
- Click **Generate Licenses**
- Choose expiry type (lifetime or fixed days)
- Generate keys

### 4. Integrate Client
Use the provided C# client example or implement your own:

```csharp
var client = new AuthClient(apiUrl, appName, ownerId, appSecret);

// Initialize
await client.Initialize();

// Register with license
await client.Register(username, password, licenseKey);

// Or login
await client.Login(username, password);
```

## 🔐 API Security

### Request Signing

All client API requests must include:

```json
{
  "app_name": "Your App",
  "owner_id": "abc123...",
  "timestamp": 1234567890123,
  "nonce": "random-unique-string",
  "signature": "hmac-sha256-signature",
  "...": "your data"
}
```

**Signature Calculation**:
```
data = app_name + owner_id + timestamp + nonce + JSON(body)
signature = HMAC_SHA256(data, app_secret)
```

### Server Validation

The server validates:
1. ✅ Application exists and is active
2. ✅ Timestamp is within ±30 seconds
3. ✅ Nonce hasn't been used before (stored in Redis)
4. ✅ Signature matches expected value
5. ✅ Rate limits not exceeded

## 📡 Client API Endpoints

### POST /api/client/init
Check if application is active

### POST /api/client/register
Register new user with license key
```json
{
  "username": "user123",
  "password": "password",
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "hwid": "hardware-id"
}
```

### POST /api/client/login
Login existing user
```json
{
  "username": "user123",
  "password": "password",
  "hwid": "hardware-id"
}
```

### POST /api/client/validate
Validate session token
```json
{
  "session_token": "token",
  "hwid": "hardware-id"
}
```

### POST /api/client/heartbeat
Keep session alive (call every 30 seconds)
```json
{
  "session_token": "token",
  "hwid": "hardware-id"
}
```

## 🎨 Dashboard Features

### Applications Page
- Create/delete applications
- Pause/resume applications
- View credentials (Owner ID, App Secret)
- Regenerate app secret

### Licenses Page
- Generate license keys (lifetime or fixed days)
- View license status (unused/used/revoked)
- Revoke licenses
- Copy keys to clipboard

### Users Page
- View all users per application
- Ban/unban users
- Reset HWID
- Track last login and IP

### Sessions Page
- Monitor active sessions
- View session details (IP, HWID, heartbeat)
- Terminate individual or all sessions

## 🛡️ Security Best Practices

### Production Deployment

1. **Environment Variables**:
   - Use strong, random secrets for JWT
   - Never commit `.env` files
   - Rotate secrets regularly

2. **HTTPS Only**:
   - Use SSL/TLS certificates
   - Redirect HTTP to HTTPS
   - Enable HSTS headers

3. **Database Security**:
   - Use MongoDB authentication
   - Enable Redis password
   - Regular backups
   - Network isolation

4. **Rate Limiting**:
   - Adjust limits based on your needs
   - Monitor for abuse patterns
   - Implement IP blocking for repeat offenders

5. **Monitoring**:
   - Set up audit log alerts
   - Monitor failed authentication attempts
   - Track suspicious activity

## 📁 Project Structure

```
.
├── backend/
│   ├── config/          # Database and Redis configuration
│   ├── middleware/      # Auth, validation, rate limiting
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API endpoints
│   └── server.js        # Express server
├── frontend/
│   ├── app/             # Next.js pages
│   ├── lib/             # API client and state management
│   └── components/      # React components
├── client-examples/
│   └── csharp/          # C# client implementation
├── .env.example         # Environment template
└── README.md
```

## 🔧 Development

### Run Both Servers
```bash
npm run dev
```

### Backend Only
```bash
npm run server
```

### Frontend Only
```bash
npm run client
```

## 📚 Complete Documentation

This project includes comprehensive documentation:

- **[INDEX.md](INDEX.md)** - Documentation index and navigation guide
- **[OVERVIEW.md](OVERVIEW.md)** - High-level platform overview
- **[QUICK_START.md](QUICK_START.md)** - Get running in 5 minutes
- **[SETUP.md](SETUP.md)** - Detailed installation guide
- **[FEATURES.md](FEATURES.md)** - Complete feature list (50+)
- **[API.md](API.md)** - Complete API reference
- **[SECURITY.md](SECURITY.md)** - Security features and best practices
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[TESTING.md](TESTING.md)** - Testing guide and checklist
- **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** - Code organization
- **[SUMMARY.md](SUMMARY.md)** - Project summary and deliverables

### Installation Scripts
- `install.sh` - Automated installation (Linux/Mac)
- `install.bat` - Automated installation (Windows)

## 📝 License

MIT License - feel free to use this in your projects!

## ⚠️ Important Notes

- **Change all secrets** in production
- **Enable HTTPS** for production deployment
- **Implement proper HWID** detection in your client
- **Monitor audit logs** regularly
- **Keep dependencies updated**
- **Test thoroughly** before production use

## 🤝 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ for secure software licensing
