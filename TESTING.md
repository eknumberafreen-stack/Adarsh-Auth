# Testing Guide

This guide covers how to test all features of the platform.

## Prerequisites

- ✅ Backend running on http://localhost:5000
- ✅ Frontend running on http://localhost:3000
- ✅ MongoDB running
- ✅ Redis running

## Manual Testing Checklist

### 1. Dashboard Authentication

#### Test Registration
- [ ] Navigate to http://localhost:3000/register
- [ ] Enter email: test@example.com
- [ ] Enter password: password123
- [ ] Enter confirm password: password123
- [ ] Click "Create Account"
- [ ] **Expected**: Redirected to dashboard
- [ ] **Expected**: Toast notification "Registration successful"

#### Test Login
- [ ] Navigate to http://localhost:3000/login
- [ ] Enter email: test@example.com
- [ ] Enter password: password123
- [ ] Click "Sign In"
- [ ] **Expected**: Redirected to dashboard
- [ ] **Expected**: Toast notification "Login successful"

#### Test Invalid Login
- [ ] Navigate to http://localhost:3000/login
- [ ] Enter email: test@example.com
- [ ] Enter password: wrongpassword
- [ ] Click "Sign In"
- [ ] **Expected**: Error message "Invalid credentials"
- [ ] **Expected**: Remain on login page

#### Test Account Lockout
- [ ] Attempt login with wrong password 5 times
- [ ] **Expected**: After 5 attempts, see "Account temporarily locked"
- [ ] Wait 15 minutes or reset in database
- [ ] **Expected**: Can login again

#### Test Logout
- [ ] Click "Logout" in sidebar
- [ ] **Expected**: Redirected to login page
- [ ] **Expected**: Toast notification "Logged out successfully"

### 2. Application Management

#### Test Create Application
- [ ] Navigate to "Applications" page
- [ ] Click "Create Application"
- [ ] Enter name: "Test App"
- [ ] Enter version: "1.0.0"
- [ ] Click "Create"
- [ ] **Expected**: Application appears in list
- [ ] **Expected**: Toast notification "Application created successfully"

#### Test View Credentials
- [ ] Click "Credentials" button on application
- [ ] **Expected**: Modal shows Owner ID and App Secret
- [ ] Click copy button for Owner ID
- [ ] **Expected**: Toast notification "Copied to clipboard"
- [ ] Click copy button for App Secret
- [ ] **Expected**: Toast notification "Copied to clipboard"

#### Test Pause Application
- [ ] Click pause button on application
- [ ] **Expected**: Status changes to "paused"
- [ ] **Expected**: Badge color changes to yellow
- [ ] **Expected**: Toast notification "Application paused"

#### Test Resume Application
- [ ] Click play button on paused application
- [ ] **Expected**: Status changes to "active"
- [ ] **Expected**: Badge color changes to green
- [ ] **Expected**: Toast notification "Application active"

#### Test Regenerate Secret
- [ ] Click "Credentials" button
- [ ] Click "Regenerate Secret"
- [ ] Confirm the action
- [ ] **Expected**: New secret displayed
- [ ] **Expected**: Toast notification about session invalidation

#### Test Delete Application
- [ ] Click delete button on application
- [ ] Confirm the action
- [ ] **Expected**: Application removed from list
- [ ] **Expected**: Toast notification "Application deleted successfully"

### 3. License Management

#### Test Generate Lifetime License
- [ ] Navigate to "Licenses" page
- [ ] Select an application
- [ ] Click "Generate Licenses"
- [ ] Select "Lifetime" expiry type
- [ ] Set count to 1
- [ ] Click "Generate"
- [ ] **Expected**: License appears in list
- [ ] **Expected**: Format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX

#### Test Generate Fixed-Day License
- [ ] Click "Generate Licenses"
- [ ] Select "Fixed Days" expiry type
- [ ] Set days to 30
- [ ] Set count to 5
- [ ] Click "Generate"
- [ ] **Expected**: 5 licenses appear in list
- [ ] **Expected**: Each shows "30 days" type

#### Test Copy License Key
- [ ] Click on a license key
- [ ] **Expected**: Toast notification "Copied to clipboard"
- [ ] Paste somewhere to verify

#### Test Revoke License
- [ ] Click revoke button on unused license
- [ ] Confirm the action
- [ ] **Expected**: License shows "Revoked" badge
- [ ] **Expected**: Toast notification "License revoked successfully"

#### Test Delete License
- [ ] Click delete button on license
- [ ] Confirm the action
- [ ] **Expected**: License removed from list
- [ ] **Expected**: Toast notification "License deleted successfully"

