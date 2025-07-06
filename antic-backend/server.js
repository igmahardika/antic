const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');

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
      res.json({ username: user.username, role: user.role });
    }
  );
});

// Get all users (for admin panel)
app.get('/users', (req, res) => {
  db.query('SELECT id, username, role FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.listen(3001, () => console.log('API running on http://localhost:3001'));