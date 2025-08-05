/**
 * Security Middleware for AN-TIC Analytics Dashboard
 * Implements OWASP security best practices
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';

// Security Headers Middleware
export const securityHeaders = helmet({
  // Content Security Policy
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
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  // X-Frame-Options
  frameguard: { action: 'deny' },
  // X-Content-Type-Options
  noSniff: true,
  // X-XSS-Protection
  xssFilter: true,
  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Hide X-Powered-By header
  hidePoweredBy: true,
});

// Enhanced Rate Limiting
export const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      // Log rate limit violations
      console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// Different rate limits for different endpoints
export const rateLimits = {
  // General API rate limit
  general: createRateLimit(15 * 60 * 1000, 100, 'Too many requests, please try again later'),
  
  // Strict rate limit for authentication endpoints
  auth: createRateLimit(15 * 60 * 1000, 5, 'Too many login attempts, please try again later'),
  
  // More lenient for data retrieval
  data: createRateLimit(1 * 60 * 1000, 30, 'Too many data requests, please slow down'),
  
  // Very strict for admin operations
  admin: createRateLimit(60 * 60 * 1000, 10, 'Too many admin operations, please try again later'),
};

// Input Validation Middleware
export const validateInput = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
        })),
      });
    }
    next();
  };
};

// Common validation rules
export const validationRules = {
  // User validation
  createUser: [
    body('username')
      .isLength({ min: 3, max: 50 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username must be 3-50 characters, alphanumeric with _ or - only'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be 8+ characters with uppercase, lowercase, number, and special character'),
    body('role')
      .isIn(['super admin', 'admin', 'user'])
      .withMessage('Role must be: super admin, admin, or user'),
  ],
  
  // Login validation
  login: [
    body('username')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Username is required'),
    body('password')
      .isLength({ min: 1 })
      .withMessage('Password is required'),
  ],
  
  // Ticket validation
  createTicket: [
    body('id')
      .isUUID()
      .withMessage('Ticket ID must be a valid UUID'),
    body('customerId')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Customer ID is required and must be less than 255 characters'),
    body('name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .escape()
      .withMessage('Name is required and must be less than 255 characters'),
    body('openTime')
      .isISO8601()
      .withMessage('Open time must be a valid ISO 8601 date'),
  ],
};

// Brute Force Protection
class BruteForceProtection {
  constructor() {
    this.attempts = new Map();
    this.blockedIPs = new Map();
    this.maxAttempts = 5;
    this.blockDuration = 15 * 60 * 1000; // 15 minutes
    this.attemptWindow = 15 * 60 * 1000; // 15 minutes
  }

  isBlocked(ip) {
    const blocked = this.blockedIPs.get(ip);
    if (blocked && Date.now() < blocked) {
      return true;
    }
    if (blocked) {
      this.blockedIPs.delete(ip);
    }
    return false;
  }

  recordFailedAttempt(ip) {
    const now = Date.now();
    const attempts = this.attempts.get(ip) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.attemptWindow);
    recentAttempts.push(now);
    
    this.attempts.set(ip, recentAttempts);
    
    if (recentAttempts.length >= this.maxAttempts) {
      this.blockedIPs.set(ip, now + this.blockDuration);
      this.attempts.delete(ip);
      console.warn(`IP ${ip} blocked due to ${this.maxAttempts} failed login attempts`);
      return true;
    }
    
    return false;
  }

  recordSuccessfulAttempt(ip) {
    this.attempts.delete(ip);
    this.blockedIPs.delete(ip);
  }

  getAttemptCount(ip) {
    const attempts = this.attempts.get(ip) || [];
    const now = Date.now();
    return attempts.filter(time => now - time < this.attemptWindow).length;
  }
}

export const bruteForceProtection = new BruteForceProtection();

// Brute force middleware
export const checkBruteForce = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  if (bruteForceProtection.isBlocked(ip)) {
    return res.status(429).json({
      error: 'Too many failed login attempts. Please try again later.',
      retryAfter: Math.ceil(bruteForceProtection.blockDuration / 1000),
    });
  }
  
  next();
};

// Sanitize output to prevent information disclosure
export const sanitizeError = (error) => {
  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    return {
      error: 'An internal error occurred',
      timestamp: new Date().toISOString(),
    };
  }
  
  return {
    error: error.message || 'An error occurred',
    timestamp: new Date().toISOString(),
  };
};

// CSRF Protection Middleware
export const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests and API endpoints with proper auth
  if (req.method === 'GET' || req.headers.authorization) {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
    });
  }
  
  next();
};

// Security Audit Logging
export const auditLogger = (action, req, additionalData = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId: req.user?.userId || null,
    userRole: req.user?.role || null,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    path: req.path,
    method: req.method,
    ...additionalData,
  };
  
  // In production, send to proper logging service
  console.log('AUDIT:', JSON.stringify(logEntry));
  
  // Store in database for audit trail
  // TODO: Implement database audit logging
};

export default {
  securityHeaders,
  rateLimits,
  validateInput,
  validationRules,
  bruteForceProtection,
  checkBruteForce,
  sanitizeError,
  csrfProtection,
  auditLogger,
};