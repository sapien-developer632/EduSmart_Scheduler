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
              📅 Timetable
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

            <section className="section">
              <h2>📅 Timetable Generation</h2>
              <div className="timetable-controls">
                <button className="primary-btn">Generate New Timetable</button>
                <button className="secondary-btn">View Current Timetable</button>
                <button className="secondary-btn">Resolve Conflicts</button>
              </div>
            </section>

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
                    <button>📅 My Schedule</button>
                  </>
                )}
                {user?.role === 'student' && (
                  <>
                    <button>📚 My Courses</button>
                    <button>📅 My Timetable</button>
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
            <h2>📅 Timetable Management</h2>
            <div className="timetable-placeholder">
              <div className="placeholder-content">
                <h3>🚧 Timetable Feature Coming Soon</h3>
                <p>The timetable generation and viewing feature will be available here.</p>
                <p>Features will include:</p>
                <ul>
                  <li>📊 Visual timetable grid</li>
                  <li>🔄 Automatic conflict resolution</li>
                  <li>📱 Mobile-friendly schedule view</li>
                  <li>📧 Schedule notifications</li>
                  <li>📈 Resource utilization analytics</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;