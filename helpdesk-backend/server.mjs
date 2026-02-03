// -----------------------------------------------------------------------------
//  Helpdesk Management System BACKEND  –  server.mjs
// -----------------------------------------------------------------------------

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import session from 'express-session';
import { createPool } from 'mysql2/promise';
import fetch from 'node-fetch';
import redisManager from './config/redis.mjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  securityHeaders,
  rateLimits,
  validateInput,
  validationRules,
  checkBruteForce,
  bruteForceProtection,
  sanitizeError,
  auditLogger,
} from './middleware/security.mjs';
import { body } from 'express-validator';
import { generateCustomerReportPDF } from './pdfGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------------------------------------------------------
// 1. App & basic helpers
// -----------------------------------------------------------------------------
const app = express();

const parseOrigins = (raw) =>
  (raw ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

// reCAPTCHA verification function
const verifyRecaptcha = async (token) => {
  if (!token) {
    return { success: false, error: 'No reCAPTCHA token provided' };
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY not configured');
    return { success: false, error: 'reCAPTCHA not configured' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    } else {
      console.warn('reCAPTCHA verification failed:', data['error-codes']);
      return { success: false, error: 'reCAPTCHA verification failed' };
    }
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return { success: false, error: 'reCAPTCHA verification error' };
  }
};

// Duration validation function - consistent with frontend logic
const validateDuration = (duration) => {
  if (!duration || typeof duration !== 'object') return 0;
  const rawHours = duration.rawHours || 0;
  // Return 0 for invalid durations (negative or > 24 hours)
  return rawHours >= 0 && rawHours <= 24 ? rawHours : 0;
};

// Helper: Format date for MySQL (YYYY-MM-DD HH:MM:SS)
const formatDateForMySQL = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 19).replace("T", " ");
  const str = String(val);
  // Handle ISO string with T and potentially Z/milliseconds
  if (str.includes("T")) {
    return str.slice(0, 19).replace("T", " ");
  }
  return str;
};

// -----------------------------------------------------------------------------
// 2. Middleware – Security, CORS, body-parser, session

app.use(
  cors({
    origin: parseOrigins(process.env.CORS_ORIGINS),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  }),
);

app.use(securityHeaders);

app.set('trust proxy', 1);

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: Number(process.env.SESSION_MAX_AGE) || 86_400_000,
      sameSite: 'strict',
    },
  }),
);
// 3. MySQL pool & Redis
// -----------------------------------------------------------------------------
const db = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'helpdesk_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});
await redisManager.connect();

// -----------------------------------------------------------------------------
// 4. Auth helpers
// -----------------------------------------------------------------------------
const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  // Allow mock token for development/testing
  if (token === 'mock-token-disabled-login') {
    req.user = { id: 0, username: 'mock-user', role: 'super admin' }; // Grant robust permissions
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'change-me-jwt',
    );
    const sessionData = await redisManager.getSession(decoded.sessionId);
    if (!sessionData) return res.status(401).json({ error: 'Session expired' });

    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// -----------------------------------------------------------------------------
// 5. Enhanced Rate Limiting & Security
// -----------------------------------------------------------------------------

// Apply general rate limiting
app.use(rateLimits.general);

// Enhanced authentication middleware with audit logging
const authenticateTokenWithAudit = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    auditLogger('AUTH_FAILED_NO_TOKEN', req);
    return res.status(401).json({ error: 'Access token required' });
  }

  // Allow mock token for development/testing
  if (token === 'mock-token-disabled-login') {
    req.user = { id: 0, username: 'mock-user', role: 'super admin', userId: 0 };
    auditLogger('AUTH_SUCCESS_MOCK', req, { userId: 0 });
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'change-me-jwt',
    );
    const sessionData = await redisManager.getSession(decoded.sessionId);
    if (!sessionData) {
      auditLogger('AUTH_FAILED_SESSION_EXPIRED', req, { userId: decoded.userId });
      return res.status(401).json({ error: 'Session expired' });
    }

    req.user = decoded;
    auditLogger('AUTH_SUCCESS', req, { userId: decoded.userId });
    next();
  } catch (error) {
    auditLogger('AUTH_FAILED_INVALID_TOKEN', req, { error: error.message });
    res.status(403).json({ error: 'Invalid token' });
  }
};

// -----------------------------------------------------------------------------
// 6. Secure Routes with Enhanced Authentication
// -----------------------------------------------------------------------------

// Secure login endpoint with brute force protection and reCAPTCHA
app.post(['/login', '/api/login'],
  rateLimits.auth,
  checkBruteForce,
  validateInput(validationRules.login),
  async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;

    try {
      const { username, password, recaptchaToken } = req.body;

      // Verify reCAPTCHA first - TEMPORARILY DISABLED
      // const recaptchaResult = await verifyRecaptcha(recaptchaToken);
      // if (!recaptchaResult.success) {
      //   auditLogger('LOGIN_FAILED_RECAPTCHA', req, { username, error: recaptchaResult.error });
      //   return res.status(400).json({ error: 'reCAPTCHA verification failed' });
      // }

      auditLogger('LOGIN_ATTEMPT', req, { username });

      const [rows] = await db.query(
        'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
        [username],
      );

      if (!rows.length) {
        bruteForceProtection.recordFailedAttempt(ip);
        auditLogger('LOGIN_FAILED_USER_NOT_FOUND', req, { username });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = rows[0];
      if (!(await bcrypt.compare(password, user.password))) {
        bruteForceProtection.recordFailedAttempt(ip);
        auditLogger('LOGIN_FAILED_WRONG_PASSWORD', req, { username, userId: user.id });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Successful login - clear brute force tracking
      bruteForceProtection.recordSuccessfulAttempt(ip);

      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await redisManager.setSession(sessionId, { userId: user.id }, 86_400);

      const token = jwt.sign(
        { userId: user.id, role: user.role, sessionId },
        process.env.JWT_SECRET || 'change-me-jwt',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
      );

      await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [
        user.id,
      ]);

      auditLogger('LOGIN_SUCCESS', req, { username, userId: user.id });

      res.json({
        success: true,
        token,
        user: { id: user.id, username: user.username, role: user.role },
        sessionId,
      });
    } catch (err) {
      console.error('Login error:', err);
      auditLogger('LOGIN_ERROR', req, { error: err.message });
      res.status(500).json(sanitizeError(err));
    }
  }
);

