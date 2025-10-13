#!/usr/bin/env bash
set -euo pipefail

############################
# CONFIG – ubah sesuai kebutuhan
############################
DOMAIN="hmr.nexa.net.id"            # domain SPA React
API_DOMAIN="api-antic.nexa.net.id"    # domain API backend
APP_DIR="/var/www/antic"              # root project
GIT_REPO="https://github.com/igmahardika/antic.git"

# MySQL
DB_NAME="helpdesk"
DB_USER="hmrnexa"
DB_PASS="7ynkgnqiiF6phLSRNHli"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# Node
NODE_VERSION="20"                     # CloudPanel v2 = Node 20 LTS
PORT="3001"                          # port API lokal

# Secret / kunci lain
JWT_SECRET="$(openssl rand -hex 32)"
SESSION_SECRET="$(openssl rand -base64 32)"
############################

echo "=== 1. Dependensi OS"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive \
apt-get install -y -qq curl build-essential git mysql-server redis-server

echo "=== 1a. Instal / upgrade Node.js $NODE_VERSION"
if ! command -v node >/dev/null || \
   (( $(node -p "process.versions.node.split('.')[0]") < NODE_VERSION )); then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y -qq nodejs
fi
npm install -g pm2

echo "=== 1b. Start Redis Server"
systemctl start redis-server
systemctl enable redis-server

echo "=== 2. MySQL – buat DB & user (jika belum ada)"
# Try different MySQL authentication methods
if mysql -uroot -e "SELECT 1;" >/dev/null 2>&1; then
  echo "✅ Using MySQL root without password"
  MYSQL_CMD="mysql -uroot"
elif mysql -uroot -p"" -e "SELECT 1;" >/dev/null 2>&1; then
  echo "✅ Using MySQL root with empty password"
  MYSQL_CMD="mysql -uroot -p''"
elif sudo mysql -e "SELECT 1;" >/dev/null 2>&1; then
  echo "✅ Using MySQL with sudo (auth_socket)"
  MYSQL_CMD="sudo mysql"
else
  echo "🔐 MySQL root requires password. Please enter MySQL root password:"
  read -s MYSQL_ROOT_PASS
  if mysql -uroot -p"${MYSQL_ROOT_PASS}" -e "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Using MySQL root with provided password"
    MYSQL_CMD="mysql -uroot -p${MYSQL_ROOT_PASS}"
  else
    echo "❌ MySQL authentication failed. Please check MySQL root credentials."
    echo ""
    echo "🔧 Troubleshooting options:"
    echo "1. Try: sudo mysql"
    echo "2. Try: mysql -uroot -p"
    echo "3. Check service: systemctl status mysql"
    echo "4. Reset root password: sudo mysql_secure_installation"
    exit 1
  fi
fi

# Execute MySQL commands
$MYSQL_CMD <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

if [ $? -eq 0 ]; then
  echo "✅ MySQL database and user created successfully"
else
  echo "❌ MySQL setup failed"
  exit 1
fi

echo "=== 3. Clone / update repo"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" pull --quiet
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --depth 1 "$GIT_REPO" "$APP_DIR"
fi
cd "$APP_DIR"

echo "=== 4. Generate backend .env"
cd "$APP_DIR/helpdesk-backend"
cat > .env <<ENV
# generated $(date)
# Database Configuration
DB_HOST=localhost
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
DB_NAME=${DB_NAME}
DB_PORT=3306

# Redis Configuration
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_DB=0

# JWT Configuration
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h

# Session Configuration
SESSION_SECRET=${SESSION_SECRET}
SESSION_MAX_AGE=86400000

# Server Configuration
PORT=${PORT}
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN=https://${DOMAIN}

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=3
ENV
echo "Backend .env ready."

echo "=== 5. Instal dependensi backend"
if [[ -f package-lock.json ]]; then
  npm ci --production
else
  npm install --production
fi

echo "=== 6. Jalankan migrasi SQL"
if [[ -f migrations/migrate.js ]]; then
  npm run migrate
elif [[ -f migrations/001_create_users_table.sql ]]; then
  mysql -u"${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < migrations/001_create_users_table.sql
fi

echo "=== 7. Instal dependensi frontend"
cd "$APP_DIR"
if [[ -f package-lock.json ]]; then
  npm ci --legacy-peer-deps
else
  npm install --legacy-peer-deps
fi

echo "=== 8. Build frontend"
# Set environment variables untuk build
export QT_QPA_PLATFORM=offscreen
export DISPLAY=:99
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

npm run build

echo "=== 9. PM2 – jalankan API"
cd "$APP_DIR/helpdesk-backend"
pm2 delete antic-api 2>/dev/null || true
pm2 start server.mjs --name antic-api --env production
pm2 save
pm2 startup systemd -u root --hp /root
systemctl restart pm2-root

echo "=== 10. Verify deployment"
# Test backend API
sleep 5
if curl -s http://127.0.0.1:${PORT}/health >/dev/null 2>&1; then
  echo "✅ Backend API is running and healthy"
else
  echo "⚠️  Backend API health check failed - check PM2 logs"
fi

# Check build files
if [[ -f "${APP_DIR}/dist/index.html" ]]; then
  echo "✅ Frontend build files are ready"
else
  echo "⚠️  Frontend build files not found"
fi

echo "==========================================================="
echo "Deploy selesai!"
echo ""
echo "🎯 Frontend SPA  : https://${DOMAIN}"
echo "🔧 Backend API   : https://${API_DOMAIN}"
echo "🔍 API local     : http://127.0.0.1:${PORT}"
echo ""
echo "📊 Monitoring:"
echo "  • PM2 logs     : pm2 logs antic-api -f"
echo "  • PM2 status   : pm2 status"
echo "  • Redis status : systemctl status redis-server"
echo "  • MySQL status : systemctl status mysql"
echo ""
echo "🔐 Database Info:"
echo "  • Database     : ${DB_NAME}"
echo "  • User         : ${DB_USER}"
echo "  • Host         : localhost:3306"
echo ""
echo "📁 Project Files:"
echo "  • Frontend     : ${APP_DIR}/dist"
echo "  • Backend      : ${APP_DIR}/helpdesk-backend"
echo "  • Logs         : ~/.pm2/logs"
echo ""
echo "📋 CloudPanel Setup Required:"
echo "  1. Buat Static Site (React):"
echo "     - Domain: ${DOMAIN}"
echo "     - Root: ${APP_DIR}/dist"
echo "     - Document Root: /var/www/antic/dist"
echo "     - PHP Version: None (Static)"
echo ""
echo "  2. Buat Reverse Proxy Site:"
echo "     - Domain: ${API_DOMAIN}"
echo "     - Target: 127.0.0.1:${PORT}"
echo "     - Protocol: HTTP"
echo ""
echo "🚀 Helpdesk Management System is ready!"
echo "==========================================================="