### 4. Client API Testing

#### Test Initialize
```bash
curl -X POST http://localhost:5000/api/client/init \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "Test App",
    "owner_id": "your_owner_id",
    "timestamp": 1234567890123,
    "nonce": "random_string",
    "signature": "calculated_signature"
  }'
```
- [ ] **Expected**: 200 OK with success message

#### Test Register with C# Client
- [ ] Open C# client
- [ ] Configure with your credentials
- [ ] Select option 1 (Register)
- [ ] Enter username: testuser
- [ ] Enter password: password123
- [ ] Enter license key from dashboard
- [ ] **Expected**: "Registration successful"
- [ ] **Expected**: Heartbeat starts

#### Test Login with C# Client
- [ ] Run C# client again
- [ ] Select option 2 (Login)
- [ ] Enter username: testuser
- [ ] Enter password: password123
- [ ] **Expected**: "Login successful"
- [ ] **Expected**: Heartbeat starts

#### Test Invalid License
- [ ] Try to register with invalid license key
- [ ] **Expected**: Error "Invalid or expired license"

#### Test HWID Mismatch
- [ ] Login on one machine
- [ ] Try to login with same credentials on different machine
- [ ] **Expected**: Error "HWID mismatch"

### 5. User Management

#### Test View Users
- [ ] Navigate to "Users" page
- [ ] Select an application
- [ ] **Expected**: See list of registered users
- [ ] **Expected**: See user details (username, HWID, last login, etc.)

#### Test Ban User
- [ ] Click ban button on a user
- [ ] **Expected**: User shows "Banned" badge
- [ ] **Expected**: Toast notification "User banned"
- [ ] Try to login with that user
- [ ] **Expected**: Error "Account is banned"

#### Test Unban User
- [ ] Click unban button on banned user
- [ ] **Expected**: "Banned" badge removed
- [ ] **Expected**: Toast notification "User unbanned"
- [ ] Try to login with that user
- [ ] **Expected**: Login successful

#### Test Reset HWID
- [ ] Click reset HWID button
- [ ] Confirm the action
- [ ] **Expected**: HWID shows "Not set"
- [ ] **Expected**: Toast notification "HWID reset successfully"
- [ ] Try to login from different machine
- [ ] **Expected**: Login successful (new HWID captured)

#### Test Delete User
- [ ] Click delete button on user
- [ ] Confirm the action
- [ ] **Expected**: User removed from list
- [ ] **Expected**: Toast notification "User deleted successfully"

### 6. Session Management

#### Test View Sessions
- [ ] Navigate to "Sessions" page
- [ ] Select an application
- [ ] **Expected**: See list of active sessions
- [ ] **Expected**: See session details (IP, HWID, heartbeat, etc.)

#### Test Terminate Session
- [ ] Click delete button on a session
- [ ] **Expected**: Session removed from list
- [ ] **Expected**: Toast notification "Session terminated successfully"
- [ ] Client should detect session termination

#### Test Terminate All Sessions
- [ ] Click "Terminate All" button
- [ ] Confirm the action
- [ ] **Expected**: All sessions removed
- [ ] **Expected**: Toast notification with count
- [ ] All clients should be disconnected

### 7. Security Testing

#### Test Rate Limiting
- [ ] Make 100+ requests to /api/auth/login quickly
- [ ] **Expected**: After limit, receive 429 error
- [ ] **Expected**: Error message "Too many requests"

#### Test Invalid Signature
- [ ] Send client API request with wrong signature
- [ ] **Expected**: 401 error "Invalid signature"
- [ ] **Expected**: Event logged in audit log

#### Test Replay Attack
- [ ] Capture a valid client API request
- [ ] Send the same request again
- [ ] **Expected**: 401 error "Invalid request"
- [ ] **Expected**: Replay attack logged

#### Test Timestamp Validation
- [ ] Send request with old timestamp (>30 seconds)
- [ ] **Expected**: 401 error "Invalid request"
- [ ] **Expected**: Event logged

#### Test SQL Injection
- [ ] Try to login with email: `admin' OR '1'='1`
- [ ] **Expected**: Login fails safely
- [ ] **Expected**: No database error

#### Test XSS
- [ ] Try to create application with name: `<script>alert('xss')</script>`
- [ ] **Expected**: Script not executed
- [ ] **Expected**: Name sanitized or rejected

### 8. Performance Testing

#### Test Concurrent Logins
- [ ] Open 10 browser tabs
- [ ] Login simultaneously in all tabs
- [ ] **Expected**: All logins succeed
- [ ] **Expected**: No errors or crashes