// Secure logout endpoint
app.post('/logout', authenticateTokenWithAudit, async (req, res) => {
  try {
    await redisManager.deleteSession(req.user.sessionId);
    auditLogger('LOGOUT_SUCCESS', req);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    auditLogger('LOGOUT_ERROR', req, { error: err.message });
    res.status(500).json(sanitizeError(err));
  }
});

app.get('/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', time: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// -----------------------------------------------------------------------------
// User Management API Endpoints
// -----------------------------------------------------------------------------

// Get all users (admin only)
app.get('/api/users',
  rateLimits.data,
  authenticateTokenWithAudit,
  async (req, res) => {
    try {
      if (req.user.role !== 'super admin' && req.user.role !== 'admin') {
        auditLogger('ACCESS_DENIED_INSUFFICIENT_ROLE', req, { requiredRole: 'admin' });
        return res.status(403).json({ error: 'Access denied' });
      }

      const [rows] = await db.query(
        'SELECT id, username, role, created_at, last_login, is_active FROM users ORDER BY created_at DESC'
      );

      auditLogger('USERS_LIST_ACCESSED', req);
      res.json({ success: true, users: rows });
    } catch (err) {
      console.error('Get users error:', err);
      auditLogger('USERS_LIST_ERROR', req, { error: err.message });
      res.status(500).json(sanitizeError(err));
    }
  }
);

// Add new user (admin only)
app.post('/api/users',
  rateLimits.admin,
  authenticateTokenWithAudit,
  validateInput(validationRules.createUser),
  async (req, res) => {
    try {
      if (req.user.role !== 'super admin' && req.user.role !== 'admin') {
        auditLogger('ACCESS_DENIED_USER_CREATE', req, { requiredRole: 'admin' });
        return res.status(403).json({ error: 'Access denied' });
      }

      const { username, password, role } = req.body;

      // Check if username already exists
      const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
      if (existing.length > 0) {
        auditLogger('USER_CREATE_FAILED_DUPLICATE', req, { username });
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Hash password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 12); // Increased rounds for security

      // Insert new user
      const [result] = await db.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role]
      );

      auditLogger('USER_CREATED', req, {
        newUserId: result.insertId,
        newUsername: username,
        newUserRole: role
      });

      res.json({
        success: true,
        message: 'User created successfully',
        userId: result.insertId
      });
    } catch (err) {
      console.error('Add user error:', err);
      auditLogger('USER_CREATE_ERROR', req, { error: err.message });
      res.status(500).json(sanitizeError(err));
    }
  }
);

