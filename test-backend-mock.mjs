// Temporary Mock Backend for HMS Testing
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = 3002; // Different port untuk testing

app.use(express.json());
app.use(cors({
  origin: ['https://hms.nexa.net.id', 'http://localhost:5173'],
  credentials: true
}));

// Mock user data
const mockUsers = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123', // Plain text for testing
    email: 'admin@hms.nexa.net.id',
    role: 'super_admin',
    full_name: 'System Administrator'
  }
];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'HMS Mock Backend Running' });
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password, recaptchaToken } = req.body;
  
  console.log('Login attempt:', { username, password });
  
  // Find user
  const user = mockUsers.find(u => u.username === username);
  
  if (!user || user.password !== password) {
    return res.status(401).json({ 
      success: false, 
      error: 'Username atau password salah' 
    });
  }
  
  // Generate token
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    'mock-secret-key',
    { expiresIn: '24h' }
  );
  
  res.json({
    success: true,
    token,
    sessionId: 'mock-session-' + Date.now(),
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    }
  });
});

// Logout endpoint
app.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

app.listen(PORT, () => {
  console.log(`🚀 HMS Mock Backend running on port ${PORT}`);
  console.log(`📋 Test credentials: admin / admin123`);
});

