# 🚀 HMS NEXA - PRODUCTION DEPLOYMENT GUIDE

## 📋 Overview

This guide provides comprehensive instructions for deploying the **Helpdesk Management System (HMS)** to production servers.

### Deployment Architecture
- **Frontend**: `hms.nexa.net.id` → `/home/nexa-hms/htdocs/hms.nexa.net.id`
- **Backend API**: `api.hms.nexa.net.id` → `/home/nexa-api-hms/htdocs/api.hms.nexa.net.id`
- **Backend Port**: 3001 (via reverse proxy)

---

## 🛠️ Prerequisites

### System Requirements
- **Operating System**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Node.js**: v18+ (recommended v20+)
- **MySQL**: 8.0+
- **Redis**: 6.0+
- **Nginx**: 1.18+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: 10GB+ available space

### Dependencies Installation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Install Redis
sudo apt install redis-server -y
sudo systemctl enable redis-server

# Install Nginx
sudo apt install nginx -y
sudo systemctl enable nginx

# Install PM2 globally (optional but recommended)
sudo npm install -g pm2

# Install Git
sudo apt install git -y
```

---

## 🗄️ Database Setup

### 1. Create Production Database
```bash
# Connect to MySQL as root
sudo mysql -u root -p

# Run the setup script
mysql -u root -p < /var/www/hms/antic/setup-database-production.sql
```

### 2. Verify Database Setup
```bash
mysql -u hms_user -p hms_production_db
# Password: HMS_SecurePassword2024!

# Check tables
SHOW TABLES;
```

---

## 🔐 Security Configuration

### 1. SSL Certificates
```bash
# Generate SSL certificates (replace with your actual certificates)
sudo mkdir -p /etc/ssl/certs /etc/ssl/private

# For Let's Encrypt (recommended)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d hms.nexa.net.id -d api.hms.nexa.net.id
```

### 2. Firewall Configuration
```bash
# Configure UFW
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3306/tcp    # MySQL (only from localhost)
sudo ufw --force enable
```

### 3. Redis Security
```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Add password
requirepass Redis_HMS_Secure2024!

# Restart Redis
sudo systemctl restart redis-server
```

---

## 📁 Directory Structure Setup

### 1. Create Deployment Directories
```bash
# Create frontend directory
sudo mkdir -p /home/nexa-hms/htdocs/hms.nexa.net.id
sudo chown -R www-data:www-data /home/nexa-hms

# Create backend directory
sudo mkdir -p /home/nexa-api-hms/htdocs/api.hms.nexa.net.id
sudo chown -R www-data:www-data /home/nexa-api-hms

# Create log directories
sudo mkdir -p /var/log/pm2
sudo chown -R www-data:www-data /var/log/pm2
```

### 2. Set Proper Permissions
```bash
# Set directory permissions
sudo chmod 755 /home/nexa-hms/htdocs/hms.nexa.net.id
sudo chmod 755 /home/nexa-api-hms/htdocs/api.hms.nexa.net.id
```

---

## 🌐 Web Server Configuration

### 1. Install Nginx Configuration
```bash
# Copy Nginx configuration
sudo cp /var/www/hms/antic/nginx-sites-available-hms.conf /etc/nginx/sites-available/hms-nexa

# Enable the site
sudo ln -sf /etc/nginx/sites-available/hms-nexa /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 2. Configure PM2 Startup
```bash
# Install PM2 ecosystem
sudo cp /var/www/hms/antic/ecosystem.config.js /etc/pm2/

# Configure PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u www-data --hp /var/www

# Start PM2 ecosystem
pm2 start /etc/pm2/ecosystem.config.js --env production
pm2 save
```

---

## 🚀 Deployment Process

### Automatic Deployment (Recommended)
```bash
# Navigate to project directory
cd /var/www/hms/antic

# Run deployment script
sudo ./deploy-production-nexa.sh
```

### Manual Deployment Steps

#### 1. Frontend Deployment
```bash
cd /var/www/hms/antic

# Install dependencies
npm ci --only=production

# Copy production environment
cp env.production .env.production

# Build for production
npm run build

# Deploy to frontend directory
sudo cp -r dist/* /home/nexa-hms/htdocs/hms.nexa.net.id/

# Set permissions
sudo chown -R www-data:www-data /home/nexa-hms/htdocs/hms.nexa.net.id
sudo chmod -R 755 /home/nexa-hms/htdocs/hms.nexa.net.id
```

#### 2. Backend Deployment
```bash
cd /var/www/hms/antic

# Copy backend files
sudo cp -r helpdesk-backend/* /home/nexa-api-hms/htdocs/api.hms.nexa.net.id/

# Copy production environment
sudo cp helpdesk-backend/env.production /home/nexa-api-hms/htdocs/api.hms.nexa.net.id/.env

# Install backend dependencies
cd /home/nexa-api-hms/htdocs/api.hms.nexa.net.id
sudo npm ci --only=production

# Set permissions
sudo chown -R www-data:www-data /home/nexa-api-hms/htdocs/api.hms.nexa.net.id
sudo chmod 600 /home/nexa-api-hms/htdocs/api.hms.nexa.net.id/.env
```