// Update user (admin only)
app.put('/api/users/:id',
  rateLimits.admin,
  authenticateTokenWithAudit,
  validateInput([
    body('username')
      .isLength({ min: 3, max: 50 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username must be 3-50 characters, alphanumeric with _ or - only'),
    body('role')
      .isIn(['super admin', 'admin', 'user'])
      .withMessage('Role must be: super admin, admin, or user'),
    body('password')
      .optional()
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be 8+ characters with uppercase, lowercase, number, and special character'),
  ]),
  async (req, res) => {
    try {
      if (req.user.role !== 'super admin' && req.user.role !== 'admin') {
        auditLogger('ACCESS_DENIED_USER_UPDATE', req, { requiredRole: 'admin' });
        return res.status(403).json({ error: 'Access denied' });
      }

      const { id } = req.params;
      const { username, password, role } = req.body;

      // Validate ID parameter
      if (!id || isNaN(parseInt(id))) {
        auditLogger('USER_UPDATE_FAILED_INVALID_ID', req, { providedId: id });
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const userId = parseInt(id);

      // Check if user exists
      const [existingUser] = await db.query('SELECT id, username, role FROM users WHERE id = ?', [userId]);
      if (!existingUser.length) {
        auditLogger('USER_UPDATE_FAILED_NOT_FOUND', req, { userId });
        return res.status(404).json({ error: 'User not found' });
      }

      const currentUser = existingUser[0];

      // Check if username already exists for other users
      const [duplicateCheck] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
      if (duplicateCheck.length > 0) {
        auditLogger('USER_UPDATE_FAILED_DUPLICATE_USERNAME', req, { username, userId });
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Prevent non-super admin from modifying super admin
      if (currentUser.role === 'super admin' && req.user.role !== 'super admin') {
        auditLogger('USER_UPDATE_FAILED_INSUFFICIENT_PRIVILEGES', req, {
          targetUserId: userId,
          targetUserRole: currentUser.role
        });
        return res.status(403).json({ error: 'Cannot modify super admin user' });
      }

      let updateQuery = 'UPDATE users SET username = ?, role = ?, updated_at = NOW() WHERE id = ?';
      let params = [username, role, userId];

      // Update password if provided
      if (password && password.trim()) {
        const hashedPassword = await bcrypt.hash(password, 12); // Increased rounds for security
        updateQuery = 'UPDATE users SET username = ?, password = ?, role = ?, updated_at = NOW() WHERE id = ?';
        params = [username, hashedPassword, role, userId];
      }

      const [result] = await db.query(updateQuery, params);

      if (result.affectedRows === 0) {
        auditLogger('USER_UPDATE_FAILED_NO_ROWS_AFFECTED', req, { userId });
        return res.status(404).json({ error: 'User not found or no changes made' });
      }

      auditLogger('USER_UPDATED', req, {
        updatedUserId: userId,
        oldUsername: currentUser.username,
        newUsername: username,
        oldRole: currentUser.role,
        newRole: role,
        passwordChanged: !!(password && password.trim())
      });

      res.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
      console.error('Update user error:', err);
      auditLogger('USER_UPDATE_ERROR', req, { error: err.message });
      res.status(500).json(sanitizeError(err));
    }
  }
);

// Delete user (admin only)
app.delete('/api/users/:id',
  rateLimits.admin,
  authenticateTokenWithAudit,
  async (req, res) => {
    try {
      if (req.user.role !== 'super admin' && req.user.role !== 'admin') {
        auditLogger('ACCESS_DENIED_USER_DELETE', req, { requiredRole: 'admin' });
        return res.status(403).json({ error: 'Access denied' });
      }

      const { id } = req.params;

      // Validate ID parameter
      if (!id || isNaN(parseInt(id))) {
        auditLogger('USER_DELETE_FAILED_INVALID_ID', req, { providedId: id });
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const userId = parseInt(id);

      // Prevent deletion of current user
      if (userId === req.user.userId) {
        auditLogger('USER_DELETE_FAILED_SELF_DELETE', req, { userId });
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      // Check if user exists before deletion
      const [existingUser] = await db.query('SELECT id, username, role FROM users WHERE id = ?', [userId]);
      if (!existingUser.length) {
        auditLogger('USER_DELETE_FAILED_NOT_FOUND', req, { userId });
        return res.status(404).json({ error: 'User not found' });
      }

      const userToDelete = existingUser[0];

      // Prevent deletion of super admin by non-super admin
      if (userToDelete.role === 'super admin' && req.user.role !== 'super admin') {
        auditLogger('USER_DELETE_FAILED_INSUFFICIENT_PRIVILEGES', req, {
          targetUserId: userId,
          targetUserRole: userToDelete.role
        });
        return res.status(403).json({ error: 'Cannot delete super admin user' });
      }

      // Perform the deletion
      const [result] = await db.query('DELETE FROM users WHERE id = ?', [userId]);

      if (result.affectedRows === 0) {
        auditLogger('USER_DELETE_FAILED_NO_ROWS_AFFECTED', req, { userId });
        return res.status(404).json({ error: 'User not found or already deleted' });
      }

      auditLogger('USER_DELETED', req, {
        deletedUserId: userId,
        deletedUsername: userToDelete.username,
        deletedUserRole: userToDelete.role
      });

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      console.error('Delete user error:', err);
      auditLogger('USER_DELETE_ERROR', req, { error: err.message });
      res.status(500).json(sanitizeError(err));
    }
  }
);

// Get menu permissions
app.get('/api/menu-permissions', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'super admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [rows] = await db.query('SELECT * FROM menu_permissions ORDER BY role');
    res.json({ success: true, permissions: rows });
  } catch (err) {
    console.error('Get menu permissions error:', err);
    res.status(500).json({ error: 'Failed to fetch menu permissions' });
  }
});

// Update menu permissions
app.post('/api/menu-permissions', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'super admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { role, menus } = req.body;
    if (!role || !Array.isArray(menus)) {
      return res.status(400).json({ error: 'Role and menus array are required' });
    }

    // Check if permission already exists
    const [existing] = await db.query('SELECT id FROM menu_permissions WHERE role = ?', [role]);

    if (existing.length > 0) {
      // Update existing permission
      await db.query('UPDATE menu_permissions SET menus = ? WHERE role = ?', [JSON.stringify(menus), role]);
    } else {
      // Insert new permission
      await db.query('INSERT INTO menu_permissions (role, menus) VALUES (?, ?)', [role, JSON.stringify(menus)]);
    }

    res.json({ success: true, message: 'Menu permissions updated successfully' });
  } catch (err) {
    console.error('Update menu permissions error:', err);
    res.status(500).json({ error: 'Failed to update menu permissions' });
  }
});

// -----------------------------------------------------------------------------
// Tickets API Endpoints
// -----------------------------------------------------------------------------

// Get all tickets
app.get('/api/tickets', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 100000, search, category, status, cabang } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR customer_id LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (cabang) {
      whereClause += ' AND cabang = ?';
      params.push(cabang);
    }

    const [rows] = await db.query(
      `SELECT * FROM tickets WHERE ${whereClause} ORDER BY open_time DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM tickets WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      tickets: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (err) {
    console.error('Get tickets error:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Add new ticket
app.post('/api/tickets', authenticateToken, async (req, res) => {
  try {
    const ticketData = req.body;

    // Validate required fields
    if (!ticketData.id || !ticketData.customerId || !ticketData.name || !ticketData.openTime) {
      return res.status(400).json({ error: 'Missing required fields: id, customerId, name, openTime' });
    }

    const insertQuery = `
      INSERT INTO tickets (
        id, customer_id, name, category, description, cause, handling,
        open_time, close_time, duration_raw_hours, duration_formatted,
        close_handling, handling_duration_raw_hours, handling_duration_formatted,
        classification, sub_classification, status, handling1, close_handling1,
        handling_duration1_raw_hours, handling_duration1_formatted,
        handling2, close_handling2, handling_duration2_raw_hours, handling_duration2_formatted,
        handling3, close_handling3, handling_duration3_raw_hours, handling_duration3_formatted,
        handling4, close_handling4, handling_duration4_raw_hours, handling_duration4_formatted,
        handling5, close_handling5, handling_duration5_raw_hours, handling_duration5_formatted,
        open_by, cabang, upload_timestamp, rep_class
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      ticketData.id,
      ticketData.customerId,
      ticketData.name,
      ticketData.category,
      ticketData.description,
      ticketData.cause,
      ticketData.handling,
      ticketData.openTime,
      ticketData.closeTime,
      ticketData.duration?.rawHours || 0,
      ticketData.duration?.formatted || '',
      ticketData.closeHandling,
      ticketData.handlingDuration?.rawHours || 0,
      ticketData.handlingDuration?.formatted || '',
      ticketData.classification,
      ticketData.subClassification,
      ticketData.status || 'open',
      ticketData.handling1,
      ticketData.closeHandling1,
      ticketData.handlingDuration1?.rawHours || 0,
      ticketData.handlingDuration1?.formatted || '',
      ticketData.handling2,
      ticketData.closeHandling2,
      ticketData.handlingDuration2?.rawHours || 0,
      ticketData.handlingDuration2?.formatted || '',
      ticketData.handling3,
      ticketData.closeHandling3,
      ticketData.handlingDuration3?.rawHours || 0,
      ticketData.handlingDuration3?.formatted || '',
      ticketData.handling4,
      ticketData.closeHandling4,
      ticketData.handlingDuration4?.rawHours || 0,
      ticketData.handlingDuration4?.formatted || '',
      ticketData.handling5,
      ticketData.closeHandling5,
      ticketData.handlingDuration5?.rawHours || 0,
      ticketData.handlingDuration5?.formatted || '',
      ticketData.openBy,
      ticketData.cabang,
      ticketData.uploadTimestamp || Date.now(),
      ticketData.repClass
    ];

    await db.query(insertQuery, values);
    res.json({ success: true, message: 'Ticket created successfully' });
  } catch (err) {
    console.error('Add ticket error:', err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Delete all tickets (Reset Database)
app.delete('/api/tickets/all', authenticateToken, async (req, res) => {
  try {
    await db.query('TRUNCATE TABLE tickets');
    // Note: Redis cache will be invalidated on next request due to TTL
    res.json({ success: true, message: 'All tickets deleted' });
  } catch (err) {
    console.error('Reset tickets error:', err);
    res.status(500).json({ error: 'Failed to reset tickets' });
  }
});

// Delete tickets by batch (upload timestamp)
app.delete('/api/tickets/batch/:timestamp', authenticateToken, async (req, res) => {
  try {
    const { timestamp } = req.params;
    await db.query('DELETE FROM tickets WHERE upload_timestamp = ?', [timestamp]);
    res.json({ success: true, message: 'Batch deleted' });
  } catch (err) {
    console.error('Delete batch error:', err);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
});

// Bulk insert tickets
app.post('/api/tickets/bulk', authenticateToken, async (req, res) => {
  try {
    const { tickets } = req.body;

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ error: 'Tickets array is required' });
      if (tickets && tickets.length > 0) console.log('DEBUG UPLOAD PAYLOAD SAMPLE:', JSON.stringify(tickets[0]));
    }

    const insertQuery = `
      INSERT INTO tickets (
        id, customer_id, name, category, description, cause, handling,
        open_time, close_time, duration_raw_hours, duration_formatted,
        close_handling, handling_duration_raw_hours, handling_duration_formatted,
        classification, sub_classification, status, handling1, close_handling1,
        handling_duration1_raw_hours, handling_duration1_formatted,
        handling2, close_handling2, handling_duration2_raw_hours, handling_duration2_formatted,
        handling3, close_handling3, handling_duration3_raw_hours, handling_duration3_formatted,
        handling4, close_handling4, handling_duration4_raw_hours, handling_duration4_formatted,
        handling5, close_handling5, handling_duration5_raw_hours, handling_duration5_formatted,
        open_by, cabang, upload_timestamp, rep_class
      ) VALUES ?
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        category = VALUES(category),
        description = VALUES(description),
        updated_at = CURRENT_TIMESTAMP
    `;

    const values = tickets.map(ticket => [
      ticket.id,
      ticket.customerId || 'UNKNOWN',
      ticket.name || 'No Name',
      ticket.category || 'Uncategorized',
      ticket.description,
      ticket.cause,
      ticket.handling,
      formatDateForMySQL(ticket.openTime || new Date()),
      formatDateForMySQL(ticket.closeTime),
      validateDuration(ticket.duration), // Validasi durasi total
      ticket.duration?.formatted || '',
      formatDateForMySQL(ticket.closeHandling),
      validateDuration(ticket.handlingDuration), // Validasi ART
      ticket.handlingDuration?.formatted || '',
      ticket.classification,
      ticket.subClassification,
      ticket.status || 'open',
      ticket.handling1,
      formatDateForMySQL(ticket.closeHandling1),
      validateDuration(ticket.handlingDuration1), // Validasi FRT
      ticket.handlingDuration1?.formatted || '',
      ticket.handling2,
      formatDateForMySQL(ticket.closeHandling2),
      validateDuration(ticket.handlingDuration2),
      ticket.handlingDuration2?.formatted || '',
      ticket.handling3,
      formatDateForMySQL(ticket.closeHandling3),
      validateDuration(ticket.handlingDuration3),
      ticket.handlingDuration3?.formatted || '',
      ticket.handling4,
      formatDateForMySQL(ticket.closeHandling4),
      validateDuration(ticket.handlingDuration4),
      ticket.handlingDuration4?.formatted || '',
      ticket.handling5,
      formatDateForMySQL(ticket.closeHandling5),
      validateDuration(ticket.handlingDuration5),
      ticket.handlingDuration5?.formatted || '',
      ticket.openBy,
      ticket.cabang,
      ticket.uploadTimestamp || Date.now(),
      ticket.repClass
    ]);

    await db.query(insertQuery, [values]);
    res.json({ success: true, message: `${tickets.length} tickets processed successfully` });
  } catch (err) {
    console.error('Bulk insert tickets error:', err);
    res.status(500).json({ error: 'Failed to process tickets' });
  }
});

// -----------------------------------------------------------------------------
// Customers API Endpoints
// -----------------------------------------------------------------------------

// Get all customers
app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 100, search, jenisKlien, layanan, kategori } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (nama LIKE ? OR id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (jenisKlien) {
      whereClause += ' AND jenis_klien = ?';
      params.push(jenisKlien);
    }

    if (layanan) {
      whereClause += ' AND layanan = ?';
      params.push(layanan);
    }

    if (kategori) {
      whereClause += ' AND kategori = ?';
      params.push(kategori);
    }

    const [rows] = await db.query(
      `SELECT * FROM customers WHERE ${whereClause} ORDER BY nama LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM customers WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      customers: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Add new customer
app.post('/api/customers', authenticateToken, async (req, res) => {
  try {
    const { id, nama, jenisKlien, layanan, kategori } = req.body;

    if (!id || !nama) {
      return res.status(400).json({ error: 'ID and nama are required' });
    }

    await db.query(
      'INSERT INTO customers (id, nama, jenis_klien, layanan, kategori) VALUES (?, ?, ?, ?, ?)',
      [id, nama, jenisKlien, layanan, kategori]
    );

    res.json({ success: true, message: 'Customer created successfully' });
  } catch (err) {
    console.error('Add customer error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Customer ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create customer' });
    }
  }
});

// -----------------------------------------------------------------------------
// 7. Graceful shutdown
// -----------------------------------------------------------------------------
const shutdown = async (sig) => {
  console.log(`🛑 ${sig} received – shutting down…`);
  try {
    await redisManager.disconnect();
    await db.end();
    console.log('✅ Connections closed');
    process.exit(0);
  } catch (e) {
    console.error('❌ Shutdown error', e);
    process.exit(1);
  }
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// -----------------------------------------------------------------------------
// 8. Migration API Endpoints (Special Rate Limiting)
// -----------------------------------------------------------------------------

// Migration-specific bulk insert for customers (higher rate limit)
app.post('/api/migration/customers/bulk',
  rateLimits.migration,
  authenticateTokenWithAudit,
  async (req, res) => {
    try {
      if (req.user.role !== 'super admin' && req.user.role !== 'admin') {
        auditLogger('ACCESS_DENIED_MIGRATION', req, { operation: 'customers_bulk' });
        return res.status(403).json({ error: 'Access denied' });
      }

      const { customers } = req.body;

      if (!Array.isArray(customers) || customers.length === 0) {
        return res.status(400).json({ error: 'Customers array is required' });
      }

      const values = customers.map(customer => [
        customer.id,
        customer.nama,
        customer.jenisKlien,
        customer.layanan,
        customer.kategori
      ]);

      await db.query(
        'INSERT INTO customers (id, nama, jenis_klien, layanan, kategori) VALUES ? ON DUPLICATE KEY UPDATE nama = VALUES(nama), jenis_klien = VALUES(jenis_klien), layanan = VALUES(layanan), kategori = VALUES(kategori)',
        [values]
      );

      auditLogger('MIGRATION_CUSTOMERS_BULK', req, { count: customers.length });
      res.json({ success: true, message: `${customers.length} customers migrated successfully` });
    } catch (err) {
      console.error('Migration bulk insert customers error:', err);
      auditLogger('MIGRATION_CUSTOMERS_ERROR', req, { error: err.message });
      res.status(500).json({ error: 'Failed to migrate customers' });
    }
  }
);

// Migration-specific bulk insert for tickets (higher rate limit)
app.post('/api/migration/tickets/bulk',
  rateLimits.migration,
  authenticateTokenWithAudit,
  async (req, res) => {
    try {
      if (req.user.role !== 'super admin' && req.user.role !== 'admin') {
        auditLogger('ACCESS_DENIED_MIGRATION', req, { operation: 'tickets_bulk' });
        return res.status(403).json({ error: 'Access denied' });
      }

      const { tickets } = req.body;

      if (!Array.isArray(tickets) || tickets.length === 0) {
        return res.status(400).json({ error: 'Tickets array is required' });
      }

      const insertQuery = `
        INSERT INTO tickets (
          id, customer_id, name, category, description, cause, handling,
          open_time, close_time, duration_raw_hours, duration_formatted,
          close_handling, handling_duration_raw_hours, handling_duration_formatted,
          classification, sub_classification, status, handling1, close_handling1,
          handling_duration1_raw_hours, handling_duration1_formatted,
          handling2, close_handling2, handling_duration2_raw_hours, handling_duration2_formatted,
          handling3, close_handling3, handling_duration3_raw_hours, handling_duration3_formatted,
          handling4, close_handling4, handling_duration4_raw_hours, handling_duration4_formatted,
          handling5, close_handling5, handling_duration5_raw_hours, handling_duration5_formatted,
          open_by, cabang, upload_timestamp, rep_class
        ) VALUES ? ON DUPLICATE KEY UPDATE
          customer_id = VALUES(customer_id),
          name = VALUES(name),
          category = VALUES(category),
          description = VALUES(description),
          cause = VALUES(cause),
          handling = VALUES(handling),
          open_time = VALUES(open_time),
          close_time = VALUES(close_time),
          duration_raw_hours = VALUES(duration_raw_hours),
          duration_formatted = VALUES(duration_formatted),
          close_handling = VALUES(close_handling),
          handling_duration_raw_hours = VALUES(handling_duration_raw_hours),
          handling_duration_formatted = VALUES(handling_duration_formatted),
          classification = VALUES(classification),
          sub_classification = VALUES(sub_classification),
          status = VALUES(status)
      `;

      const values = tickets.map(ticket => [
        ticket.id,
        ticket.customerId || 'UNKNOWN',
        ticket.name || 'No Name',
        ticket.category || 'Uncategorized',
        ticket.description,
        ticket.cause,
        ticket.handling,
        ticket.openTime || new Date(),
        ticket.closeTime,
        validateDuration({ rawHours: ticket.duration }), // Validasi durasi total
        ticket.duration ? `${ticket.duration}h` : null,
        ticket.closeHandling,
        validateDuration({ rawHours: ticket.handlingDuration }), // Validasi ART
        ticket.handlingDuration ? `${ticket.handlingDuration}h` : null,
        ticket.classification,
        ticket.subClassification,
        ticket.status,
        ticket.handling1,
        ticket.closeHandling1,
        validateDuration({ rawHours: ticket.handlingDuration1 }), // Validasi FRT
        ticket.handlingDuration1 ? `${ticket.handlingDuration1}h` : null,
        ticket.handling2,
        ticket.closeHandling2,
        validateDuration({ rawHours: ticket.handlingDuration2 }),
        ticket.handlingDuration2 ? `${ticket.handlingDuration2}h` : null,
        ticket.handling3,
        ticket.closeHandling3,
        validateDuration({ rawHours: ticket.handlingDuration3 }),
        ticket.handlingDuration3 ? `${ticket.handlingDuration3}h` : null,
        ticket.handling4,
        ticket.closeHandling4,
        validateDuration({ rawHours: ticket.handlingDuration4 }),
        ticket.handlingDuration4 ? `${ticket.handlingDuration4}h` : null,
        ticket.handling5,
        ticket.closeHandling5,
        validateDuration({ rawHours: ticket.handlingDuration5 }),
        ticket.handlingDuration5 ? `${ticket.handlingDuration5}h` : null,
        ticket.openBy,
        ticket.cabang,
        ticket.uploadTimestamp,
        ticket.repClass
      ]);

      await db.query(insertQuery, [values]);

      auditLogger('MIGRATION_TICKETS_BULK', req, { count: tickets.length });
      res.json({ success: true, message: `${tickets.length} tickets migrated successfully` });
    } catch (err) {
      console.error('Migration bulk insert tickets error:', err);
      auditLogger('MIGRATION_TICKETS_ERROR', req, { error: err.message });
      res.status(500).json({ error: 'Failed to migrate tickets' });
    }
  }
);

// Migration status endpoint
app.get('/api/migration/status',
  rateLimits.migration,
  authenticateTokenWithAudit,
  async (req, res) => {
    try {
      if (req.user.role !== 'super admin' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check counts in both systems
      const [ticketsCount] = await db.query('SELECT COUNT(*) as count FROM tickets');
      const [customersCount] = await db.query('SELECT COUNT(*) as count FROM customers');

      auditLogger('MIGRATION_STATUS_CHECK', req);
      res.json({
        success: true,
        mysql: {
          tickets: ticketsCount[0].count,
          customers: customersCount[0].count
        }
      });
    } catch (err) {
      console.error('Migration status error:', err);
      res.status(500).json({ error: 'Failed to get migration status' });
    }
  }
);

// -----------------------------------------------------------------------------
// Agent Photo Management Endpoints
// -----------------------------------------------------------------------------

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Get project root (go up from helpdesk-backend to project root)
    const projectRoot = path.resolve(__dirname, '..');
    const uploadDir = path.join(projectRoot, 'public', 'agent-photos');
    const distDir = path.join(projectRoot, 'dist', 'agent-photos');

    // Create directories if they don't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const agentName = req.body.agentName || 'unknown';
    const normalizedName = agentName
      .trim()
      .replace(/[^\w\s'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    // Preserve original file extension
    const originalExt = path.extname(file.originalname) || '.png';
    cb(null, `${normalizedName}${originalExt}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File must be PNG, JPEG, or JPG'), false);
    }
  }
});

