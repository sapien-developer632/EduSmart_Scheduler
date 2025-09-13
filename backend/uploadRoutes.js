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
    academic_terms: 'Name,Start Date,End Date,Academic Year,Status\nFall 2024,15-08-2024,20-12-2024,2024-25,active\nSpring 2025,15-01-2025,15-05-2025,2024-25,upcoming\nSummer 2025,01-06-2025,31-07-2025,2024-25,upcoming',
    
    programs: 'Code,Name,Department Code,Duration Years,Total Semesters,Description\nCSE-BTECH,B.Tech Computer Science and Engineering,CSE,4,8,Four year undergraduate program\nECE-BTECH,B.Tech Electronics and Communication,ECE,4,8,Four year undergraduate program',
    

    
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
          const name = row.Name || row.name;
          const startDateRaw = row['Start Date'] || row.start_date;
          const endDateRaw = row['End Date'] || row.end_date;
          const academicYear = row['Academic Year'] || row.academic_year;
          const status = row.Status || row.status || 'upcoming';
          
          if (!name || !startDateRaw || !endDateRaw || !academicYear) {
            errors.push(`Row ${index + 2}: Missing required fields (Name, Start Date, End Date, Academic Year)`);
            continue;
          }

          // Convert date formats
          const startDate = convertDateFormat(startDateRaw.trim());
          const endDate = convertDateFormat(endDateRaw.trim());

          if (!startDate) {
            errors.push(`Row ${index + 2}: Invalid start date format '${startDateRaw}'. Use DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD`);
            continue;
          }

          if (!endDate) {
            errors.push(`Row ${index + 2}: Invalid end date format '${endDateRaw}'. Use DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD`);
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

// Automatic Batch Generation Algorithm
router.post('/generate-batches', requireAdmin, async (req, res) => {
  try {
    const { academicYear, semester } = req.body;
    
    if (!academicYear || !semester) {
      return res.status(400).json({ 
        success: false, 
        message: 'Academic year and semester are required' 
      });
    }

    const client = await pool.connect();
    let successCount = 0;
    let errors = [];
    let batchesCreated = [];

    try {
      await client.query('BEGIN');

      // Get all students with their enrollments for the specified academic year and semester
      const studentsQuery = `
        SELECT DISTINCT 
          s.id as student_id,
          s.student_id as roll_number,
          s.program_id,
          s.enrollment_year,
          p.code as program_code,
          p.name as program_name,
          d.code as department_code,
          STRING_AGG(c.course_code, ',' ORDER BY c.course_code) as enrolled_courses,
          COUNT(e.course_id) as course_count
        FROM students s
        JOIN programs p ON s.program_id = p.id
        JOIN departments d ON p.department_id = d.id
        JOIN enrollments e ON s.id = e.student_id
        JOIN courses c ON e.course_id = c.id
        WHERE e.academic_year = $1 AND e.semester = $2 AND s.deleted_at IS NULL
        GROUP BY s.id, s.student_id, s.program_id, s.enrollment_year, p.code, p.name, d.code
        ORDER BY p.code, s.enrollment_year, enrolled_courses
      `;

      const studentsResult = await client.query(studentsQuery, [academicYear, semester]);
      const students = studentsResult.rows;

      if (students.length === 0) {
        return res.json({
          success: false,
          message: 'No student enrollments found for the specified academic year and semester'
        });
      }

      // Group students by program and enrollment year first
      const programGroups = {};
      
      students.forEach(student => {
        const programKey = `${student.program_code}-${student.enrollment_year}`;
        if (!programGroups[programKey]) {
          programGroups[programKey] = {
            program_id: student.program_id,
            program_code: student.program_code,
            program_name: student.program_name,
            department_code: student.department_code,
            enrollment_year: student.enrollment_year,
            students: []
          };
        }
        programGroups[programKey].students.push(student);
      });

      // Create batches for each program group
      for (const [programKey, group] of Object.entries(programGroups)) {
        // Further group by similar course patterns within each program
        const coursePatterns = {};
        
        group.students.forEach(student => {
          const coursePattern = student.enrolled_courses;
          if (!coursePatterns[coursePattern]) {
            coursePatterns[coursePattern] = [];
          }
          coursePatterns[coursePattern].push(student);
        });

        // Create batches based on course patterns and optimal size (30-60 students per batch)
        const maxBatchSize = 60;
        const minBatchSize = 20;
        let batchCounter = 1;

        for (const [coursePattern, patternStudents] of Object.entries(coursePatterns)) {
          // If pattern group is too large, split into multiple batches
          if (patternStudents.length > maxBatchSize) {
            const numBatches = Math.ceil(patternStudents.length / maxBatchSize);
            const studentsPerBatch = Math.ceil(patternStudents.length / numBatches);
            
            for (let i = 0; i < numBatches; i++) {
              const batchStudents = patternStudents.slice(i * studentsPerBatch, (i + 1) * studentsPerBatch);
              await createBatch(client, group, batchCounter, batchStudents, academicYear, semester);
              batchCounter++;
              successCount++;
            }
          } 
          // If pattern group is too small, try to merge with similar patterns or create mixed batch
          else if (patternStudents.length < minBatchSize) {
            // For now, create batch anyway but mark it for potential merging
            await createBatch(client, group, batchCounter, patternStudents, academicYear, semester);
            batchCounter++;
            successCount++;
          }
          // Optimal size - create single batch
          else {
            await createBatch(client, group, batchCounter, patternStudents, academicYear, semester);
            batchCounter++;
            successCount++;
          }
        }
      }

      await client.query('COMMIT');

      // Get created batches for response
      const batchesQuery = `
        SELECT b.*, p.name as program_name, COUNT(s.id) as actual_student_count
        FROM batches b
        JOIN programs p ON b.program_id = p.id
        LEFT JOIN students s ON b.id = s.batch_id AND s.deleted_at IS NULL
        WHERE b.name LIKE $1
        GROUP BY b.id, p.name
        ORDER BY b.name
      `;
      
      const batchesResult = await client.query(batchesQuery, [`%${academicYear}%`]);
      batchesCreated = batchesResult.rows;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      message: `Successfully created ${successCount} batches using intelligent grouping algorithm`,
      details: {
        batchesCreated: successCount,
        totalStudentsProcessed: studentsResult.rows.length,
        errorCount: errors.length,
        errors: errors.slice(0, 10),
        batches: batchesCreated
      }
    });

  } catch (error) {
    console.error('Batch generation error:', error);
    res.status(500).json({ success: false, message: 'Batch generation failed', error: error.message });
  }
});