#### 3. Start Services
```bash
# Start backend with PM2
cd /home/nexa-api-hms/htdocs/api.hms.nexa.net.id
pm2 start ecosystem.config.js --env production

# Or use systemd (alternative)
sudo cp /var/www/hms/antic/hms-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable hms-backend
sudo systemctl start hms-backend
```

---

## ✅ Verification & Testing

### 1. Health Checks
```bash
# Check backend health
curl http://localhost:3001/health

# Expected response: {"status":"ok","timestamp":"..."}

# Check frontend accessibility
curl -I https://hms.nexa.net.id

# Expected: HTTP/1.1 200 OK

# Check API endpoint
curl -I https://api.hms.nexa.net.id/health

# Expected: HTTP/1.1 200 OK
```

### 2. Service Status
```bash
# Check all services
sudo systemctl status nginx
sudo systemctl status mysql
sudo systemctl status redis-server

# Check PM2 processes
pm2 status

# Check logs
pm2 logs hms-nexa-backend
sudo tail -f /var/log/nginx/hms.nexa.net.id.access.log
```

### 3. Application Testing
1. **Frontend**: Visit `https://hms.nexa.net.id`
2. **Login**: Use credentials `admin / admin123`
3. **API**: Test endpoints via `https://api.hms.nexa.net.id`

---

## 🔧 Maintenance & Monitoring

### Log Files Locations
```bash
# Application logs
/var/log/hms-backend.log
/var/log/pm2/hms-backend-*.log

# Web server logs
/var/log/nginx/hms.nexa.net.id.access.log
/var/log/nginx/hms.nexa.net.id.error.log
/var/log/nginx/api.hms.nexa.net.id.access.log
/var/log/nginx/api.hms.nexa.net.id.error.log

# System logs
/var/log/mysql/error.log
/var/log/redis/redis-server.log
```

### Useful Commands
```bash
# Restart all services
sudo systemctl restart nginx mysql redis-server
pm2 restart all

# Update application
cd /var/www/hms/antic
git pull origin main
./deploy-production-nexa.sh

# Database backup
mysqldump -u hms_user -p hms_production_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Monitor resources
htop
df -h
free -h
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. Backend Not Starting
```bash
# Check logs
pm2 logs hms-nexa-backend
sudo journalctl -u hms-backend -f

# Common fixes
sudo systemctl restart mysql redis-server
pm2 restart hms-nexa-backend
```

#### 2. Database Connection Issues
```bash
# Test MySQL connection
mysql -u hms_user -p hms_production_db

# Check MySQL status
sudo systemctl status mysql
sudo mysqladmin -u root -p processlist
```

#### 3. Frontend Not Loading
```bash
# Check Nginx configuration
sudo nginx -t
sudo systemctl status nginx

# Check file permissions
ls -la /home/nexa-hms/htdocs/hms.nexa.net.id/
```

#### 4. SSL Certificate Issues
```bash
# Renew Let's Encrypt certificates
sudo certbot renew --dry-run
sudo certbot renew

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/hms.nexa.net.id/cert.pem -text -noout | grep "Not After"
```

---

## 📈 Performance Optimization

### 1. Database Optimization
```sql
-- Create additional indexes
CREATE INDEX idx_tickets_composite ON tickets(status, priority, created_at);
CREATE INDEX idx_incidents_composite ON incidents(status, severity, created_at);

-- Optimize tables
OPTIMIZE TABLE tickets, incidents, users, audit_logs;
```

### 2. Redis Configuration
```bash
# Edit Redis config for production
sudo nano /etc/redis/redis.conf

# Add these optimizations
maxmemory 256mb
maxmemory-policy allkeys-lru
tcp-keepalive 60
timeout 300
```

### 3. Nginx Optimization
```nginx
# Add to server block
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    gzip_static on;
}
```

---

## 🔐 Security Best Practices

1. **Change Default Passwords**: Update all default passwords in production
2. **Enable Fail2Ban**: Protect against brute force attacks
3. **Regular Updates**: Keep system and dependencies updated
4. **Backup Strategy**: Implement automated daily backups
5. **Monitor Logs**: Set up log monitoring and alerting
6. **SSL/TLS**: Use strong ciphers and HSTS headers
7. **Access Control**: Limit SSH access and use key-based authentication

---

## 📞 Support

### Application URLs
- **Frontend**: https://hms.nexa.net.id
- **API**: https://api.hms.nexa.net.id
- **Admin Panel**: https://hms.nexa.net.id/admin

### Default Credentials
- **Username**: admin
- **Password**: admin123
- **Role**: Super Admin

⚠️ **Important**: Change default credentials immediately after first login!

---

## 📝 Changelog

### Version 1.0.0 (Production Release)
- ✅ Complete deployment configuration
- ✅ Nginx reverse proxy setup
- ✅ PM2 process management
- ✅ SSL/HTTPS configuration
- ✅ Database optimization
- ✅ Security hardening
- ✅ Monitoring and logging

---

**🎉 HMS Nexa is now ready for production! 🚀**