// Agent Photo Upload Endpoint
app.post('/api/upload-agent-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const agentName = req.body.agentName || 'unknown';
    const normalizedName = agentName
      .trim()
      .replace(/[^\w\s'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Get project root
    const projectRoot = path.resolve(__dirname, '..');

    // Get the actual filename that was saved
    const savedFileName = req.file.filename;
    const fileExt = path.extname(savedFileName);

    // Copy file to dist folder for production
    const sourcePath = req.file.path;
    const distPath = path.join(projectRoot, 'dist', 'agent-photos', savedFileName);

    try {
      // Ensure dist directory exists
      const distDir = path.dirname(distPath);
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      fs.copyFileSync(sourcePath, distPath);
    } catch (copyError) {
      console.error('Error copying to dist folder:', copyError);
      // Don't fail the request if dist copy fails
    }

    res.json({
      success: true,
      filePath: `/agent-photos/${savedFileName}`,
      fileName: savedFileName,
      agentName: normalizedName,
      message: 'Photo uploaded successfully'
    });

  } catch (error) {
    console.error('Upload endpoint error:', error);
    res.status(500).json({
      error: 'Failed to upload photo',
      details: error.message
    });
  }
});

// Agent Photo Info Endpoint
app.get('/api/photo-info', async (req, res) => {
  try {
    const { agentName } = req.query;

    if (!agentName) {
      return res.status(400).json({ error: 'No agent name provided' });
    }

    const projectRoot = path.resolve(__dirname, '..');
    const normalizedName = agentName
      .trim()
      .replace(/[^\w\s'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Try multiple extensions
    const possibleExtensions = ['.png', '.jpg', '.jpeg'];
    let fileName = null;
    let filePath = null;

    for (const ext of possibleExtensions) {
      const testPath = path.join(projectRoot, 'public', 'agent-photos', `${normalizedName}${ext}`);
      if (fs.existsSync(testPath)) {
        fileName = `${normalizedName}${ext}`;
        filePath = testPath;
        break;
      }
    }

    if (!filePath || !fileName) {
      return res.json({ success: false, found: false, error: "Photo not found" });
    }

    const stats = fs.statSync(filePath);

    res.json({
      success: true,
      fileName: fileName,
      filePath: `/agent-photos/${fileName}`,
      size: stats.size,
      uploadDate: stats.birthtime,
      lastModified: stats.mtime
    });

  } catch (error) {
    console.error('Photo info endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get photo info',
      details: error.message
    });
  }
});

// Agent Photo Delete Endpoint
app.delete('/api/delete-agent-photo', async (req, res) => {
  try {
    const { agentName } = req.body;

    if (!agentName) {
      return res.status(400).json({ error: 'No agent name provided' });
    }

    const projectRoot = path.resolve(__dirname, '..');

    const normalizedName = agentName
      .trim()
      .replace(/[^\w\s'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Try to delete files with multiple extensions
    const possibleExtensions = ['.png', '.jpg', '.jpeg'];

    for (const ext of possibleExtensions) {
      const fileName = `${normalizedName}${ext}`;

      // Delete from public folder
      const publicFilePath = path.join(projectRoot, 'public', 'agent-photos', fileName);
      if (fs.existsSync(publicFilePath)) {
        fs.unlinkSync(publicFilePath);
      }

      // Delete from dist folder
      const distFilePath = path.join(projectRoot, 'dist', 'agent-photos', fileName);
      if (fs.existsSync(distFilePath)) {
        fs.unlinkSync(distFilePath);
      }
    }

    res.json({
      success: true,
      message: 'Photo deleted successfully'
    });

  } catch (error) {
    console.error('Delete endpoint error:', error);
    res.status(500).json({
      error: 'Failed to delete photo',
      details: error.message
    });
  }
});

// -----------------------------------------------------------------------------
// 9. Start server
// -----------------------------------------------------------------------------

// --- [AUTO-ADDED] Delete Routes ---
// Delete tickets by batch ID
app.delete('/api/tickets/batch-id/:batchId', authenticateToken, async (req, res) => {
  try {
    const { batchId } = req.params;
    await db.query('DELETE FROM tickets WHERE batch_id = ?', [batchId]);
    res.json({ success: true, message: 'Batch deleted' });
  } catch (err) {
    console.error('Delete ticket batch error:', err);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
});

// Delete incidents by batch ID
app.delete('/api/incidents/batch-id/:batchId', authenticateToken, async (req, res) => {
  try {
    const { batchId } = req.params;
    await db.query('DELETE FROM incidents WHERE batch_id = ?', [batchId]);
    res.json({ success: true, message: 'Batch deleted' });
  } catch (err) {
    console.error('Delete incident batch error:', err);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
});

// Reset Incidents
app.delete('/api/incidents/all', authenticateToken, async (req, res) => {
  try {
    await db.query('TRUNCATE TABLE incidents');
    res.json({ success: true, message: 'All incidents deleted' });
  } catch (err) {
    console.error('Reset incidents error:', err);
    res.status(500).json({ error: 'Failed to reset incidents' });
  }
});
// ----------------------------------


// -----------------------------------------------------------------------------
// IMPORTED ENDPOINTS START
// -----------------------------------------------------------------------------

// Bulk insert incidents
app.post('/api/incidents/bulk', authenticateToken, async (req, res) => {
  try {
    const { incidents, metadata } = req.body;
    if (!Array.isArray(incidents)) {
      return res.status(400).json({ error: 'Incidents must be an array' });
    }

    const values = incidents.map(inc => [
      inc.id, inc.noCase, inc.priority, inc.site, inc.ncal, inc.status, inc.level, inc.ts, inc.odpBts,
      inc.startTime, inc.endTime, inc.startEscalationVendor,
      inc.durationMin, inc.durationVendorMin, inc.totalDurationPauseMin, inc.totalDurationVendorMin,
      inc.startPause1, inc.endPause1, inc.startPause2, inc.endPause2,
      inc.problem, inc.penyebab, inc.actionTerakhir, inc.note, inc.klasifikasiGangguan,
      inc.powerBefore, inc.powerAfter,
      inc.batchId || metadata?.batchId,
      inc.fileName || metadata?.fileName,
      inc.fileHash || metadata?.fileHash,
      inc.uploadSessionId || metadata?.uploadSessionId
    ]);

    if (values.length === 0) return res.json({ success: true, created: 0 });

    const query = `
      INSERT INTO incidents (
        id, no_case, priority, site, ncal, status, level, ts, odp_bts,
        start_time, end_time, start_escalation_vendor,
        duration_min, duration_vendor_min, total_duration_pause_min, total_duration_vendor_min,
        start_pause1, end_pause1, start_pause2, end_pause2,
        problem, penyebab, action_terakhir, note, klasifikasi_gangguan,
        power_before, power_after,
        batch_id, file_name, file_hash, upload_session_id
      ) VALUES ?
      ON DUPLICATE KEY UPDATE 
        status = VALUES(status), updated_at = NOW()
    `;

    const [result] = await db.query(query, [values]);
    res.json({ success: true, message: 'Incidents imported', created: result.affectedRows });
  } catch (err) {
    console.error('Bulk insert incidents error:', err);
    res.status(500).json({ error: 'Failed to insert incidents', details: err.message });
  }
});

// Bulk insert customers
app.post('/api/customers/bulk', authenticateToken, async (req, res) => {
  try {
    const { customers, metadata } = req.body;
    if (!Array.isArray(customers)) {
      return res.status(400).json({ error: 'Customers must be an array' });
    }

    const values = customers.map(c => [
      c.id, c.nama, c.jenisKlien, c.layanan, c.kategori,
      c.batchId || metadata?.batchId,
      c.fileName || metadata?.fileName
    ]);

    if (values.length === 0) return res.json({ success: true, created: 0 });

    // Ensure customers table exists with correct schema in verify phase
    const query = `
      INSERT INTO customers (id, nama, jenis_klien, layanan, kategori, batch_id, file_name) 
      VALUES ? 
      ON DUPLICATE KEY UPDATE nama = VALUES(nama), updated_at = NOW()
    `;

    const [result] = await db.query(query, [values]);
    res.json({ success: true, message: 'Customers imported', created: result.affectedRows });
  } catch (err) {
    console.error('Bulk insert customers error:', err);
    res.status(500).json({ error: 'Failed to insert customers', details: err.message });
  }
});

// Create Upload Session
app.post('/api/upload-sessions', authenticateToken, async (req, res) => {
  try {
    const session = req.body;
    await db.query(`
      INSERT INTO upload_sessions (id, file_name, file_hash, data_type, upload_timestamp, status, record_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [session.id, session.fileName, session.fileHash, session.dataType, session.uploadTimestamp, session.status, session.recordCount]);
    res.json({ success: true, message: 'Session created' });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update Upload Session
app.put('/api/upload-sessions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Dynamic update query
    const fields = [];
    const values = [];
    Object.keys(updates).forEach(key => {
      // Convert camelCase to snake_case for specific fields if needed
      if (key === 'recordCount') { fields.push('record_count = ?'); values.push(updates[key]); }
      else if (key === 'successCount') { fields.push('success_count = ?'); values.push(updates[key]); }
      else if (key === 'errorCount') { fields.push('error_count = ?'); values.push(updates[key]); }
      else if (key === 'errorLog') { fields.push('error_log = ?'); values.push(JSON.stringify(updates[key])); }
      else { fields.push(`${key} = ?`); values.push(updates[key]); }
    });

    values.push(id);
    await db.query(`UPDATE upload_sessions SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err) {
    console.error('Update session error:', err);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// IMPORTED ENDPOINTS END
// -----------------------------------------------------------------------------


const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Helpdesk Management System API  → http://localhost:${PORT}`);
  console.log(`🔧 ENV        : ${process.env.NODE_ENV || 'development'}`);
});

// PDF Generation Endpoint
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { customerData, ticketsData, insightData } = req.body;

    // Generate PDF using Puppeteer
    const pdfBuffer = await generateCustomerReportPDF(customerData, ticketsData, insightData);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="CustomerReport-${customerData.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);

    // Send PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      details: error.message
    });
  }
});

// Get all incidents
app.get('/api/incidents', authenticateToken, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const [rows] = await db.query('SELECT * FROM incidents ORDER BY start_time DESC LIMIT ?', [parseInt(limit)]);
    res.json({ success: true, incidents: rows });
  } catch (err) {
    console.error('Get incidents error:', err);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});
