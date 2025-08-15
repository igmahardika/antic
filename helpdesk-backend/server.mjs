// -----------------------------------------------------------------------------
//  AN-TIC BACKEND  –  server.mjs
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

// -----------------------------------------------------------------------------
// 2. Middleware – Security, CORS, body-parser, session
// -----------------------------------------------------------------------------

// Apply security headers first
app.use(securityHeaders);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

app.use(
  cors({
    origin: parseOrigins(process.env.CORS_ORIGINS),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: Number(process.env.SESSION_MAX_AGE) || 86_400_000, // 24 h
      sameSite: 'strict', // CSRF protection
    },
  }),
);

// -----------------------------------------------------------------------------
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
app.post('/login', 
  rateLimits.auth,
  checkBruteForce,
  validateInput(validationRules.login),
  async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    try {
      const { username, password, recaptchaToken } = req.body;
      
      // Verify reCAPTCHA first
      const recaptchaResult = await verifyRecaptcha(recaptchaToken);
      if (!recaptchaResult.success) {
        auditLogger('LOGIN_FAILED_RECAPTCHA', req, { username, error: recaptchaResult.error });
        return res.status(400).json({ error: 'reCAPTCHA verification failed' });
      }
      
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
    const { page = 1, limit = 100, search, category, status, cabang } = req.query;
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

// Bulk insert tickets
app.post('/api/tickets/bulk', authenticateToken, async (req, res) => {
  try {
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
      ) VALUES ?
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        category = VALUES(category),
        description = VALUES(description),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    const values = tickets.map(ticket => [
      ticket.id,
      ticket.customerId,
      ticket.name,
      ticket.category,
      ticket.description,
      ticket.cause,
      ticket.handling,
      ticket.openTime,
      ticket.closeTime,
      ticket.duration?.rawHours || 0,
      ticket.duration?.formatted || '',
      ticket.closeHandling,
      ticket.handlingDuration?.rawHours || 0,
      ticket.handlingDuration?.formatted || '',
      ticket.classification,
      ticket.subClassification,
      ticket.status || 'open',
      ticket.handling1,
      ticket.closeHandling1,
      ticket.handlingDuration1?.rawHours || 0,
      ticket.handlingDuration1?.formatted || '',
      ticket.handling2,
      ticket.closeHandling2,
      ticket.handlingDuration2?.rawHours || 0,
      ticket.handlingDuration2?.formatted || '',
      ticket.handling3,
      ticket.closeHandling3,
      ticket.handlingDuration3?.rawHours || 0,
      ticket.handlingDuration3?.formatted || '',
      ticket.handling4,
      ticket.closeHandling4,
      ticket.handlingDuration4?.rawHours || 0,
      ticket.handlingDuration4?.formatted || '',
      ticket.handling5,
      ticket.closeHandling5,
      ticket.handlingDuration5?.rawHours || 0,
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

// Bulk insert customers
app.post('/api/customers/bulk', authenticateToken, async (req, res) => {
  try {
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
    
    res.json({ success: true, message: `${customers.length} customers processed successfully` });
  } catch (err) {
    console.error('Bulk insert customers error:', err);
    res.status(500).json({ error: 'Failed to process customers' });
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
        ticket.customerId,
        ticket.name,
        ticket.category,
        ticket.description,
        ticket.cause,
        ticket.handling,
        ticket.openTime,
        ticket.closeTime,
        ticket.duration,
        ticket.duration ? `${ticket.duration}h` : null,
        ticket.closeHandling,
        ticket.handlingDuration,
        ticket.handlingDuration ? `${ticket.handlingDuration}h` : null,
        ticket.classification,
        ticket.subClassification,
        ticket.status,
        ticket.handling1,
        ticket.closeHandling1,
        ticket.handlingDuration1,
        ticket.handlingDuration1 ? `${ticket.handlingDuration1}h` : null,
        ticket.handling2,
        ticket.closeHandling2,
        ticket.handlingDuration2,
        ticket.handlingDuration2 ? `${ticket.handlingDuration2}h` : null,
        ticket.handling3,
        ticket.closeHandling3,
        ticket.handlingDuration3,
        ticket.handlingDuration3 ? `${ticket.handlingDuration3}h` : null,
        ticket.handling4,
        ticket.closeHandling4,
        ticket.handlingDuration4,
        ticket.handlingDuration4 ? `${ticket.handlingDuration4}h` : null,
        ticket.handling5,
        ticket.closeHandling5,
        ticket.handlingDuration5,
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
// 9. Start server
// -----------------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`🚀 AN-TIC API  → http://localhost:${PORT}`);
  console.log(`🔧 ENV        : ${process.env.NODE_ENV || 'development'}`);
});
