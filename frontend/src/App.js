import React, { useState, useEffect } from 'react';
import DataUpload from './DataUpload';
import './App.css';

function App() {
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [activeSection, setActiveSection] = useState('dashboard');

  // Check backend connection
  useEffect(() => {
    checkBackendHealth();
    if (isLoggedIn) {
      fetchCourses();
    }
  }, [isLoggedIn]);

  // Check for existing session on load
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  const checkBackendHealth = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        setBackendStatus('✅ Connected');
      } else {
        setBackendStatus('❌ Backend Error');
      }
    } catch (error) {
      setBackendStatus('❌ Connection Failed');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      
      const data = await response.json();
      if (data.success) {
        setIsLoggedIn(true);
        setUser(data.user);
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        alert('Login failed: ' + data.message);
      }
    } catch (error) {
      alert('Login error: ' + error.message);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setCourses([]);
    setLoginForm({ email: '', password: '' });
    setActiveSection('dashboard');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  if (!isLoggedIn) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>🎓 EduSmart Scheduler</h1>
          <p>University Timetable Management System</p>
          <div className="status">Backend Status: {backendStatus}</div>
          
          <div className="login-form">
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  required
                />
              </div>
              <button type="submit">Login</button>
            </form>
            <div className="demo-credentials">
              <p><strong>Demo Credentials:</strong></p>
              <p>Admin: admin@university.edu / admin123</p>
              <p>Faculty: faculty@university.edu / faculty123</p>
              <p>Student: student@university.edu / student123</p>
            </div>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="nav-bar">
          <h1>🎓 EduSmart Scheduler</h1>
          <div className="nav-menu">
            <button 
              className={activeSection === 'dashboard' ? 'nav-active' : ''}
              onClick={() => setActiveSection('dashboard')}
            >
              📊 Dashboard
            </button>
            {user?.role === 'admin' && (
              <button 
                className={activeSection === 'data-upload' ? 'nav-active' : ''}
                onClick={() => setActiveSection('data-upload')}
              >
                📤 Data Upload
              </button>
            )}
            <button 
              className={activeSection === 'timetable' ? 'nav-active' : ''}
              onClick={() => setActiveSection('timetable')}
            >
              📅 {user?.role === 'admin' ? 'Timetable Management' : user?.role === 'faculty' ? 'My Schedule' : 'My Timetable'}
            </button>
          </div>
          <div className="user-info">
            <span className="user-welcome">
              Welcome, {user?.name} 
              <span className="user-role">({user?.role})</span>
            </span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>
      
      <main className="App-main">
        <div className="status-bar">
          <span>Backend Status: {backendStatus}</span>
        </div>

        {activeSection === 'dashboard' && (
          <div className="dashboard">
            <section className="section">
              <h2>📚 Course Management</h2>
              <div className="courses-list">
                {courses.length > 0 ? (
                  <div className="courses-grid">
                    {courses.map(course => (
                      <div key={course.id} className="course-card">
                        <h3>{course.code}</h3>
                        <p>{course.title}</p>
                        <p>Credits: {course.credits}</p>
                        <p>Department: {course.department}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Loading courses...</p>
                )}
              </div>
            </section>

            {/* ADMIN ONLY - Timetable Generation */}
            {user?.role === 'admin' && (
              <section className="section">
                <h2>📅 Timetable Generation</h2>
                <div className="timetable-controls">
                  <button className="primary-btn">Generate New Timetable</button>
                  <button className="secondary-btn">View Current Timetable</button>
                  <button className="secondary-btn">Resolve Conflicts</button>
                </div>
                <div className="admin-note">
                  <p><strong>Admin Controls:</strong> Generate and manage university-wide timetables</p>
                </div>
              </section>
            )}

            {/* FACULTY - Schedule Overview */}
            {user?.role === 'faculty' && (
              <section className="section">
                <h2>📅 My Teaching Schedule</h2>
                <div className="faculty-schedule">
                  <button className="primary-btn" onClick={() => setActiveSection('timetable')}>
                    📅 View My Schedule
                  </button>
                  <button className="secondary-btn">📊 My Course Load</button>
                  <button className="secondary-btn">👨‍🎓 My Students</button>
                </div>
                <div className="faculty-note">
                  <p><strong>Faculty View:</strong> Access your teaching schedule and course information</p>
                </div>
              </section>
            )}

            {/* STUDENT - Timetable Access */}
            {user?.role === 'student' && (
              <section className="section">
                <h2>📅 My Class Schedule</h2>
                <div className="student-timetable">
                  <button className="primary-btn" onClick={() => setActiveSection('timetable')}>
                    📅 View My Timetable
                  </button>
                  <button className="secondary-btn">📚 My Enrolled Courses</button>
                  <button className="secondary-btn">📊 My Academic Progress</button>
                </div>
                <div className="student-note">
                  <p><strong>Student View:</strong> Access your personal class schedule and course information</p>
                </div>
              </section>
            )}

            <section className="section">
              <h2>👥 Quick Actions</h2>
              <div className="quick-actions">
                {user?.role === 'admin' && (
                  <>
                    <button onClick={() => setActiveSection('data-upload')}>
                      📤 Import Data
                    </button>
                    <button>👨‍🎓 Manage Students</button>
                    <button>👩‍🏫 Manage Faculty</button>
                    <button>🏛️ Manage Classrooms</button>
                  </>
                )}
                {user?.role === 'faculty' && (
                  <>
                    <button>📋 My Courses</button>
                    <button>👨‍🎓 My Students</button>
                    <button onClick={() => setActiveSection('timetable')}>📅 My Schedule</button>
                  </>
                )}
                {user?.role === 'student' && (
                  <>
                    <button>📚 My Courses</button>
                    <button onClick={() => setActiveSection('timetable')}>📅 My Timetable</button>
                    <button>📊 My Grades</button>
                  </>
                )}
                <button>📊 View Reports</button>
              </div>
            </section>

            {user?.role === 'admin' && (
              <section className="section">
                <h2>🔧 System Administration</h2>
                <div className="admin-controls">
                  <div className="admin-info">
                    <p>
                      <strong>System Role:</strong> You have full administrative access to manage all university data, 
                      upload CSV files, generate timetables, and configure system settings.
                    </p>
                  </div>
                  <div className="admin-actions">
                    <button 
                      className="primary-btn"
                      onClick={() => setActiveSection('data-upload')}
                    >
                      📊 Upload University Data
                    </button>
                    <button className="secondary-btn">🔧 System Settings</button>
                    <button className="secondary-btn">📈 Analytics Dashboard</button>
                    <button className="secondary-btn">🔄 Database Backup</button>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {activeSection === 'data-upload' && user?.role === 'admin' && (
          <DataUpload />
        )}

        {activeSection === 'timetable' && (
          <div className="timetable-section">
            {user?.role === 'admin' && (
              <>
                <h2>📅 Timetable Management</h2>
                <div className="admin-timetable-controls">
                  <div className="timetable-generation">
                    <h3>🛠️ Generation Controls</h3>
                    <div className="generation-buttons">
                      <button className="primary-btn">🔄 Generate New Timetable</button>
                      <button className="secondary-btn">📊 View Generation History</button>
                      <button className="secondary-btn">⚠️ Resolve Conflicts</button>
                      <button className="secondary-btn">📈 Optimization Settings</button>
                    </div>
                  </div>
                  <div className="timetable-overview">
                    <h3>📋 Current Timetables</h3>
                    <div className="timetable-list">
                      <div className="timetable-item">
                        <span>Fall 2024 - Active</span>
                        <button>View</button>
                        <button>Edit</button>
                      </div>
                      <div className="timetable-item">
                        <span>Spring 2025 - Draft</span>
                        <button>View</button>
                        <button>Activate</button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {user?.role === 'faculty' && (
              <>
                <h2>📅 My Teaching Schedule</h2>
                <div className="faculty-timetable">
                  <div className="schedule-overview">
                    <h3>📊 This Week's Classes</h3>
                    <div className="weekly-schedule">
                      <div className="schedule-day">
                        <h4>Monday</h4>
                        <div className="class-slot">
                          <span className="time">09:00-10:30</span>
                          <span className="course">CS101 - Room C101</span>
                        </div>
                        <div className="class-slot">
                          <span className="time">14:00-15:30</span>
                          <span className="course">CS201 - Room C102</span>
                        </div>
                      </div>
                      <div className="schedule-day">
                        <h4>Tuesday</h4>
                        <div className="class-slot">
                          <span className="time">10:15-11:45</span>
                          <span className="course">CS101 Lab - Room LB1</span>
                        </div>
                      </div>
                      {/* Add more days as needed */}
                    </div>
                  </div>
                  <div className="faculty-actions">
                    <button className="primary-btn">📥 Download Schedule</button>
                    <button className="secondary-btn">📧 Email Schedule</button>
                    <button className="secondary-btn">🗓️ View Full Semester</button>
                  </div>
                </div>
              </>
            )}

            {user?.role === 'student' && (
              <>
                <h2>📅 My Class Timetable</h2>
                <div className="student-timetable">
                  <div className="timetable-header">
                    <h3>📚 Fall 2024 Semester</h3>
                    <div className="semester-info">
                      <span>Enrolled Courses: 6</span>
                      <span>Total Credits: 18</span>
                    </div>
                  </div>
                  
                  <div className="weekly-timetable">
                    <table className="timetable-grid">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Monday</th>
                          <th>Tuesday</th>
                          <th>Wednesday</th>
                          <th>Thursday</th>
                          <th>Friday</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>09:00-10:30</td>
                          <td className="class-cell">
                            <div className="class-info">
                              <strong>CS101</strong><br/>
                              <span>Intro to Programming</span><br/>
                              <span className="room">Room: C101</span>
                            </div>
                          </td>
                          <td></td>
                          <td className="class-cell">
                            <div className="class-info">
                              <strong>MATH201</strong><br/>
                              <span>Calculus II</span><br/>
                              <span className="room">Room: M201</span>
                            </div>
                          </td>
                          <td></td>
                          <td className="class-cell">
                            <div className="class-info">
                              <strong>PHY101</strong><br/>
                              <span>Physics I</span><br/>
                              <span className="room">Room: P101</span>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td>10:45-12:15</td>
                          <td></td>
                          <td className="class-cell">
                            <div className="class-info">
                              <strong>ENG101</strong><br/>
                              <span>English Composition</span><br/>
                              <span className="room">Room: E101</span>
                            </div>
                          </td>
                          <td></td>
                          <td className="class-cell">
                            <div className="class-info">
                              <strong>CS101</strong><br/>
                              <span>Intro to Programming</span><br/>
                              <span className="room">Room: C101</span>
                            </div>
                          </td>
                          <td></td>
                        </tr>
                        <tr>
                          <td>13:30-15:00</td>
                          <td className="class-cell">
                            <div className="class-info">
                              <strong>HIST101</strong><br/>
                              <span>World History</span><br/>
                              <span className="room">Room: H101</span>
                            </div>
                          </td>
                          <td></td>
                          <td className="class-cell">
                            <div className="class-info">
                              <strong>CS101L</strong><br/>
                              <span>Programming Lab</span><br/>
                              <span className="room">Room: LB1</span>
                            </div>
                          </td>
                          <td></td>
                          <td className="class-cell">
                            <div className="class-info">
                              <strong>MATH201</strong><br/>
                              <span>Calculus II</span><br/>
                              <span className="room">Room: M201</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="student-actions">
                    <button className="primary-btn">📥 Download Timetable</button>
                    <button className="secondary-btn">📧 Email to Parents</button>
                    <button className="secondary-btn">📱 Add to Calendar</button>
                    <button className="secondary-btn">🗓️ View Exam Schedule</button>
                  </div>

                  <div className="course-list">
                    <h3>📚 Enrolled Courses</h3>
                    <div className="courses-enrolled">
                      <div className="course-item">
                        <span className="course-code">CS101</span>
                        <span className="course-name">Introduction to Programming</span>
                        <span className="credits">4 credits</span>
                        <span className="faculty">Dr. Smith</span>
                      </div>
                      <div className="course-item">
                        <span className="course-code">MATH201</span>
                        <span className="course-name">Calculus II</span>
                        <span className="credits">3 credits</span>
                        <span className="faculty">Prof. Johnson</span>
                      </div>
                      <div className="course-item">
                        <span className="course-code">PHY101</span>
                        <span className="course-name">Physics I</span>
                        <span className="credits">4 credits</span>
                        <span className="faculty">Dr. Wilson</span>
                      </div>
                      <div className="course-item">
                        <span className="course-code">ENG101</span>
                        <span className="course-name">English Composition</span>
                        <span className="credits">3 credits</span>
                        <span className="faculty">Prof. Davis</span>
                      </div>
                      <div className="course-item">
                        <span className="course-code">HIST101</span>
                        <span className="course-name">World History</span>
                        <span className="credits">3 credits</span>
                        <span className="faculty">Dr. Brown</span>
                      </div>
                      <div className="course-item">
                        <span className="course-code">CS101L</span>
                        <span className="course-name">Programming Lab</span>
                        <span className="credits">1 credit</span>
                        <span className="faculty">TA: Mike</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Fallback for unknown roles */}
            {!['admin', 'faculty', 'student'].includes(user?.role) && (
              <div className="timetable-placeholder">
                <div className="placeholder-content">
                  <h3>🚧 Timetable Feature</h3>
                  <p>Access is based on your user role. Please contact admin for assistance.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;