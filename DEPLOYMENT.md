# Production Deployment Guide

This guide covers deploying the SaaS Authentication Platform to production.

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Strong JWT secrets generated
- [ ] MongoDB authentication enabled
- [ ] Redis password set
- [ ] SSL certificates obtained
- [ ] Domain configured
- [ ] Firewall rules set
- [ ] Backup strategy planned
- [ ] Monitoring tools ready

## Server Requirements

### Minimum Specifications
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+

### Recommended Specifications
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS

## Step 1: Server Setup

### Update System
```bash
sudo apt update
sudo apt upgrade -y
```

### Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should be 18+
```

### Install MongoDB
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Install Redis
```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

## Step 2: MongoDB Security

### Enable Authentication
```bash
mongosh
```

```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "strong_password_here",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

use saas_auth_platform
db.createUser({
  user: "authapp",
  pwd: "another_strong_password",
  roles: [ { role: "readWrite", db: "saas_auth_platform" } ]
})
exit
```

### Configure MongoDB
Edit `/etc/mongod.conf`:
```yaml
security:
  authorization: enabled

net:
  bindIp: 127.0.0.1
  port: 27017
```

Restart MongoDB:
```bash
sudo systemctl restart mongod
```

## Step 3: Redis Security

### Set Password
Edit `/etc/redis/redis.conf`:
```conf
requirepass your_redis_password_here
bind 127.0.0.1
```

Restart Redis:
```bash
sudo systemctl restart redis-server
```

## Step 4: Application Deployment

### Clone/Upload Project
```bash
cd /var/www
sudo mkdir auth-platform
sudo chown $USER:$USER auth-platform
cd auth-platform

# Upload your files or clone from git
# git clone your-repo-url .
```

### Install Dependencies
```bash
# Backend
npm install --production

# Frontend
cd frontend
npm install --production
npm run build
cd ..
```

### Configure Environment

Create `/var/www/auth-platform/.env`:
```env
# Server
PORT=5000
NODE_ENV=production

# MongoDB (with authentication)
MONGODB_URI=mongodb://authapp:another_strong_password@localhost:27017/saas_auth_platform?authSource=saas_auth_platform

# Redis (with password)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# JWT Secrets (GENERATE NEW ONES!)
JWT_ACCESS_SECRET=generate_64_char_random_string_here
JWT_REFRESH_SECRET=generate_another_64_char_random_string_here

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
FRONTEND_URL=https://yourdomain.com
```

Create `/var/www/auth-platform/frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### Generate Strong Secrets
```bash
# Generate JWT secrets
openssl rand -base64 64
openssl rand -base64 64
```

## Step 5: PM2 Configuration

### Create Ecosystem File
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'auth-backend',
      script: './backend/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'auth-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log'
    }
  ]
};
```

### Start Applications
```bash
# Create logs directory
mkdir logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs
```

### PM2 Commands
```bash
# View status
pm2 status

# View logs
pm2 logs

# Restart
pm2 restart all

# Stop
pm2 stop all

# Monitor
pm2 monit
```

## Step 6: Nginx Configuration

### Install Nginx
```bash
sudo apt install -y nginx
```

### Configure Nginx
Create `/etc/nginx/sites-available/auth-platform`:
```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/auth-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 7: SSL/TLS with Let's Encrypt

### Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain Certificates
```bash
# For API
sudo certbot --nginx -d api.yourdomain.com

# For Frontend
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Auto-Renewal
Certbot automatically sets up renewal. Test it:
```bash
sudo certbot renew --dry-run
```

## Step 8: Firewall Configuration

### UFW (Ubuntu)
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

### Deny Direct Access to Services
```bash
# MongoDB and Redis should only be accessible locally
# They're already bound to 127.0.0.1
```

## Step 9: Monitoring & Logging

### PM2 Monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### System Monitoring
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor resources
htop
```

### Log Management
```bash
# View application logs
pm2 logs

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# View MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

## Step 10: Backup Strategy

### MongoDB Backup Script
Create `/usr/local/bin/backup-mongodb.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

mongodump \
  --uri="mongodb://authapp:password@localhost:27017/saas_auth_platform?authSource=saas_auth_platform" \
  --out="$BACKUP_DIR/backup_$DATE"

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $DATE"
```

Make executable:
```bash
sudo chmod +x /usr/local/bin/backup-mongodb.sh
```

### Schedule Backups
```bash
sudo crontab -e
```