// Helper function to create a batch
async function createBatch(client, programGroup, batchNumber, students, academicYear, semester) {
  const batchName = `${programGroup.program_code}-${programGroup.enrollment_year}-B${batchNumber}`;
  const endYear = programGroup.enrollment_year + 4; // Assuming 4-year programs
  
  // Insert batch
  const batchResult = await client.query(
    'INSERT INTO batches (name, program_id, start_year, end_year, current_semester, total_students) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (name) DO UPDATE SET total_students = $6 RETURNING id',
    [batchName, programGroup.program_id, programGroup.enrollment_year, endYear, semester, students.length]
  );
  
  const batchId = batchResult.rows[0].id;
  
  // Update students to assign them to this batch
  const studentIds = students.map(s => s.student_id);
  if (studentIds.length > 0) {
    await client.query(
      'UPDATE students SET batch_id = $1 WHERE id = ANY($2)',
      [batchId, studentIds]
    );
  }
  
  return batchId;
}

// Get batch analysis and suggestions
router.get('/batch-analysis/:academicYear/:semester', requireAdmin, async (req, res) => {
  try {
    const { academicYear, semester } = req.params;
    const client = await pool.connect();

    // Analyze current enrollments for batch generation readiness
    const analysisQuery = `
      SELECT 
        p.code as program_code,
        p.name as program_name,
        d.code as department_code,
        s.enrollment_year,
        COUNT(DISTINCT s.id) as total_students,
        COUNT(DISTINCT c.course_code) as unique_courses,
        STRING_AGG(DISTINCT c.course_code, ', ' ORDER BY c.course_code) as course_list,
        ROUND(AVG(student_course_count.course_count), 2) as avg_courses_per_student
      FROM students s
      JOIN programs p ON s.program_id = p.id
      JOIN departments d ON p.department_id = d.id
      JOIN enrollments e ON s.id = e.student_id
      JOIN courses c ON e.course_id = c.id
      JOIN (
        SELECT s.id, COUNT(e.course_id) as course_count
        FROM students s
        JOIN enrollments e ON s.id = e.student_id
        WHERE e.academic_year = $1 AND e.semester = $2
        GROUP BY s.id
      ) student_course_count ON s.id = student_course_count.id
      WHERE e.academic_year = $1 AND e.semester = $2 AND s.deleted_at IS NULL
      GROUP BY p.code, p.name, d.code, s.enrollment_year
      ORDER BY p.code, s.enrollment_year
    `;

    const analysisResult = await client.query(analysisQuery, [academicYear, semester]);
    
    // Check existing batches
    const existingBatchesQuery = `
      SELECT b.*, p.code as program_code, COUNT(s.id) as current_students
      FROM batches b
      JOIN programs p ON b.program_id = p.id
      LEFT JOIN students s ON b.id = s.batch_id AND s.deleted_at IS NULL
      GROUP BY b.id, p.code
      ORDER BY b.name
    `;
    
    const existingBatchesResult = await client.query(existingBatchesQuery);
    
    client.release();

    res.json({
      success: true,
      analysis: {
        programDistribution: analysisResult.rows,
        existingBatches: existingBatchesResult.rows,
        recommendations: generateBatchRecommendations(analysisResult.rows)
      }
    });

  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({ success: false, message: 'Analysis failed', error: error.message });
  }
});

// Helper function to generate batch recommendations
function generateBatchRecommendations(programData) {
  const recommendations = [];
  
  programData.forEach(program => {
    if (program.total_students > 60) {
      recommendations.push({
        program: program.program_code,
        issue: 'Large cohort',
        suggestion: `Split ${program.total_students} students into ${Math.ceil(program.total_students / 50)} batches`,
        priority: 'high'
      });
    } else if (program.total_students < 20) {
      recommendations.push({
        program: program.program_code,
        issue: 'Small cohort',
        suggestion: `Consider merging with similar program or creating mixed batch`,
        priority: 'medium'
      });
    }
    
    if (program.avg_courses_per_student < 4) {
      recommendations.push({
        program: program.program_code,
        issue: 'Low course load',
        suggestion: 'Verify if all student enrollments are complete',
        priority: 'high'
      });
    }
  });
  
  return recommendations;
}

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