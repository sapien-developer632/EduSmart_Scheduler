const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Database connection with better error handling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://edusmart_user:edusmart_pass@postgres:5432/edusmart_scheduler',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Function to test database connection and tables
async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    
    // Test basic connection
    await client.query('SELECT NOW()');
    
    // Check if critical tables exist
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('departments', 'users', 'programs', 'students', 'faculty', 'courses', 'classrooms')
      ORDER BY table_name
    `);
    
    client.release();
    return {
      connected: true,
      tables: tableCheck.rows.map(row => row.table_name)
    };
  } catch (error) {
    console.error('Database connection test failed:', error);
    return {
      connected: false,
      error: error.message
    };
  }
}

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }
  
  const token = authHeader.split(' ')[1];
  
  // For demo purposes, check if token contains 'admin' or is the demo admin token
  if (token.includes('admin') || token === 'demo-jwt-token-admin-123456') {
    req.user = { role: 'admin', id: 1 }; // Add user info to request
    next();
  } else {
    return res.status(401).json({ success: false, message: 'Access denied. Admin only.' });
  }
};

// Database health check endpoint
router.get('/health', async (req, res) => {
  try {
    const dbStatus = await testDatabaseConnection();
    
    if (dbStatus.connected) {
      res.json({
        success: true,
        database: 'connected',
        tables: dbStatus.tables,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        database: 'disconnected',
        error: dbStatus.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Initialize database schema if needed
router.post('/init-database', requireAdmin, async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Check if database setup function exists and run it
    try {
      const result = await client.query('SELECT check_database_setup()');
      client.release();
      
      res.json({
        success: true,
        message: 'Database is properly initialized',
        tables: result.rows
      });
    } catch (error) {
      client.release();
      
      // If function doesn't exist, database needs to be initialized
      res.status(400).json({
        success: false,
        message: 'Database not properly initialized. Please restart the database container to run initialization scripts.',
        error: error.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database initialization check failed',
      error: error.message
    });
  }
});

// CSV Template downloads based on enhanced university requirements
router.get('/templates/:type', requireAdmin, (req, res) => {
  const { type } = req.params;
  
  const templates = {
    // CRITICAL MISSING DATA - PHASE 1
    academic_terms: 'Name,Start Date,End Date,Academic Year,Status\nFall 2024,15-08-2024,20-12-2024,2024-25,active\nSpring 2025,15-01-2025,15-05-2025,2024-25,upcoming\nSummer 2025,01-06-2025,31-07-2025,2024-25,upcoming',
    
    programs: 'Code,Name,Department Code,Duration Years,Total Semesters,Description\nCSE-BTECH,B.Tech Computer Science and Engineering,CSE,4,8,Four year undergraduate program\nECE-BTECH,B.Tech Electronics and Communication,ECE,4,8,Four year undergraduate program',
    
    time_slots: 'Slot Name,Start Time,End Time,Duration Minutes,Slot Type,Is Active\nPeriod 1,09:00:00,10:00:00,60,lecture,true\nPeriod 2,10:15:00,11:15:00,60,lecture,true\nLunch Break,12:30:00,13:30:00,60,lunch,true',
    
    // ENHANCED EXISTING DATA
    departments: 'Code,Name,Description,Head of Department Email\nCSE,Computer Science and Engineering,Department of Computer Science and Engineering,hod.cse@university.edu\nECE,Electronics and Communication Engineering,Department of Electronics and Communication,hod.ece@university.edu\nME,Mechanical Engineering,Department of Mechanical Engineering,hod.me@university.edu',
    
    classrooms: 'Room Code,Building,Floor,Capacity,Type,Equipment,Is Available\nC101,Main Building,1,50,Class,"Projector;Whiteboard;AC",true\nLB1,Lab Building,1,30,Lab,"Computers;Projector;AC",true\nLH201,Main Building,2,200,Lecture Hall,"Projector;Audio System;AC",true',
    
    students: 'Name,Student ID,Email,Program Code,Batch Name,Enrollment Year,Current Semester,Phone,Guardian Name,Guardian Phone,Address,Status\nJohn Doe,2024U0001,john.doe@univ.edu,CSE-BTECH,2024-2028 CSE,2024,1,9876543210,Robert Doe,9876543211,"123 Main St Delhi",active\nJane Smith,2024U0002,jane.smith@univ.edu,ECE-BTECH,2024-2028 ECE,2024,1,9876543212,Michael Smith,9876543213,"456 Park Ave Mumbai",active',
    
    faculty: 'Name,Employee ID,Email,Department Code,Designation,Phone,Qualification,Experience Years,Specialization,Working Hours Per Week,Time Preferences,Subjects Can Teach\nDr. John Smith,FAC001,john.smith@univ.edu,CSE,Professor,9876543220,"PhD Computer Science",15,"Machine Learning;AI",20,"Morning;Afternoon","Data Structures;Algorithms;Machine Learning"\nProf. Jane Doe,FAC002,jane.doe@univ.edu,ECE,Associate Professor,9876543221,"PhD Electronics",12,"Signal Processing",18,"Morning","Digital Signal Processing;Communication Systems"',
    
    courses: 'Course Code,Title,Department Code,Semester,Credits,Hours Per Week,Course Type,Prerequisites,Is Elective,Description\nCS101,Introduction to Programming,CSE,1,4,4,theory,,false,"Basic programming concepts using C++"\nCS201,Data Structures,CSE,3,4,4,theory,CS101,false,"Linear and non-linear data structures"\nCS301L,Data Structures Lab,CSE,3,2,3,lab,CS201,false,"Practical implementation of data structures"',
    
    // CRITICAL FOR SCHEDULING - PHASE 2
    course_prerequisites: 'Course Code,Prerequisite Course Code,Is Mandatory\nCS201,CS101,true\nCS301,CS201,true\nCS401,CS201,true',
    
    student_enrollments: 'Student ID,Course Code,Academic Year,Semester,Enrollment Date,Status\n2024U0001,CS101,2024-25,1,2024-08-15,enrolled\n2024U0001,MATH101,2024-25,1,2024-08-15,enrolled\n2024U0002,ECE101,2024-25,1,2024-08-15,enrolled',
    
    course_assignments: 'Course Code,Faculty Employee ID,Academic Year,Semester,Section,Max Students\nCS101,FAC001,2024-25,1,A,60\nCS101,FAC001,2024-25,1,B,60\nECE101,FAC002,2024-25,1,A,50'
  };

  if (!templates[type]) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid template type',
      availableTypes: Object.keys(templates)
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);
  res.send(templates[type]);
});

// Parse CSV helper function
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

// Upload departments (FIXED - enhanced with better error handling)
router.post('/departments', requireAdmin, upload.single('csvFile'), async (req, res) => {
  let client;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Test database connection first
    const dbStatus = await testDatabaseConnection();
    if (!dbStatus.connected) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection failed', 
        error: dbStatus.error,
        suggestion: 'Please ensure the database is running and properly initialized'
      });
    }

    // Check if departments table exists
    if (!dbStatus.tables.includes('departments')) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: 'Departments table does not exist', 
        availableTables: dbStatus.tables,
        suggestion: 'Please initialize the database schema first by restarting the database container'
      });
    }

    const csvData = await parseCSV(req.file.path);
    client = await pool.connect();
    
    let successCount = 0;
    let errors = [];

    try {
      await client.query('BEGIN');

      for (const [index, row] of csvData.entries()) {
        try {
          const code = (row.Code || row.code || '').trim();
          const name = (row.Name || row.name || row.Department || '').trim();
          const description = (row.Description || row.description || '').trim();
          const hodEmail = (row['Head of Department Email'] || row.hod_email || '').trim();
          
          if (!name) {
            errors.push(`Row ${index + 2}: Missing department name`);
            continue;
          }

          // Create department code from name if not provided
          const finalCode = code || name.replace(/[^A-Za-z]/g, '').substring(0, 6).toUpperCase();

          if (!finalCode) {
            errors.push(`Row ${index + 2}: Could not generate department code from name "${name}"`);
            continue;
          }

          // Insert or update department
          const result = await client.query(
            'INSERT INTO departments (code, name, description) VALUES ($1, $2, $3) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = CURRENT_TIMESTAMP RETURNING id',
            [finalCode, name, description]
          );

          if (result.rows.length > 0) {
            successCount++;
          }
        } catch (error) {
          console.error(`Error processing row ${index + 2}:`, error);
          errors.push(`Row ${index + 2}: ${error.message}`);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      message: `Successfully imported ${successCount} departments`,
      details: {
        totalRows: csvData.length,
        successCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10),
        hasMoreErrors: errors.length > 10
      }
    });

  } catch (error) {
    console.error('Department upload error:', error);
    
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Upload failed', 
      error: error.message,
      suggestion: 'Check database connection and ensure tables are properly initialized'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Upload academic terms (CRITICAL - Required first)
router.post('/academic_terms', requireAdmin, upload.single('csvFile'), async (req, res) => {
  let client;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Test database connection first
    const dbStatus = await testDatabaseConnection();
    if (!dbStatus.connected) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection failed', 
        error: dbStatus.error 
      });
    }

    const csvData = await parseCSV(req.file.path);
    client = await pool.connect();
    
    let successCount = 0;
    let errors = [];

    // Helper function to convert date format from DD-MM-YYYY to YYYY-MM-DD
    const convertDateFormat = (dateStr) => {
      if (!dateStr) return null;
      
      // Try DD-MM-YYYY format first
      const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Try DD/MM/YYYY format
      const ddmmyyyySlashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddmmyyyySlashMatch) {
        const [, day, month, year] = ddmmyyyySlashMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Try YYYY-MM-DD format (already correct)
      const yyyymmddMatch = dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/);
      if (yyyymmddMatch) {
        return dateStr;
      }
      
      // Try other common formats
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0];
      }
      
      return null;
    };

    try {
      await client.query('BEGIN');

      // Create academic_terms table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS academic_terms (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) UNIQUE NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          academic_year VARCHAR(10) NOT NULL,
          status VARCHAR(20) DEFAULT 'upcoming',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      for (const [index, row] of csvData.entries()) {
        try {
          const name = (row.Name || row.name || '').trim();
          const startDateRaw = (row['Start Date'] || row.start_date || '').trim();
          const endDateRaw = (row['End Date'] || row.end_date || '').trim();
          const academicYear = (row['Academic Year'] || row.academic_year || '').trim();
          const status = (row.Status || row.status || 'upcoming').trim();
          
          if (!name || !startDateRaw || !endDateRaw || !academicYear) {
            errors.push(`Row ${index + 2}: Missing required fields (Name, Start Date, End Date, Academic Year)`);
            continue;
          }

          // Convert date formats
          const startDate = convertDateFormat(startDateRaw);
          const endDate = convertDateFormat(endDateRaw);

          if (!startDate) {
            errors.push(`Row ${index + 2}: Invalid start date format '${startDateRaw}'. Use DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD`);
            continue;
          }

          if (!endDate) {
            errors.push(`Row ${index + 2}: Invalid end date format '${endDateRaw}'. Use DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD`);
            continue;
          }

          await client.query(
            'INSERT INTO academic_terms (name, start_date, end_date, academic_year, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, academic_year = EXCLUDED.academic_year, status = EXCLUDED.status',
            [name, startDate, endDate, academicYear, status]
          );
          
          successCount++;
        } catch (error) {
          errors.push(`Row ${index + 2}: ${error.message}`);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      message: `Successfully imported ${successCount} academic terms`,
      details: {
        totalRows: csvData.length,
        successCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Academic terms upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Get upload statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const stats = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM departments'),
      client.query('SELECT COUNT(*) as count FROM courses'),
      client.query('SELECT COUNT(*) as count FROM students WHERE deleted_at IS NULL'),
      client.query('SELECT COUNT(*) as count FROM faculty WHERE deleted_at IS NULL'),
      client.query('SELECT COUNT(*) as count FROM classrooms')
    ]);

    client.release();

    res.json({
      success: true,
      stats: {
        departments: parseInt(stats[0].rows[0].count),
        subjects: parseInt(stats[1].rows[0].count),
        students: parseInt(stats[2].rows[0].count),
        faculty: parseInt(stats[3].rows[0].count),
        classrooms: parseInt(stats[4].rows[0].count)
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get statistics', error: error.message });
  }
});

module.exports = router;