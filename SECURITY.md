# Security Documentation

## Overview

This platform implements multiple layers of security to protect against common attacks and unauthorized access.

## Security Features

### 1. Request Signature Verification (HMAC SHA256)

**Purpose**: Prevent request tampering and ensure authenticity

**Implementation**:
- Every client request includes a signature
- Signature = HMAC SHA256 of (app_name + owner_id + timestamp + nonce + body)
- Server recomputes signature and compares using constant-time comparison
- Prevents timing attacks

**Code Location**: `backend/middleware/clientAuth.js`

### 2. Replay Attack Prevention

**Purpose**: Prevent reuse of captured requests

**Implementation**:
- **Timestamp Validation**: Requests must be within ±30 seconds of server time
- **Nonce Validation**: Each nonce can only be used once
- Nonces stored in Redis with 60-second TTL
- Rejected nonces logged as critical security events

**Protection Against**:
- Man-in-the-middle attacks
- Request replay attacks
- Time-based attacks

### 3. Rate Limiting

**Purpose**: Prevent brute force and DoS attacks

**Levels**:
1. **Global**: 100 requests per 15 minutes per IP
2. **Auth Endpoints**: 10 requests per 15 minutes per IP
3. **Client API**: 30 requests per minute per IP+Application

**Implementation**: Redis-backed rate limiting with `express-rate-limit`

### 4. Password Security

**Hashing**:
- Algorithm: bcrypt
- Rounds: 12 (configurable via BCRYPT_ROUNDS)
- Salt: Automatically generated per password

**Password Requirements**:
- Minimum 8 characters
- Validated on both client and server

**Account Lockout**:
- Max failed attempts: 5 (configurable)
- Lockout duration: 15 minutes (configurable)
- Automatic reset after successful login

### 5. JWT Token Security

**Access Tokens**:
- Short-lived (15 minutes default)
- Used for API authentication
- Stored in memory (not localStorage)

**Refresh Tokens**:
- Long-lived (7 days default)
- Used to obtain new access tokens
- Stored securely
- Rotated on each refresh
- Invalidated on logout

**Token Validation**:
- Signature verification
- Expiry check
- User existence check

### 6. HWID Locking

**Purpose**: Bind user accounts to specific hardware

**Implementation**:
- HWID captured on first login
- Subsequent logins must match stored HWID
- Mismatch logged as critical security event
- Admin can reset HWID via dashboard

**Protection Against**:
- Account sharing
- Credential theft
- Unauthorized access

### 7. Session Management

**Features**:
- Session tokens generated with crypto.randomBytes(32)
- Sessions stored in MongoDB with expiry
- Automatic cleanup of expired sessions
- Heartbeat mechanism (30-second intervals)
- Session invalidation on:
  - User ban
  - HWID reset
  - App secret regeneration
  - Manual termination

### 8. Input Validation

**Library**: Joi

**Validation Points**:
- All request bodies
- Query parameters
- Path parameters

**Protections**:
- SQL/NoSQL injection prevention
- XSS prevention
- Type validation
- Length limits
- Format validation

### 9. Audit Logging

**Logged Events**:
- Login attempts (success/failure)
- Registration
- License redemption
- HWID mismatches
- Invalid signatures
- Replay attacks
- Rate limit violations
- Suspicious activity

**Log Retention**: 90 days (auto-deleted)

**Severity Levels**:
- **Info**: Normal operations
- **Warning**: Failed attempts, minor issues
- **Critical**: Security violations, attacks

### 10. Response Hardening

**Techniques**:
- Generic error messages in production
- No stack traces exposed
- Random delay (100-500ms) on failed auth
- No verbose error details
- Consistent response times

**Purpose**: Prevent information leakage

## Attack Mitigations

### Brute Force Attacks
- ✅ Rate limiting
- ✅ Account lockout
- ✅ Random delays
- ✅ Audit logging

### Replay Attacks
- ✅ Timestamp validation
- ✅ Nonce validation
- ✅ Signature verification

### Man-in-the-Middle
- ✅ HMAC signatures
- ✅ HTTPS required (production)
- ✅ Timestamp validation

### SQL/NoSQL Injection
- ✅ Mongoose ODM
- ✅ Input validation
- ✅ Parameterized queries