#### Test Large License Generation
- [ ] Generate 100 licenses at once
- [ ] **Expected**: All licenses generated
- [ ] **Expected**: Reasonable response time (<5 seconds)

#### Test Session Heartbeat
- [ ] Login with client
- [ ] Wait 30 seconds
- [ ] **Expected**: Heartbeat sent automatically
- [ ] **Expected**: Session remains active

### 9. Error Handling

#### Test Network Error
- [ ] Stop backend server
- [ ] Try to login from frontend
- [ ] **Expected**: Error message displayed
- [ ] **Expected**: No crash or blank screen

#### Test Database Error
- [ ] Stop MongoDB
- [ ] Try to login
- [ ] **Expected**: Generic error message
- [ ] **Expected**: Error logged

#### Test Redis Error
- [ ] Stop Redis
- [ ] Try to login
- [ ] **Expected**: Generic error message
- [ ] **Expected**: Error logged

### 10. Dashboard UI Testing

#### Test Responsive Design
- [ ] Resize browser window to mobile size
- [ ] **Expected**: UI adapts to small screen
- [ ] **Expected**: All features accessible

#### Test Navigation
- [ ] Click each sidebar item
- [ ] **Expected**: Correct page loads
- [ ] **Expected**: Active item highlighted

#### Test Toast Notifications
- [ ] Perform various actions
- [ ] **Expected**: Toast appears for each action
- [ ] **Expected**: Toast auto-dismisses after 3-5 seconds

#### Test Loading States
- [ ] Refresh pages
- [ ] **Expected**: Loading spinner shown
- [ ] **Expected**: Content loads smoothly

## Automated Testing (Future)

### Unit Tests
```bash
# Backend
npm test

# Frontend
cd frontend && npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## Performance Benchmarks

### Expected Response Times
- Login: <500ms
- Create application: <300ms
- Generate license: <200ms
- List users: <400ms
- API requests: <100ms

### Load Testing
```bash
# Install Apache Bench
apt-get install apache2-utils

# Test login endpoint
ab -n 1000 -c 10 -p login.json -T application/json http://localhost:5000/api/auth/login
```

## Security Audit

### Tools to Use
- [ ] OWASP ZAP - Security scanning
- [ ] Burp Suite - Penetration testing
- [ ] npm audit - Dependency vulnerabilities
- [ ] Snyk - Security monitoring

### Commands
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Check frontend
cd frontend && npm audit
```

## Monitoring

### Health Check
```bash
curl http://localhost:5000/health
```
**Expected**: `{"status":"ok","timestamp":...}`

### Check Logs
```bash
# Backend logs
pm2 logs auth-backend

# Frontend logs
pm2 logs auth-frontend

# MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Nginx logs
tail -f /var/log/nginx/access.log
```

## Test Data Cleanup

### Reset Database
```bash
mongosh
use saas_auth_platform
db.dropDatabase()
```

### Clear Redis
```bash
redis-cli
FLUSHALL
```

### Reset Application
```bash
# Stop services
pm2 stop all

# Clear data
mongosh --eval "use saas_auth_platform; db.dropDatabase()"
redis-cli FLUSHALL

# Restart services
pm2 start all
```

## Bug Reporting

When reporting bugs, include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Screenshots (if applicable)
5. Browser/OS information
6. Console errors
7. Network requests (from DevTools)

## Test Coverage Goals

- [ ] 80%+ code coverage
- [ ] All critical paths tested
- [ ] All security features verified
- [ ] All API endpoints tested
- [ ] All UI components tested
- [ ] Error handling verified
- [ ] Performance benchmarks met

---

## Quick Test Script

Run this to test basic functionality:

```bash
#!/bin/bash

echo "Testing health endpoint..."
curl -s http://localhost:5000/health | grep -q "ok" && echo "✓ Health check passed" || echo "✗ Health check failed"

echo "Testing frontend..."
curl -s http://localhost:3000 | grep -q "html" && echo "✓ Frontend accessible" || echo "✗ Frontend failed"

echo "Testing MongoDB..."
mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1 && echo "✓ MongoDB running" || echo "✗ MongoDB failed"

echo "Testing Redis..."
redis-cli ping > /dev/null 2>&1 && echo "✓ Redis running" || echo "✗ Redis failed"

echo ""
echo "Basic tests complete!"
```

Save as `test.sh`, make executable with `chmod +x test.sh`, and run with `./test.sh`.

---

Happy testing! 🧪
