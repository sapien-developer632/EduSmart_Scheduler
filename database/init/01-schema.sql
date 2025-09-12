-- Updated EduSmart Scheduler Database Schema
-- Adapted for real university data structure with roll numbers, subject assignments, and semester tracking

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS timetable_entries CASCADE;
DROP TABLE IF EXISTS timetables CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS course_assignments CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS classrooms CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS faculty CASCADE;
DROP TABLE IF EXISTS programs CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with enhanced fields
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'faculty', 'student')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create departments table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    head_of_department INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create programs table
CREATE TABLE programs (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    duration_years INTEGER DEFAULT 4,
    total_semesters INTEGER DEFAULT 8,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create faculty table with additional fields for subject assignments
CREATE TABLE faculty (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    designation VARCHAR(100),
    working_hours_per_week INTEGER DEFAULT 20,
    subjects_taught TEXT, -- Semicolon separated list
    semesters_taught TEXT, -- Semicolon separated list of semester numbers
    specialization TEXT,
    qualification TEXT,
    experience_years INTEGER,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create batches table for student cohorts
CREATE TABLE batches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- e.g., "2024-2028"
    program_id INTEGER REFERENCES programs(id),
    start_year INTEGER NOT NULL,
    end_year INTEGER NOT NULL,
    current_semester INTEGER DEFAULT 1,
    total_students INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create students table with roll number and semester tracking
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    program_id INTEGER REFERENCES programs(id),
    batch_id INTEGER REFERENCES batches(id),
    student_id VARCHAR(50) UNIQUE NOT NULL, -- Roll Number like 2023U0001
    enrollment_year INTEGER NOT NULL,
    current_semester INTEGER DEFAULT 1,
    cgpa DECIMAL(4,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'dropped')),
    guardian_name VARCHAR(255),
    guardian_phone VARCHAR(20),
    address TEXT,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create classrooms table (matches user's CSV structure)
CREATE TABLE classrooms (
    id SERIAL PRIMARY KEY,
    room_code VARCHAR(50) UNIQUE NOT NULL, -- Room Number like C101, LB1
    building VARCHAR(100),
    floor INTEGER,
    capacity INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL, -- Class, Lab, etc.
    equipment JSONB, -- Store equipment list as JSON
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create courses/subjects table (enhanced for user's data)
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    course_code VARCHAR(20) UNIQUE NOT NULL, -- CS201, CS301, etc.
    title VARCHAR(255) NOT NULL, -- Subject Name
    description TEXT,
    credits DECIMAL(3,1) DEFAULT 3.0,
    hours_per_week INTEGER DEFAULT 3, -- Subject Hours per Week
    department_id INTEGER REFERENCES departments(id),
    semester INTEGER, -- Which semester this course is taught in
    assigned_faculty VARCHAR(255), -- Faculty Name from CSV
    course_type VARCHAR(20) DEFAULT 'theory' CHECK (course_type IN ('theory', 'lab', 'project')),
    prerequisites TEXT, -- List of prerequisite courses
    is_elective BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create course assignments table for faculty-course relationships
CREATE TABLE course_assignments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id),
    faculty_id INTEGER REFERENCES faculty(id),
    semester INTEGER NOT NULL,
    academic_year VARCHAR(10) NOT NULL, -- e.g., "2024-25"
    section VARCHAR(10) DEFAULT 'A',
    max_students INTEGER DEFAULT 60,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, faculty_id, semester, academic_year, section)
);

-- Create enrollments table for student-course relationships
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    course_id INTEGER REFERENCES courses(id),
    semester INTEGER NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    grade VARCHAR(5),
    credits_earned DECIMAL(3,1) DEFAULT 0,
    attendance_percentage DECIMAL(5,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'dropped', 'completed')),
    UNIQUE(student_id, course_id, academic_year)
);

-- Create timetables table for generated schedules
CREATE TABLE timetables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    semester INTEGER NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    program_id INTEGER REFERENCES programs(id),
    batch_id INTEGER REFERENCES batches(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    generation_algorithm VARCHAR(50) DEFAULT 'genetic',
    fitness_score DECIMAL(10,4),
    conflicts_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP
);

-- Create timetable entries table for individual schedule slots
CREATE TABLE timetable_entries (
    id SERIAL PRIMARY KEY,
    timetable_id INTEGER REFERENCES timetables(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id),
    faculty_id INTEGER REFERENCES faculty(id),
    classroom_id INTEGER REFERENCES classrooms(id),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    entry_type VARCHAR(20) DEFAULT 'lecture' CHECK (entry_type IN ('lecture', 'lab', 'tutorial', 'break')),
    section VARCHAR(10) DEFAULT 'A',
    max_students INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_time_overlap UNIQUE (classroom_id, day_of_week, start_time, end_time),
    CONSTRAINT no_faculty_conflict UNIQUE (faculty_id, day_of_week, start_time, end_time),
    CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Create time slots table for standard university time periods
CREATE TABLE time_slots (
    id SERIAL PRIMARY KEY,
    slot_name VARCHAR(50) NOT NULL, -- e.g., "Period 1", "Morning Lab"
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    slot_type VARCHAR(20) DEFAULT 'lecture' CHECK (slot_type IN ('lecture', 'lab', 'break', 'lunch')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit logs table for tracking changes
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by INTEGER REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Insert default admin user
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES ('admin@university.edu', '$2a$10$rKlgJkgL.gGgJwJwJwJwJOm9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K', 'System', 'Administrator', 'admin');

-- Insert sample departments based on user's data
INSERT INTO departments (code, name, description) VALUES
('CSE', 'Computer Science and Engineering', 'Department of Computer Science and Engineering'),
('ECE', 'Electronics and Communication Engineering', 'Department of Electronics and Communication Engineering'),
('ME', 'Mechanical Engineering', 'Department of Mechanical Engineering');

-- Insert standard time slots
INSERT INTO time_slots (slot_name, start_time, end_time, duration_minutes, slot_type) VALUES
('Period 1', '09:00:00', '10:00:00', 60, 'lecture'),
('Period 2', '10:15:00', '11:15:00', 60, 'lecture'),
('Period 3', '11:30:00', '12:30:00', 60, 'lecture'),
('Lunch Break', '12:30:00', '13:30:00', 60, 'lunch'),
('Period 4', '13:30:00', '14:30:00', 60, 'lecture'),
('Period 5', '14:45:00', '15:45:00', 60, 'lecture'),
('Lab Session 1', '09:00:00', '12:00:00', 180, 'lab'),
('Lab Session 2', '13:30:00', '16:30:00', 180, 'lab');

-- Create indexes for better performance
CREATE INDEX idx_students_roll_number ON students(student_id);
CREATE INDEX idx_students_semester ON students(current_semester);
CREATE INDEX idx_courses_code ON courses(course_code);
CREATE INDEX idx_courses_semester ON courses(semester);
CREATE INDEX idx_faculty_employee_id ON faculty(employee_id);
CREATE INDEX idx_timetable_entries_day_time ON timetable_entries(day_of_week, start_time);
CREATE INDEX idx_enrollments_student_semester ON enrollments(student_id, semester);
CREATE INDEX idx_course_assignments_semester ON course_assignments(semester, academic_year);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faculty_updated_at BEFORE UPDATE ON faculty FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO edusmart_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO edusmart_user;