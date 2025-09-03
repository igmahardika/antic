#!/bin/bash

# =============================================================================
# HMS NEXA - QUICK PRODUCTION SETUP SCRIPT
# =============================================================================
# This script prepares the production environment for HMS deployment

echo "🚀 HMS Nexa - Quick Production Setup"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

print_status "Starting HMS production environment setup..."

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install dependencies
print_status "Installing required packages..."
apt install -y curl wget git nginx mysql-server redis-server ufw certbot python3-certbot-nginx

# Install Node.js 20
print_status "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
print_status "Installing PM2..."
npm install -g pm2

# Create deployment directories
print_status "Creating deployment directories..."
mkdir -p /home/nexa-hms/htdocs/hms.nexa.net.id
mkdir -p /home/nexa-api-hms/htdocs/api.hms.nexa.net.id
mkdir -p /var/log/pm2

# Set ownership
chown -R www-data:www-data /home/nexa-hms
chown -R www-data:www-data /home/nexa-api-hms
chown -R www-data:www-data /var/log/pm2

# Configure UFW firewall
print_status "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Enable services
print_status "Enabling services..."
systemctl enable nginx
systemctl enable mysql
systemctl enable redis-server

# Start services
systemctl start nginx
systemctl start mysql
systemctl start redis-server

# Secure MySQL installation
print_status "MySQL is installed. Please run 'mysql_secure_installation' manually."
print_warning "After securing MySQL, run the database setup script:"
print_warning "mysql -u root -p < $(pwd)/setup-database-production.sql"

# Configure Redis
print_status "Configuring Redis..."
sed -i 's/# requirepass foobared/requirepass Redis_HMS_Secure2024!/' /etc/redis/redis.conf
systemctl restart redis-server

# Install Nginx configuration
print_status "Installing Nginx configuration..."
cp nginx-sites-available-hms.conf /etc/nginx/sites-available/hms-nexa
ln -sf /etc/nginx/sites-available/hms-nexa /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

print_warning "SSL certificates need to be configured manually:"
print_warning "Run: certbot --nginx -d hms.nexa.net.id -d api.hms.nexa.net.id"

# Test Nginx configuration
if nginx -t; then
    systemctl reload nginx
    print_success "Nginx configuration installed and reloaded"
else
    print_error "Nginx configuration test failed"
fi

# Install systemd service
print_status "Installing systemd service..."
cp hms-backend.service /etc/systemd/system/
systemctl daemon-reload

# Install PM2 ecosystem
print_status "Installing PM2 ecosystem..."
cp ecosystem.config.js /etc/pm2/

print_success "Production environment setup completed!"
echo ""
print_status "Next steps:"
echo "  1. Run: mysql_secure_installation"
echo "  2. Setup database: mysql -u root -p < setup-database-production.sql"
echo "  3. Configure SSL: certbot --nginx -d hms.nexa.net.id -d api.hms.nexa.net.id"
echo "  4. Deploy application: ./deploy-production-nexa.sh"
echo ""
print_success "HMS Nexa production environment is ready!"

