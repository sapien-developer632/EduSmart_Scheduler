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

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://edusmart_user:edusmart_pass@postgres:5432/edusmart_scheduler'
});

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

// CSV Template downloads based on enhanced university requirements
router.get('/templates/:type', requireAdmin, (req, res) => {
  const { type } = req.params;
  
  const templates = {
    // CRITICAL MISSING DATA - PHASE 1
    academic_terms: 'Name,Start Date,End Date,Academic Year,Status\nFall 2024,2024-08-15,2024-12-15,2024-25,active\nSpring 2025,2025-01-15,2025-05-15,2024-25,upcoming',
    
    programs: 'Code,Name,Department Code,Duration Years,Total Semesters,Description\nCSE-BTECH,B.Tech Computer Science and Engineering,CSE,4,8,Four year undergraduate program\nECE-BTECH,B.Tech Electronics and Communication,ECE,4,8,Four year undergraduate program',
    
    batches: 'Name,Program Code,Start Year,End Year,Current Semester,Total Students\n2024-2028 CSE,CSE-BTECH,2024,2028,1,120\n2023-2027 CSE,CSE-BTECH,2023,2027,3,115',
    
    time_slots: 'Slot Name,Start Time,End Time,Duration Minutes,Slot Type,Is Active\nPeriod 1,09:00:00,10:00:00,60,lecture,true\nPeriod 2,10:15:00,11:15:00,60,lecture,true\nLunch Break,12:30:00,13:30:00,60,lunch,true',
    
    // ENHANCED EXISTING DATA
    departments: 'Code,Name,Description,Head of Department Email\nCSE,Computer Science and Engineering,Department of Computer Science and Engineering,hod.cse@university.edu\nECE,Electronics and Communication Engineering,Department of Electronics and Communication,hod.ece@university.edu',
    
    classrooms: 'Room Code,Building,Floor,Capacity,Type,Equipment,Is Available\nC101,Main Building,1,50,Class,"Projector;Whiteboard;AC",true\nLB1,Lab Building,1,30,Lab,"Computers;Projector;AC",true\nLH201,Main Building,2,200,Lecture Hall,"Projector;Audio System;AC",true',
    
    students: 'Name,Student ID,Email,Program Code,Batch Name,Enrollment Year,Current Semester,Phone,Guardian Name,Guardian Phone,Address,Status\nJohn Doe,2024U0001,john.doe@univ.edu,CSE-BTECH,2024-2028 CSE,2024,1,9876543210,Robert Doe,9876543211,"123 Main St Delhi",active\nJane Smith,2024U0002,jane.smith@univ.edu,ECE-BTECH,2024-2028 ECE,2024,1,9876543212,Michael Smith,9876543213,"456 Park Ave Mumbai",active',
    
    faculty: 'Name,Employee ID,Email,Department Code,Designation,Phone,Qualification,Experience Years,Specialization,Working Hours Per Week,Time Preferences,Subjects Can Teach\nDr. John Smith,FAC001,john.smith@univ.edu,CSE,Professor,9876543220,"PhD Computer Science",15,"Machine Learning;AI",20,"Morning;Afternoon","Data Structures;Algorithms;Machine Learning"\nProf. Jane Doe,FAC002,jane.doe@univ.edu,ECE,Associate Professor,9876543221,"PhD Electronics",12,"Signal Processing",18,"Morning","Digital Signal Processing;Communication Systems"',
    
    courses: 'Course Code,Title,Department Code,Semester,Credits,Hours Per Week,Course Type,Prerequisites,Is Elective,Description\nCS101,Introduction to Programming,CSE,1,4,4,theory,,false,"Basic programming concepts using C++"\nCS201,Data Structures,CSE,3,4,4,theory,CS101,false,"Linear and non-linear data structures"\nCS301L,Data Structures Lab,CSE,3,2,3,lab,CS201,false,"Practical implementation of data structures"',
    
    // CRITICAL FOR SCHEDULING - PHASE 2
    course_prerequisites: 'Course Code,Prerequisite Course Code,Is Mandatory\nCS201,CS101,true\nCS301,CS201,true\nCS401,CS201,true',
    
    student_enrollments: 'Student ID,Course Code,Academic Year,Semester,Enrollment Date,Status\n2024U0001,CS101,2024-25,1,2024-08-15,enrolled\n2024U0001,MATH101,2024-25,1,2024-08-15,enrolled\n2024U0002,ECE101,2024-25,1,2024-08-15,enrolled',
    
    course_assignments: 'Course Code,Faculty Employee ID,Academic Year,Semester,Section,Max Students\nCS101,FAC001,2024-25,1,A,60\nCS101,FAC001,2024-25,1,B,60\nECE101,FAC002,2024-25,1,A,50',
    
    // LEGACY - keeping for backward compatibility
    subjects: 'Subject Name,Code,Subject Hours per Week,Faculty Name,Semester\nData Structures,CS201,4,Dr. John Smith,3\nAlgorithms,CS301,4,Dr. John Smith,5\nOperating Systems,CS303,4,Prof. Jane Doe,5'
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

// Upload academic terms (CRITICAL - Required first)
router.post('/academic_terms', requireAdmin, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const csvData = await parseCSV(req.file.path);
    const client = await pool.connect();
    
    let successCount = 0;
    let errors = [];

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
          const name = row.Name || row.name;
          const startDate = row['Start Date'] || row.start_date;
          const endDate = row['End Date'] || row.end_date;
          const academicYear = row['Academic Year'] || row.academic_year;
          const status = row.Status || row.status || 'upcoming';
          
          if (!name || !startDate || !endDate || !academicYear) {
            errors.push(`Row ${index + 2}: Missing required fields (Name, Start Date, End Date, Academic Year)`);
            continue;
          }

          await client.query(
            'INSERT INTO academic_terms (name, start_date, end_date, academic_year, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO UPDATE SET start_date = $2, end_date = $3, academic_year = $4, status = $5',
            [name.trim(), startDate, endDate, academicYear.trim(), status.trim()]
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
    } finally {
      client.release();
    }

    fs.unlinkSync(req.file.path);

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
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

// Upload departments (enhanced - existing functionality with improvements)
router.post('/departments', requireAdmin, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const csvData = await parseCSV(req.file.path);
    const client = await pool.connect();
    
    let successCount = 0;
    let errors = [];

    try {
      await client.query('BEGIN');

      for (const [index, row] of csvData.entries()) {
        try {
          const code = row.Code || row.code;
          const name = row.Name || row.name || row.Department;
          const description = row.Description || row.description || '';
          const hodEmail = row['Head of Department Email'] || row.hod_email || '';
          
          if (!name) {
            errors.push(`Row ${index + 2}: Missing department name`);
            continue;
          }

          // Create department code from name if not provided
          const finalCode = code || name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();

          await client.query(
            'INSERT INTO departments (code, name, description) VALUES ($1, $2, $3) ON CONFLICT (code) DO UPDATE SET name = $2, description = $3',
            [finalCode, name.trim(), description.trim()]
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
    } finally {
      client.release();
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Successfully imported ${successCount} departments`,
      details: {
        totalRows: csvData.length,
        successCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Department upload error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

// Upload programs (CRITICAL)
router.post('/programs', requireAdmin, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const csvData = await parseCSV(req.file.path);
    const client = await pool.connect();
    
    let successCount = 0;
    let errors = [];

    try {
      await client.query('BEGIN');

      for (const [index, row] of csvData.entries()) {
        try {
          const code = row.Code || row.code;
          const name = row.Name || row.name;
          const departmentCode = row['Department Code'] || row.department_code;
          const durationYears = row['Duration Years'] || row.duration_years || 4;
          const totalSemesters = row['Total Semesters'] || row.total_semesters || 8;
          const description = row.Description || row.description || '';
          
          if (!code || !name || !departmentCode) {
            errors.push(`Row ${index + 2}: Missing required fields (Code, Name, Department Code)`);
            continue;
          }

          // Get department ID
          const deptResult = await client.query('SELECT id FROM departments WHERE code = $1', [departmentCode]);
          if (deptResult.rows.length === 0) {
            errors.push(`Row ${index + 2}: Department code '${departmentCode}' not found`);
            continue;
          }

          await client.query(
            'INSERT INTO programs (code, name, department_id, duration_years, total_semesters, description) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (code) DO UPDATE SET name = $2, department_id = $3, duration_years = $4, total_semesters = $5, description = $6',
            [code.trim(), name.trim(), deptResult.rows[0].id, parseInt(durationYears), parseInt(totalSemesters), description.trim()]
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
    } finally {
      client.release();
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Successfully imported ${successCount} programs`,
      details: {
        totalRows: csvData.length,
        successCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Programs upload error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

// Upload student enrollments (CRITICAL for scheduling)
router.post('/student_enrollments', requireAdmin, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const csvData = await parseCSV(req.file.path);
    const client = await pool.connect();
    
    let successCount = 0;
    let errors = [];

    try {
      await client.query('BEGIN');

      for (const [index, row] of csvData.entries()) {
        try {
          const studentId = row['Student ID'] || row.student_id;
          const courseCode = row['Course Code'] || row.course_code;
          const academicYear = row['Academic Year'] || row.academic_year;
          const semester = row.Semester || row.semester;
          const enrollmentDate = row['Enrollment Date'] || row.enrollment_date || new Date().toISOString().split('T')[0];
          const status = row.Status || row.status || 'enrolled';
          
          if (!studentId || !courseCode || !academicYear || !semester) {
            errors.push(`Row ${index + 2}: Missing required fields (Student ID, Course Code, Academic Year, Semester)`);
            continue;
          }

          // Get student and course IDs
          const studentResult = await client.query('SELECT id FROM students WHERE student_id = $1', [studentId]);
          const courseResult = await client.query('SELECT id FROM courses WHERE course_code = $1', [courseCode]);
          
          if (studentResult.rows.length === 0) {
            errors.push(`Row ${index + 2}: Student ID '${studentId}' not found`);
            continue;
          }
          
          if (courseResult.rows.length === 0) {
            errors.push(`Row ${index + 2}: Course code '${courseCode}' not found`);
            continue;
          }

          await client.query(
            'INSERT INTO enrollments (student_id, course_id, semester, academic_year, enrollment_date, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (student_id, course_id, academic_year) DO UPDATE SET semester = $3, enrollment_date = $5, status = $6',
            [studentResult.rows[0].id, courseResult.rows[0].id, parseInt(semester), academicYear.trim(), enrollmentDate, status.trim()]
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
    } finally {
      client.release();
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Successfully imported ${successCount} student enrollments`,
      details: {
        totalRows: csvData.length,
        successCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Student enrollments upload error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

// Add more upload endpoints for other data types here (classrooms, faculty, students, etc.)
// ... (Similar pattern for other endpoints)

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
    res.status(500).json({ success: false, message: 'Failed to get statistics' });
  }
});

module.exports = router;