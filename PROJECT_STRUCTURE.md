# Project Structure

```
saas-auth-platform/
│
├── backend/                          # Backend Node.js/Express server
│   ├── config/                       # Configuration files
│   │   ├── database.js              # MongoDB connection
│   │   └── redis.js                 # Redis connection
│   │
│   ├── middleware/                   # Express middleware
│   │   ├── auth.js                  # JWT authentication
│   │   ├── clientAuth.js            # Client API signature verification
│   │   ├── errorHandler.js          # Error handling
│   │   ├── rateLimiter.js           # Rate limiting
│   │   └── validation.js            # Request validation (Joi)
│   │
│   ├── models/                       # Mongoose models
│   │   ├── Application.js           # Application schema
│   │   ├── AppUser.js               # Application user schema
│   │   ├── AuditLog.js              # Audit log schema
│   │   ├── License.js               # License key schema
│   │   ├── Session.js               # Session schema
│   │   └── User.js                  # Dashboard user schema
│   │
│   ├── routes/                       # API routes
│   │   ├── application.js           # Application management
│   │   ├── auth.js                  # Dashboard authentication
│   │   ├── clientAuth.js            # Client API endpoints
│   │   ├── license.js               # License management
│   │   ├── session.js               # Session management
│   │   └── user.js                  # User management
│   │
│   └── server.js                     # Express server entry point
│
├── frontend/                         # Next.js frontend
│   ├── app/                          # Next.js App Router
│   │   ├── dashboard/               # Dashboard pages
│   │   │   ├── applications/        # Applications page
│   │   │   ├── licenses/            # Licenses page
│   │   │   ├── sessions/            # Sessions page
│   │   │   ├── settings/            # Settings page
│   │   │   ├── users/               # Users page
│   │   │   ├── layout.tsx           # Dashboard layout
│   │   │   └── page.tsx             # Dashboard home
│   │   │
│   │   ├── login/                   # Login page
│   │   ├── register/                # Register page
│   │   ├── globals.css              # Global styles
│   │   ├── layout.tsx               # Root layout
│   │   └── page.tsx                 # Home page (redirect)
│   │
│   ├── lib/                          # Utilities
│   │   ├── api.ts                   # Axios API client
│   │   └── store.ts                 # Zustand state management
│   │
│   ├── .env.local.example           # Frontend environment template
│   ├── next.config.js               # Next.js configuration
│   ├── package.json                 # Frontend dependencies
│   ├── postcss.config.js            # PostCSS configuration
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   └── tsconfig.json                # TypeScript configuration
│
├── client-examples/                  # Client implementation examples
│   └── csharp/                      # C# client
│       ├── AuthClient.cs            # C# authentication client
│       └── AuthClient.csproj        # C# project file
│
├── .env.example                      # Backend environment template
├── .gitignore                        # Git ignore rules
├── API.md                            # API documentation
├── package.json                      # Backend dependencies
├── PROJECT_STRUCTURE.md              # This file
├── README.md                         # Main documentation
├── SECURITY.md                       # Security documentation
└── SETUP.md                          # Setup instructions
```

## File Descriptions

### Backend Files

#### Configuration (`backend/config/`)
- **database.js**: MongoDB connection setup with error handling
- **redis.js**: Redis client initialization and connection management

#### Middleware (`backend/middleware/`)
- **auth.js**: JWT token verification for dashboard API
- **clientAuth.js**: HMAC signature verification for client API
- **errorHandler.js**: Centralized error handling and logging
- **rateLimiter.js**: Rate limiting configurations (global, auth, client)
- **validation.js**: Joi schemas for request validation

#### Models (`backend/models/`)
- **Application.js**: Application schema with credential generation
- **AppUser.js**: End-user schema with password hashing and HWID
- **AuditLog.js**: Security event logging with auto-expiry
- **License.js**: License key schema with redemption logic
- **Session.js**: Session management with heartbeat tracking
- **User.js**: Dashboard user schema with login attempts

#### Routes (`backend/routes/`)
- **application.js**: CRUD operations for applications
- **auth.js**: Dashboard user authentication (register/login/logout)
- **clientAuth.js**: Client API endpoints (init/register/login/validate/heartbeat)
- **license.js**: License generation and management
- **session.js**: Active session monitoring and termination
- **user.js**: End-user management (ban/unban/reset HWID)

#### Server (`backend/server.js`)
- Express server initialization
- Middleware setup
- Route mounting
- Database connections
- Error handling

### Frontend Files

