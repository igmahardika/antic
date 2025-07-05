const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'antic_secret_key'; // Ganti dengan env var di production

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Ganti sesuai konfigurasi MySQL Anda
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'admin',         // dari Sequel Ace
  password: 'admin123',  // ganti dengan password Anda
  database: 'anticapps', // dari Sequel Ace
  port: 3306
});

// Register user
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  const hash = await bcrypt.hash(password, 10);
  db.query(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, hash, role],
    (err, result) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Login user
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, results) => {
      if (err || results.length === 0) return res.status(401).json({ error: 'User not found' });
      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: 'Invalid password' });
      // Generate JWT
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
      res.json({ token, username: user.username, role: user.role });
    }
  );
});

// Middleware verifikasi token & role admin
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// Proteksi endpoint user management
app.get('/users', authenticateToken, requireAdmin, (req, res) => {
  db.query('SELECT id, username, role FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
app.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  const { id } = req.params;
  let query, params;
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    query = 'UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?';
    params = [username, hash, role, id];
  } else {
    query = 'UPDATE users SET username = ?, role = ? WHERE id = ?';
    params = [username, role, id];
  }
  db.query(query, params, (err, result) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ success: true });
  });
});
app.delete('/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM users WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(3001, () => console.log('API running on http://localhost:3001'));