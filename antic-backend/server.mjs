import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { createPool } from 'mysql2/promise';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty' } });

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hash, role]
    );
    logger.info({ username, role }, 'User registered');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Register error');
    res.status(400).json({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [results] = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    if (!results || results.length === 0) {
      logger.warn({ username }, 'User not found');
      return res.status(401).json({ error: 'User not found' });
    }
    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      logger.warn({ username }, 'Invalid password');
      return res.status(401).json({ error: 'Invalid password' });
    }
    // JWT
    const accessToken = jwt.sign(
      { username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    logger.info({ username: user.username, role: user.role }, 'User login success');
    res.json({ accessToken, refreshToken, username: user.username, role: user.role });
  } catch (err) {
    logger.error({ err }, 'Login error');
    res.status(500).json({ error: err.message });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.get('/users', authenticateToken, async (req, res) => {
  try {
    const [results] = await db.query('SELECT id, username, role FROM users');
    logger.info('Fetched users');
    res.json(results);
  } catch (err) {
    logger.error({ err }, 'Fetch users error');
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3001, () => logger.info('API running on http://localhost:3001')); 