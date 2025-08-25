/**
 * Security Configuration for Helpdesk Management System
 * Centralizes all security-related configurations
 */

import crypto from 'crypto';

// Generate secure random secrets if not provided
const generateSecureSecret = (length = 64) => {
  return crypto.randomBytes(length).toString('hex');
};

// Security configuration
export const securityConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || generateSecureSecret(64),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    algorithm: 'HS256',
    issuer: 'antic-analytics',
    audience: 'antic-users',
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || generateSecureSecret(64),
    maxAge: Number(process.env.SESSION_MAX_AGE) || 86_400_000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
  },

  // Password Configuration
  password: {
    saltRounds: 12, // Increased from 10 for better security
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    general: 100, // requests per window
    auth: 5, // login attempts per window
    admin: 10, // admin operations per hour
    data: 30, // data requests per minute
  },

  // Brute Force Protection
  bruteForce: {
    maxAttempts: 5,
    blockDuration: 15 * 60 * 1000, // 15 minutes
    attemptWindow: 15 * 60 * 1000, // 15 minutes
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['https://hms.nexa.net.id'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
    ],
  },

  // Database Security
  database: {
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false,
    } : false,
  },

  // File Upload Security
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'application/json',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    allowedExtensions: ['.json', '.csv', '.xls', '.xlsx'],
  },

  // Security Headers
  headers: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.hms.nexa.net.id"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  },

  // Audit Logging
  audit: {
    enableConsoleLogging: true,
    enableDatabaseLogging: true,
    enableFileLogging: process.env.NODE_ENV === 'production',
    logLevel: process.env.LOG_LEVEL || 'info',
    sensitiveFields: ['password', 'token', 'secret', 'key'],
  },

  // IP Whitelist for admin operations (optional)
  ipWhitelist: process.env.ADMIN_IP_WHITELIST?.split(',') || [],

  // Feature Flags
  features: {
    enableBruteForceProtection: true,
    enableAuditLogging: true,
    enableRateLimiting: true,
    enableCSRFProtection: true,
    enableInputValidation: true,
    enableSecurityHeaders: true,
  },
};

// Validation functions
export const validatePassword = (password) => {
  const config = securityConfig.password;
  const errors = [];

  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters long`);
  }

  if (password.length > config.maxLength) {
    errors.push(`Password must not exceed ${config.maxLength} characters`);
  }

  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (config.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (config.requireSpecialChars && !/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password),
  };
};

const calculatePasswordStrength = (password) => {
  let score = 0;
  
  // Length bonus
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character type bonuses
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[@$!%*?&]/.test(password)) score += 1;
  
  // Pattern penalties
  if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters
  if (/123|abc|qwe/i.test(password)) score -= 1; // Common patterns
  
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
};

// Sanitize sensitive data from logs
export const sanitizeLogData = (data) => {
  const sanitized = { ...data };
  const sensitiveFields = securityConfig.audit.sensitiveFields;
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

// Check if IP is whitelisted for admin operations
export const isIPWhitelisted = (ip) => {
  const whitelist = securityConfig.ipWhitelist;
  return whitelist.length === 0 || whitelist.includes(ip);
};

// Generate CSRF token
export const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export default securityConfig;