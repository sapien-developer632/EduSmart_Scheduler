import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  // Check backend connection
  useEffect(() => {
    checkBackendHealth();
    if (isLoggedIn) {
      fetchCourses();
    }
  }, [isLoggedIn]);

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
              <p>Email: admin@university.edu</p>
              <p>Password: admin123</p>
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
          <div className="user-info">
            Welcome, {user?.name} ({user?.role})
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>
      
      <main className="App-main">
        <div className="status-bar">
          <span>Backend Status: {backendStatus}</span>
        </div>
        
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
              <button>Manage Students</button>
              <button>Manage Faculty</button>
              <button>Manage Classrooms</button>
              <button>View Reports</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;