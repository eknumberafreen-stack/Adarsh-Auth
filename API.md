# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

### Dashboard API
Uses JWT Bearer tokens in Authorization header:
```
Authorization: Bearer <access_token>
```

### Client API
Uses HMAC SHA256 signature verification. See [Client API Security](#client-api-security) section.

---

## Dashboard API Endpoints

### Authentication

#### POST /auth/register
Register a new dashboard user.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "message": "Registration successful",
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "user": {
    "id": "user_id",
    "email": "user@example.com"
  }
}
```

#### POST /auth/login
Login to dashboard.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "message": "Login successful",
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "user": {
    "id": "user_id",
    "email": "user@example.com"
  }
}
```

#### POST /auth/refresh
Refresh access token.

**Request**:
```json
{
  "refreshToken": "refresh_token"
}
```

**Response**:
```json
{
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

#### POST /auth/logout
Logout (requires authentication).

**Response**:
```json
{
  "message": "Logout successful"
}
```

### Applications

#### GET /applications
Get all applications for authenticated user.

**Response**:
```json
{
  "applications": [
    {
      "_id": "app_id",
      "name": "My App",
      "version": "1.0.0",
      "status": "active",
      "userCount": 10,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /applications/:id
Get single application with credentials.

**Response**:
```json
{
  "application": {
    "_id": "app_id",
    "name": "My App",
    "ownerId": "abc123...",
    "appSecret": "secret123...",
    "version": "1.0.0",
    "status": "active",
    "userCount": 10
  }
}
```

#### POST /applications
Create new application.

**Request**:
```json
{
  "name": "My Application",
  "version": "1.0.0"
}
```

**Response**:
```json
{
  "message": "Application created successfully",
  "application": {
    "_id": "app_id",
    "name": "My Application",
    "ownerId": "generated_owner_id",
    "appSecret": "generated_secret",
    "version": "1.0.0",
    "status": "active"
  }
}
```

#### PATCH /applications/:id
Update application.

**Request**:
```json
{
  "name": "Updated Name",
  "version": "1.1.0",
  "status": "paused"
}
```

#### POST /applications/:id/regenerate-secret
Regenerate app secret (invalidates all sessions).

**Response**:
```json
{
  "message": "App secret regenerated successfully",
  "appSecret": "new_secret"
}
```

#### DELETE /applications/:id
Delete application and all related data.

### Licenses

#### POST /licenses/generate
Generate license keys.

**Request**:
```json
{
  "applicationId": "app_id",
  "expiryType": "days",
  "expiryDays": 30,
  "count": 5
}
```

**Response**:
```json
{
  "message": "5 license(s) generated successfully",
  "licenses": [
    {
      "_id": "license_id",
      "key": "XXXX-XXXX-XXXX-XXXX",
      "expiryType": "days",
      "expiryDays": 30,
      "used": false
    }
  ]
}
```

#### GET /licenses/application/:applicationId
Get all licenses for application.

**Response**:
```json
{
  "licenses": [
    {
      "_id": "license_id",
      "key": "XXXX-XXXX-XXXX-XXXX",
      "expiryType": "lifetime",
      "used": true,
      "usedBy": {
        "username": "user123"
      },
      "usedAt": "2024-01-01T00:00:00.000Z",
      "revoked": false
    }
  ]
}
```

#### POST /licenses/:id/revoke
Revoke a license.

**Response**:
```json
{
  "message": "License revoked successfully",
  "license": { ... }
}
```

#### DELETE /licenses/:id
Delete a license.

### Users

#### GET /users/application/:applicationId
Get all users for application.

**Response**:
```json
{
  "users": [
    {
      "_id": "user_id",
      "username": "user123",
      "hwid": "hardware_id",
      "lastLogin": "2024-01-01T00:00:00.000Z",
      "lastIp": "192.168.1.1",
      "expiryDate": "2024-02-01T00:00:00.000Z",
      "banned": false
    }
  ]
}
```

#### POST /users/:id/ban
Ban a user.

#### POST /users/:id/unban
Unban a user.

#### POST /users/:id/reset-hwid
Reset user's HWID.

#### DELETE /users/:id
Delete a user.

### Sessions

#### GET /sessions/application/:applicationId
Get all active sessions for application.

**Response**:
```json
{
  "sessions": [
    {
      "_id": "session_id",
      "userId": {
        "username": "user123"
      },
      "ip": "192.168.1.1",
      "hwid": "hardware_id",
      "lastHeartbeat": "2024-01-01T00:00:00.000Z",
      "expiresAt": "2024-01-02T00:00:00.000Z"
    }
  ]
}
```

#### DELETE /sessions/:id
Terminate a session.

#### DELETE /sessions/application/:applicationId/all
Terminate all sessions for application.

---

## Client API Endpoints

### Client API Security

All client requests must include:
- `app_name`: Application name
- `owner_id`: Application owner ID
- `timestamp`: Current Unix timestamp (milliseconds)
- `nonce`: Random unique string
- `signature`: HMAC SHA256 signature

**Signature Calculation**:
```
data = app_name + owner_id + timestamp + nonce + JSON(body_data)
signature = HMAC_SHA256(data, app_secret)
```

**Example Request**:
```json
{
  "app_name": "My Application",
  "owner_id": "abc123...",
  "timestamp": 1234567890123,
  "nonce": "random_string",
  "signature": "hmac_signature",
  "username": "user123",
  "password": "password"
}
```

### POST /client/init
Check if application is active.

**Request**:
```json
{
  "app_name": "My Application",
  "owner_id": "abc123...",
  "timestamp": 1234567890123,
  "nonce": "random_string",
  "signature": "hmac_signature"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Application is active",
  "version": "1.0.0"
}
```

### POST /client/register
Register new user with license key.

**Request**:
```json
{
  "app_name": "My Application",
  "owner_id": "abc123...",
  "timestamp": 1234567890123,
  "nonce": "random_string",
  "signature": "hmac_signature",
  "username": "user123",
  "password": "password",
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "hwid": "hardware_id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Registration successful",
  "sessionToken": "session_token",
  "expiryDate": "2024-02-01T00:00:00.000Z"
}
```

### POST /client/login
Login existing user.

**Request**:
```json
{
  "app_name": "My Application",
  "owner_id": "abc123...",
  "timestamp": 1234567890123,
  "nonce": "random_string",
  "signature": "hmac_signature",
  "username": "user123",
  "password": "password",
  "hwid": "hardware_id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "sessionToken": "session_token",
  "expiryDate": "2024-02-01T00:00:00.000Z"
}
```

### POST /client/validate
Validate session token.

**Request**:
```json
{
  "app_name": "My Application",
  "owner_id": "abc123...",
  "timestamp": 1234567890123,
  "nonce": "random_string",
  "signature": "hmac_signature",
  "session_token": "session_token",
  "hwid": "hardware_id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Session is valid",
  "expiryDate": "2024-02-01T00:00:00.000Z"
}
```

### POST /client/heartbeat
Keep session alive (call every 30 seconds).

**Request**:
```json
{
  "app_name": "My Application",
  "owner_id": "abc123...",
  "timestamp": 1234567890123,
  "nonce": "random_string",
  "signature": "hmac_signature",
  "session_token": "session_token",
  "hwid": "hardware_id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Heartbeat received"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": ["Field is required"]
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid credentials"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests"
}
```

### 500 Internal Server Error
```json
{
  "error": "An error occurred"
}
```

---

## Rate Limits

- **Global**: 100 requests per 15 minutes per IP
- **Auth Endpoints**: 10 requests per 15 minutes per IP
- **Client API**: 30 requests per minute per IP+Application

---

## Security Notes

1. Always use HTTPS in production
2. Keep app secrets secure
3. Never expose credentials in client code
4. Implement proper HWID detection
5. Handle errors gracefully
6. Validate all server responses
7. Use secure storage for tokens
8. Implement request timeout
9. Log security events
10. Monitor for suspicious activity