#### Pages (`frontend/app/`)
- **page.tsx**: Root redirect to login or dashboard
- **layout.tsx**: Root layout with Toaster
- **login/page.tsx**: Login form
- **register/page.tsx**: Registration form
- **dashboard/page.tsx**: Dashboard home with statistics
- **dashboard/layout.tsx**: Dashboard layout with sidebar
- **dashboard/applications/page.tsx**: Application management
- **dashboard/licenses/page.tsx**: License management
- **dashboard/users/page.tsx**: User management
- **dashboard/sessions/page.tsx**: Session monitoring
- **dashboard/settings/page.tsx**: Account settings

#### Libraries (`frontend/lib/`)
- **api.ts**: Axios instance with interceptors for token refresh
- **store.ts**: Zustand stores for auth and application state

#### Styles (`frontend/app/`)
- **globals.css**: Global styles with Tailwind directives

#### Configuration
- **next.config.js**: Next.js configuration
- **tailwind.config.js**: Tailwind CSS theme and colors
- **tsconfig.json**: TypeScript compiler options
- **postcss.config.js**: PostCSS plugins

### Client Examples

#### C# Client (`client-examples/csharp/`)
- **AuthClient.cs**: Complete C# implementation with:
  - HMAC signature generation
  - Nonce generation
  - Timestamp handling
  - API request methods
  - Heartbeat mechanism
  - Example usage

### Documentation

- **README.md**: Main project documentation
- **SETUP.md**: Detailed setup instructions
- **API.md**: Complete API reference
- **SECURITY.md**: Security features and best practices
- **PROJECT_STRUCTURE.md**: This file

### Configuration Files

- **.env.example**: Backend environment variables template
- **.env.local.example**: Frontend environment variables template
- **.gitignore**: Files to exclude from Git
- **package.json**: Backend dependencies and scripts

## Key Technologies

### Backend
- **Express**: Web framework
- **Mongoose**: MongoDB ODM
- **Redis**: Caching and rate limiting
- **JWT**: Token-based authentication
- **bcrypt**: Password hashing
- **Helmet**: Security headers
- **Joi**: Request validation
- **crypto**: HMAC signature generation

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS
- **Zustand**: State management
- **Axios**: HTTP client
- **React Hot Toast**: Notifications

### Database
- **MongoDB**: Document database
- **Redis**: In-memory data store

## Data Flow

### Dashboard Authentication
```
User → Frontend → POST /api/auth/login → Backend
                                        ↓
                                   Verify Password
                                        ↓
                                   Generate JWT
                                        ↓
Frontend ← Access Token + Refresh Token ← Backend
```

### Client Authentication
```
Client → POST /api/client/login → Backend
                                     ↓
                              Verify Signature
                                     ↓
                              Check Timestamp
                                     ↓
                              Validate Nonce
                                     ↓
                              Verify Password
                                     ↓
                              Check HWID
                                     ↓
                              Create Session
                                     ↓
Client ← Session Token ← Backend
```

### License Redemption
```
Client → POST /api/client/register → Backend
                                       ↓
                                 Verify License
                                       ↓
                                 Create User
                                       ↓
                                 Mark License Used
                                       ↓
                                 Create Session
                                       ↓
Client ← Session Token ← Backend
```

## Security Layers

1. **Transport**: HTTPS (production)
2. **Authentication**: JWT (dashboard), HMAC (client)
3. **Authorization**: User ownership checks
4. **Validation**: Joi schemas
5. **Rate Limiting**: Redis-backed
6. **Audit Logging**: MongoDB
7. **Session Management**: Heartbeat + expiry
8. **HWID Locking**: Hardware binding

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- Redis for shared state
- MongoDB replica sets
- Load balancer ready

### Performance
- Database indexing
- Redis caching
- Connection pooling
- Efficient queries

### Monitoring
- Audit logs
- Error tracking
- Performance metrics
- Health checks

## Development Workflow

1. **Setup**: Install dependencies, configure environment
2. **Development**: Run dev servers with hot reload
3. **Testing**: Manual testing via dashboard and client
4. **Production**: Build frontend, deploy with PM2

## Deployment Architecture

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (Reverse   │
                    │   Proxy)    │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
         ┌────▼────┐              ┌────▼────┐
         │ Next.js │              │ Express │
         │Frontend │              │ Backend │
         └─────────┘              └────┬────┘
                                       │
                          ┌────────────┼────────────┐
                          │                         │
                     ┌────▼────┐              ┌────▼────┐
                     │ MongoDB │              │  Redis  │
                     └─────────┘              └─────────┘
```

## Future Enhancements

- [ ] WebSocket for real-time updates
- [ ] Email verification
- [ ] Two-factor authentication
- [ ] Webhook notifications
- [ ] Admin panel
- [ ] Analytics dashboard
- [ ] API rate limit tiers
- [ ] Custom HWID strategies
- [ ] Automated testing
- [ ] Docker containerization

---

This structure provides a solid foundation for a secure, scalable authentication and licensing platform.