Add:
```cron
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

### Application Files Backup
```bash
# Backup application files
tar -czf /backups/app-$(date +%Y%m%d).tar.gz /var/www/auth-platform

# Backup to remote server (optional)
rsync -avz /backups/ user@backup-server:/backups/auth-platform/
```

## Step 11: Security Hardening

### Disable Root Login
Edit `/etc/ssh/sshd_config`:
```
PermitRootLogin no
PasswordAuthentication no
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### Install Fail2Ban
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Configure Fail2Ban
Create `/etc/fail2ban/jail.local`:
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
```

Restart Fail2Ban:
```bash
sudo systemctl restart fail2ban
```

### Keep System Updated
```bash
# Enable automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Step 12: Health Checks

### Create Health Check Script
Create `/usr/local/bin/health-check.sh`:
```bash
#!/bin/bash

# Check backend
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "✓ Backend is healthy"
else
    echo "✗ Backend is down"
    pm2 restart auth-backend
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✓ Frontend is healthy"
else
    echo "✗ Frontend is down"
    pm2 restart auth-frontend
fi

# Check MongoDB
if mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "✓ MongoDB is healthy"
else
    echo "✗ MongoDB is down"
    sudo systemctl restart mongod
fi

# Check Redis
if redis-cli -a your_redis_password ping > /dev/null 2>&1; then
    echo "✓ Redis is healthy"
else
    echo "✗ Redis is down"
    sudo systemctl restart redis-server
fi
```

Schedule health checks:
```bash
sudo crontab -e
```

Add:
```cron
# Health check every 5 minutes
*/5 * * * * /usr/local/bin/health-check.sh >> /var/log/health-check.log 2>&1
```

## Step 13: Performance Optimization

### Node.js Optimization
```bash
# Increase Node.js memory limit if needed
export NODE_OPTIONS="--max-old-space-size=4096"
```

### MongoDB Optimization
Edit `/etc/mongod.conf`:
```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
```

### Redis Optimization
Edit `/etc/redis/redis.conf`:
```conf
maxmemory 1gb
maxmemory-policy allkeys-lru
```

### Nginx Optimization
Edit `/etc/nginx/nginx.conf`:
```nginx
worker_processes auto;
worker_connections 1024;

gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript;
```

## Step 14: Monitoring & Alerts

### Install Monitoring Tools
```bash
# Install Netdata (optional)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

### Setup Email Alerts
Install mail utilities:
```bash
sudo apt install -y mailutils
```

Create alert script `/usr/local/bin/alert.sh`:
```bash
#!/bin/bash
echo "$1" | mail -s "Auth Platform Alert" admin@yourdomain.com
```

## Deployment Checklist

### Pre-Launch
- [ ] All services running
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Backups scheduled
- [ ] Monitoring active
- [ ] Health checks working
- [ ] DNS configured
- [ ] Test all endpoints
- [ ] Load testing completed

### Post-Launch
- [ ] Monitor logs for errors
- [ ] Check performance metrics
- [ ] Verify backups working
- [ ] Test recovery procedures
- [ ] Document any issues
- [ ] Update documentation

## Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs

# Check environment variables
pm2 env 0

# Restart
pm2 restart all
```

### Database Connection Failed
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection
mongosh "mongodb://authapp:password@localhost:27017/saas_auth_platform"

# Check logs
sudo tail -f /var/log/mongodb/mongod.log
```

### High Memory Usage
```bash
# Check processes
pm2 monit

# Restart if needed
pm2 restart all

# Check system resources
free -h
df -h
```

## Maintenance

### Regular Tasks
- **Daily**: Check logs for errors
- **Weekly**: Review audit logs
- **Monthly**: Update dependencies
- **Quarterly**: Security audit
- **Annually**: Rotate secrets

### Update Application
```bash
cd /var/www/auth-platform

# Backup current version
tar -czf ../backup-$(date +%Y%m%d).tar.gz .

# Pull updates
git pull

# Install dependencies
npm install --production
cd frontend && npm install --production && npm run build && cd ..

# Restart
pm2 restart all
```

## Rollback Procedure

```bash
# Stop applications
pm2 stop all

# Restore backup
cd /var/www
tar -xzf backup-YYYYMMDD.tar.gz -C auth-platform

# Restart
cd auth-platform
pm2 start ecosystem.config.js
```

---

## Support

For production issues:
1. Check logs first
2. Review monitoring data
3. Test health endpoints
4. Check resource usage
5. Review recent changes

**Emergency Contact**: Set up on-call rotation for critical issues

---

Your platform is now production-ready! 🚀