### XSS (Cross-Site Scripting)
- ✅ Input sanitization
- ✅ Output encoding
- ✅ Content Security Policy (Helmet)

### CSRF (Cross-Site Request Forgery)
- ✅ CORS configuration
- ✅ Token-based auth
- ✅ SameSite cookies

### DoS (Denial of Service)
- ✅ Rate limiting
- ✅ Request size limits
- ✅ Connection limits

### Timing Attacks
- ✅ Constant-time comparison
- ✅ Random delays
- ✅ Consistent response times

## Security Headers (Helmet)

```javascript
helmet() // Enables:
- X-DNS-Prefetch-Control
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Strict-Transport-Security
- Content-Security-Policy
```

## Environment Security

### Development
```env
NODE_ENV=development
# Detailed errors
# Stack traces visible
# Verbose logging
```

### Production
```env
NODE_ENV=production
# Generic errors only
# No stack traces
# Minimal logging
```

## Database Security

### MongoDB
- ✅ Connection string in environment variable
- ✅ Authentication enabled (production)
- ✅ Network isolation
- ✅ Regular backups
- ✅ Encrypted connections

### Redis
- ✅ Password protection (production)
- ✅ Network isolation
- ✅ Key expiration
- ✅ Memory limits

## API Security Checklist

- [x] HTTPS only (production)
- [x] CORS configured
- [x] Rate limiting enabled
- [x] Input validation
- [x] Output sanitization
- [x] Authentication required
- [x] Authorization checks
- [x] Audit logging
- [x] Error handling
- [x] Security headers

## Client Security

### C# Client
- ✅ Secure random nonce generation
- ✅ HMAC signature calculation
- ✅ HTTPS communication
- ✅ Credential protection
- ✅ Session management
- ✅ Heartbeat mechanism

### Best Practices
1. **Never hardcode secrets** in client code
2. **Obfuscate** client binaries
3. **Validate** server responses
4. **Handle errors** gracefully
5. **Implement** proper HWID detection
6. **Use** secure storage for tokens

## Incident Response

### Suspicious Activity Detection
1. Monitor audit logs for:
   - Multiple failed login attempts
   - Invalid signatures
   - Replay attacks
   - HWID mismatches
   - Rate limit violations

2. Automated responses:
   - Account lockout
   - Session termination
   - IP blocking (manual)

3. Manual investigation:
   - Review audit logs
   - Check user activity
   - Verify application status

### Security Event Workflow
```
Event Detected → Logged → Severity Assessed → Action Taken → Admin Notified
```

## Compliance Considerations

### Data Protection
- Passwords hashed (never stored plaintext)
- Sensitive data encrypted in transit (HTTPS)
- Audit logs for accountability
- User data deletion capability

### GDPR Compliance
- User data export (implement if needed)
- Right to deletion (user deletion endpoint exists)
- Data minimization (only necessary data collected)
- Audit trail

## Security Maintenance

### Regular Tasks
- [ ] Update dependencies monthly
- [ ] Review audit logs weekly
- [ ] Rotate JWT secrets quarterly
- [ ] Test backup restoration monthly
- [ ] Security audit annually

### Monitoring
- Failed authentication attempts
- Rate limit violations
- Unusual traffic patterns
- Database performance
- Redis memory usage

## Vulnerability Disclosure

If you discover a security vulnerability:
1. **Do not** open a public issue
2. Email security contact (set up dedicated email)
3. Provide detailed description
4. Allow time for fix before disclosure

## Security Updates

Keep these dependencies updated:
- express
- mongoose
- jsonwebtoken
- bcrypt
- helmet
- joi
- redis

Run regularly:
```bash
npm audit
npm audit fix
```

## Additional Recommendations

### Production Deployment
1. Use environment-specific secrets
2. Enable MongoDB authentication
3. Set Redis password
4. Configure firewall rules
5. Use reverse proxy (nginx)
6. Enable SSL/TLS
7. Set up monitoring
8. Configure automated backups
9. Implement log aggregation
10. Set up alerting

### Code Security
1. Regular security audits
2. Dependency scanning
3. Static code analysis
4. Penetration testing
5. Code reviews

---

**Remember**: Security is an ongoing process, not a one-time setup. Stay vigilant and keep systems updated.
