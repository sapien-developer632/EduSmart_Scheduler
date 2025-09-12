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
  if (!authHeader || !authHeader.includes('admin')) {
    return res.status(401).json({ success: false, message: 'Access denied. Admin only.' });
  }
  next();
};

// CSV Template downloads based on your actual format
router.get('/templates/:type', requireAdmin, (req, res) => {
  const { type } = req.params;
  
  const templates = {
    departments: 'name,description\nComputer Science and Engineering,Department of CSE\nElectronics and Communication Engineering,Department of ECE\nMechanical Engineering,Department of ME',
    
    classrooms: 'Room Number,Capacity,Type\nC101,50,Class\nC102,50,Class\nLB1,80,Lab\nLB2,80,Lab',
    
    students: 'Name,Roll Number,Mail ID,Department,Semester\nJohn Doe,2024U0001,john.doe@univ.edu,Computer Science and Engineering,1\nJane Smith,2024U0002,jane.smith@univ.edu,Electronics and Communication Engineering,2',
    
    faculty: 'Name,Department,Mail ID,Subjects Taught,Faculty Working Hours per Week,Semester Taught\nDr. John Smith,Computer Science and Engineering,john.smith@univ.edu,Data Structures; Algorithms,15,3;5\nProf. Jane Doe,Electronics and Communication Engineering,jane.doe@univ.edu,Networks; Operating Systems,12,5;6',
    
    subjects: 'Subject Name,Code,Subject Hours per Week,Faculty Name,Semester\nData Structures,CS201,4,Dr. John Smith,3\nAlgorithms,CS301,4,Dr. John Smith,5\nOperating Systems,CS303,4,Prof. Jane Doe,5'
  };

  if (!templates[type]) {
    return res.status(400).json({ success: false, message: 'Invalid template type' });
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

// Upload departments (simplified - just name and description)
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
          const name = row.name || row.Name || row.Department;
          const description = row.description || row.Description || '';
          
          if (!name) {
            errors.push(`Row ${index + 2}: Missing department name`);
            continue;
          }

          // Create department code from name (first 2-3 letters)
          const code = name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();

          await client.query(
            'INSERT INTO departments (code, name, description) VALUES ($1, $2, $3) ON CONFLICT (code) DO UPDATE SET name = $2, description = $3',
            [code, name.trim(), description.trim()]
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

// Upload classrooms (your format: Room Number, Capacity, Type)
router.post('/classrooms', requireAdmin, upload.single('csvFile'), async (req, res) => {
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
          const roomNumber = row['Room Number'] || row.room_number || row.Room;
          const capacity = row.Capacity || row.capacity;
          const type = row.Type || row.type;
          
          if (!roomNumber || !capacity || !type) {
            errors.push(`Row ${index + 2}: Missing required fields (Room Number, Capacity, Type)`);
            continue;
          }

          await client.query(
            'INSERT INTO classrooms (room_code, capacity, type, building) VALUES ($1, $2, $3, $4) ON CONFLICT (room_code) DO UPDATE SET capacity = $2, type = $3',
            [roomNumber.trim(), parseInt(capacity), type.trim(), null]
          );
          successCount++;
        } catch (error) {
          if (error.code === '23505') {
            errors.push(`Row ${index + 2}: Room '${row['Room Number']}' already exists`);
          } else {
            errors.push(`Row ${index + 2}: ${error.message}`);
          }
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
      message: `Successfully imported ${successCount} classrooms`,
      details: {
        totalRows: csvData.length,
        successCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Classroom upload error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

// Upload students (your format: Name, Roll Number, Mail ID, Department, Semester)
router.post('/students', requireAdmin, upload.single('csvFile'), async (req, res) => {
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
          const name = row.Name || row.name;
          const rollNumber = row['Roll Number'] || row.roll_number || row.RollNumber;
          const email = row['Mail ID'] || row.email || row.Email;
          const department = row.Department || row.department;
          const semester = row.Semester || row.semester;
          
          if (!name || !rollNumber || !email || !department) {
            errors.push(`Row ${index + 2}: Missing required fields`);
            continue;
          }

          // Split name into first and last name
          const nameParts = name.trim().split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || '';

          // Get or create department
          let deptResult = await client.query('SELECT id FROM departments WHERE name = $1', [department.trim()]);
          if (deptResult.rows.length === 0) {
            const deptCode = department.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
            const insertDept = await client.query(
              'INSERT INTO departments (code, name) VALUES ($1, $2) RETURNING id',
              [deptCode, department.trim()]
            );
            deptResult = insertDept;
          }

          // Create user first
          const userResult = await client.query(
            'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [
              email.trim(), 
              '$2a$10$defaulthash', // Default password hash
              firstName, 
              lastName, 
              'student'
            ]
          );

          // Create program if not exists (based on department)
          let programResult = await client.query('SELECT id FROM programs WHERE name LIKE $1', [`%${department.split(' ')[0]}%`]);
          if (programResult.rows.length === 0) {
            const programCode = department.replace(/[^A-Za-z]/g, '').substring(0, 5).toUpperCase();
            programResult = await client.query(
              'INSERT INTO programs (code, name, department_id, duration_years) VALUES ($1, $2, $3, $4) RETURNING id',
              [programCode, `Bachelor of ${department}`, deptResult.rows[0].id, 4]
            );
          }

          // Create student record
          await client.query(
            'INSERT INTO students (user_id, program_id, student_id, enrollment_year, current_semester) VALUES ($1, $2, $3, $4, $5)',
            [
              userResult.rows[0].id,
              programResult.rows[0].id,
              rollNumber.trim(),
              new Date().getFullYear(),
              parseInt(semester) || 1
            ]
          );
          successCount++;
        } catch (error) {
          if (error.code === '23505') {
            if (error.constraint?.includes('email')) {
              errors.push(`Row ${index + 2}: Email '${row['Mail ID']}' already exists`);
            } else if (error.constraint?.includes('student_id')) {
              errors.push(`Row ${index + 2}: Roll Number '${row['Roll Number']}' already exists`);
            } else {
              errors.push(`Row ${index + 2}: Duplicate entry`);
            }
          } else {
            errors.push(`Row ${index + 2}: ${error.message}`);
          }
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
      message: `Successfully imported ${successCount} students`,
      details: {
        totalRows: csvData.length,
        successCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Student upload error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

// Upload faculty (your format: Name, Department, Mail ID, Subjects Taught, Faculty Working Hours per Week, Semester Taught)
router.post('/faculty', requireAdmin, upload.single('csvFile'), async (req, res) => {
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
          const name = row.Name || row.name;
          const department = row.Department || row.department;
          const email = row['Mail ID'] || row.email || row.Email;
          const subjectsTaught = row['Subjects Taught'] || row.subjects || '';
          const workingHours = row['Faculty Working Hours per Week'] || row.hours || 0;
          const semestersTaught = row['Semester Taught'] || row.semesters || '';
          
          if (!name || !department || !email) {
            errors.push(`Row ${index + 2}: Missing required fields`);
            continue;
          }

          // Split name
          const nameParts = name.trim().split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || '';

          // Get or create department
          let deptResult = await client.query('SELECT id FROM departments WHERE name = $1', [department.trim()]);
          if (deptResult.rows.length === 0) {
            const deptCode = department.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
            const insertDept = await client.query(
              'INSERT INTO departments (code, name) VALUES ($1, $2) RETURNING id',
              [deptCode, department.trim()]
            );
            deptResult = insertDept;
          }

          // Generate employee ID
          const employeeId = `FAC${String(index + 1).padStart(3, '0')}`;

          // Create user
          const userResult = await client.query(
            'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [
              email.trim(),
              '$2a$10$defaulthash',
              firstName,
              lastName,
              'faculty'
            ]
          );

          // Create faculty record
          await client.query(
            'INSERT INTO faculty (user_id, department_id, employee_id, designation, working_hours_per_week, subjects_taught, semesters_taught) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [
              userResult.rows[0].id,
              deptResult.rows[0].id,
              employeeId,
              name.includes('Dr.') ? 'Professor' : name.includes('Prof.') ? 'Professor' : 'Assistant Professor',
              parseInt(workingHours) || 12,
              subjectsTaught.trim(),
              semestersTaught.trim()
            ]
          );
          successCount++;
        } catch (error) {
          if (error.code === '23505') {
            errors.push(`Row ${index + 2}: Email '${row['Mail ID']}' already exists`);
          } else {
            errors.push(`Row ${index + 2}: ${error.message}`);
          }
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
      message: `Successfully imported ${successCount} faculty members`,
      details: {
        totalRows: csvData.length,
        successCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Faculty upload error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

// Upload subjects (your format: Subject Name, Code, Subject Hours per Week, Faculty Name, Semester)
router.post('/subjects', requireAdmin, upload.single('csvFile'), async (req, res) => {
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
          const subjectName = row['Subject Name'] || row.subject || row.title;
          const code = row.Code || row.code;
          const hoursPerWeek = row['Subject Hours per Week'] || row.hours || 0;
          const facultyName = row['Faculty Name'] || row.faculty;
          const semester = row.Semester || row.semester;
          
          if (!subjectName || !code) {
            errors.push(`Row ${index + 2}: Missing required fields (Subject Name, Code)`);
            continue;
          }

          // Determine department from code (e.g., CS201 -> CS)
          const deptCode = code.replace(/[0-9]/g, '').toUpperCase();
          let deptResult = await client.query('SELECT id FROM departments WHERE code = $1', [deptCode]);
          
          if (deptResult.rows.length === 0) {
            // Create department if not exists
            const deptName = deptCode === 'CS' ? 'Computer Science and Engineering' : 
                             deptCode === 'EC' ? 'Electronics and Communication Engineering' :
                             deptCode === 'ME' ? 'Mechanical Engineering' : 'General';
            deptResult = await client.query(
              'INSERT INTO departments (code, name) VALUES ($1, $2) RETURNING id',
              [deptCode, deptName]
            );
          }

          // Create course/subject record
          await client.query(
            'INSERT INTO courses (course_code, title, credits, department_id, hours_per_week, assigned_faculty, semester) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [
              code.trim(),
              subjectName.trim(),
              Math.ceil(parseInt(hoursPerWeek) / 2) || 3, // Convert hours to credits
              deptResult.rows[0].id,
              parseInt(hoursPerWeek) || 3,
              facultyName?.trim() || null,
              parseInt(semester) || null
            ]
          );
          successCount++;
        } catch (error) {
          if (error.code === '23505') {
            errors.push(`Row ${index + 2}: Subject code '${row.Code}' already exists`);
          } else {
            errors.push(`Row ${index + 2}: ${error.message}`);
          }
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
      message: `Successfully imported ${successCount} subjects`,
      details: {
        totalRows: csvData.length,
        successCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Subject upload error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
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
    res.status(500).json({ success: false, message: 'Failed to get statistics' });
  }
});

module.exports = router;