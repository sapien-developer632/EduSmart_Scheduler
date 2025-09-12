const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const uploadRoutes = require('./uploadRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads (if needed)
app.use('/uploads', express.static('uploads'));

// CSV Upload routes (Admin only)
app.use('/api/upload', uploadRoutes);

// Basic routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'EduSmart Scheduler Backend is running!',
    timestamp: new Date().toISOString(),
    features: ['CSV Upload', 'Data Management', 'Timetable Generation']
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
      'GET /api/courses - Get courses',
      'GET /api/departments - Get departments',
      'GET /api/programs - Get programs',
      'POST /api/upload/{type} - Upload CSV data (Admin only)',
      'GET /api/upload/templates/{type} - Download CSV templates',
      'GET /api/upload/stats - Get data statistics'
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
      token: 'demo-jwt-token-admin-123456'
    });
  } else if (email && password) {
    // Generic faculty/student login
    const role = email.includes('faculty') ? 'faculty' : 'student';
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: '2',
        email: email,
        role: role,
        name: email.split('@')[0].replace('.', ' ')
      },
      token: `demo-jwt-token-${role}-123456`
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Courses routes (placeholder with more sample data)
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
    },
    {
      id: '3',
      code: 'MATH301',
      title: 'Advanced Mathematics',
      credits: 3,
      department: 'Mathematics'
    },
    {
      id: '4',
      code: 'CS202',
      title: 'Data Structures and Algorithms',
      credits: 4,
      department: 'Computer Science'
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
    },
    {
      id: '2',
      email: 'prof.smith@university.edu',
      role: 'faculty',
      name: 'Prof. John Smith'
    },
    {
      id: '3',
      email: 'student.doe@university.edu',
      role: 'student',
      name: 'Jane Doe'
    }
  ]);
});

// Departments routes
app.get('/api/departments', (req, res) => {
  res.json([
    {
      id: '1',
      code: 'CSE',
      name: 'Computer Science and Engineering',
      description: 'Department of Computer Science and Engineering'
    },
    {
      id: '2',
      code: 'ECE',
      name: 'Electronics and Communication Engineering',
      description: 'Department of Electronics and Communication Engineering'
    },
    {
      id: '3',
      code: 'ME',
      name: 'Mechanical Engineering',
      description: 'Department of Mechanical Engineering'
    }
  ]);
});

// Programs routes
app.get('/api/programs', (req, res) => {
  res.json([
    {
      id: '1',
      code: 'CSE-BTECH',
      name: 'B.Tech Computer Science and Engineering',
      department: 'Computer Science and Engineering',
      duration: 4
    },
    {
      id: '2',
      code: 'ECE-BTECH',
      name: 'B.Tech Electronics and Communication Engineering',
      department: 'Electronics and Communication Engineering',
      duration: 4
    },
    {
      id: '3',
      code: 'ME-BTECH',
      name: 'B.Tech Mechanical Engineering',
      department: 'Mechanical Engineering',
      duration: 4
    }
  ]);
});

// Students routes (placeholder)
app.get('/api/students', (req, res) => {
  res.json([
    {
      id: '1',
      rollNumber: '2023U0001',
      name: 'Karan Bose',
      email: 'karan.bose@univ.edu',
      department: 'Computer Science and Engineering',
      semester: 1
    },
    {
      id: '2',
      rollNumber: '2023U0002',
      name: 'Sakshi Malhotra',
      email: 'sakshi.malhotra@univ.edu',
      department: 'Electronics and Communication Engineering',
      semester: 2
    }
  ]);
});

// Faculty routes (placeholder)
app.get('/api/faculty', (req, res) => {
  res.json([
    {
      id: '1',
      name: 'Dr. Anjali Sharma',
      email: 'anjali.sharma@univ.edu',
      department: 'Computer Science and Engineering',
      subjectsTaught: 'Data Structures; Algorithms',
      workingHours: 12
    },
    {
      id: '2',
      name: 'Prof. Rajesh Kumar',
      email: 'rajesh.kumar@univ.edu',
      department: 'Electronics and Communication Engineering',
      subjectsTaught: 'Operating Systems; Networks',
      workingHours: 15
    }
  ]);
});

// Classrooms routes (placeholder)
app.get('/api/classrooms', (req, res) => {
  res.json([
    {
      id: '1',
      roomNumber: 'C101',
      capacity: 50,
      type: 'Class'
    },
    {
      id: '2',
      roomNumber: 'LB1',
      capacity: 80,
      type: 'Lab'
    }
  ]);
});

// Timetable generation endpoint (placeholder)
app.post('/api/timetable/generate', (req, res) => {
  // Simulate timetable generation
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Timetable generation started',
      jobId: 'job_' + Date.now(),
      estimatedTime: '5-10 minutes'
    });
  }, 1000);
});

// Timetable routes (placeholder)
app.get('/api/timetable', (req, res) => {
  res.json({
    success: true,
    timetable: {
      id: '1',
      name: 'Fall 2024 Timetable',
      semester: 1,
      status: 'active',
      entries: [
        {
          day: 'Monday',
          time: '09:00-10:00',
          subject: 'Data Structures',
          faculty: 'Dr. Anjali Sharma',
          room: 'C101'
        },
        {
          day: 'Monday',
          time: '10:15-11:15',
          subject: 'Operating Systems',
          faculty: 'Prof. Rajesh Kumar',
          room: 'C102'
        }
      ]
    }
  });
});

// System statistics endpoint (enhanced)
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      totalStudents: 200,
      totalFaculty: 25,
      totalCourses: 45,
      totalClassrooms: 15,
      totalDepartments: 3,
      activeTimetables: 2,
      lastUpdated: new Date().toISOString()
    }
  });
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
  console.log(`📊 CSV Upload API: http://localhost:${PORT}/api/upload`);
  console.log(`📋 Features: Authentication, Course Management, CSV Data Import, Timetable Generation`);
});