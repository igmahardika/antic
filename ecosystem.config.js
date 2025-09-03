// =============================================================================
// PM2 ECOSYSTEM CONFIGURATION - HMS NEXA
// =============================================================================
// This file configures PM2 process manager for the HMS backend
// Usage: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [{
    // Application name
    name: 'hms-nexa-backend',
    
    // Script to start
    script: '/home/nexa-api-hms/htdocs/api.hms.nexa.net.id/server.mjs',
    
    // Working directory
    cwd: '/home/nexa-api-hms/htdocs/api.hms.nexa.net.id',
    
    // Number of instances (use 'max' for CPU count)
    instances: 2,
    
    // Load balancing mode
    exec_mode: 'cluster',
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    
    // Process behavior
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Logging
    log_file: '/var/log/pm2/hms-backend-combined.log',
    out_file: '/var/log/pm2/hms-backend-out.log',
    error_file: '/var/log/pm2/hms-backend-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Advanced settings
    min_uptime: '10s',
    max_restarts: 5,
    restart_delay: 4000,
    
    // Health monitoring
            health_check_url: 'https://api.hms.nexa.net.id/health',
    health_check_grace_period: 3000,
    
    // Source control
    node_args: ['--max-old-space-size=1024'],
    
    // Kill timeout
    kill_timeout: 3000,
    
    // Graceful shutdown
    listen_timeout: 3000,
    
    // Cron restart (optional - restart daily at 3 AM)
    cron_restart: '0 3 * * *',
    
    // Merge logs
    merge_logs: true,
    
    // Time zone
    time: true
  }],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'root',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/igmahardika/helpdesk-management-system.git',
      path: '/var/www/hms/antic',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
