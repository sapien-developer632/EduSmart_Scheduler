const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'EduSmart Scheduler Backend is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api', (req, res) => {
  res.json({ 
    message: 'Welcome to EduSmart Scheduler API',
    version: '1.0.0',
    endpoints: [
      'GET /api/health - Health check',
      'POST /api/auth/login - User authentication',
      'GET /api/users - Get users',
      'GET /api/courses - Get courses'
    ]
  });
});

// Auth routes (placeholder)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple hardcoded check for demo
  if (email === 'admin@university.edu' && password === 'admin123') {
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: '1',
        email: 'admin@university.edu',
        role: 'admin',
        name: 'System Administrator'
      },
      token: 'demo-jwt-token-123456'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Courses routes (placeholder)
app.get('/api/courses', (req, res) => {
  res.json([
    {
      id: '1',
      code: 'CS101',
      title: 'Introduction to Computer Science',
      credits: 3,
      department: 'Computer Science'
    },
    {
      id: '2',
      code: 'PHY201',
      title: 'Physics I',
      credits: 4,
      department: 'Physics'
    }
  ]);
});

// Users routes (placeholder)
app.get('/api/users', (req, res) => {
  res.json([
    {
      id: '1',
      email: 'admin@university.edu',
      role: 'admin',
      name: 'System Administrator'
    }
  ]);
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 EduSmart Scheduler Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api`);
});