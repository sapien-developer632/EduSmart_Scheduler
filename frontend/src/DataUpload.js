import React, { useState, useEffect } from 'react';
import './DataUpload.css';

const DataUpload = () => {
  const [activeTab, setActiveTab] = useState('departments');
  const [uploadStatus, setUploadStatus] = useState({});
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({});
  const [uploadHistory, setUploadHistory] = useState([]);

  // Data types configuration based on enhanced university requirements
  const dataTypes = {
    // CRITICAL PHASE 1 - Must be uploaded first
    academic_terms: {
      name: 'Academic Terms',
      description: 'Define semesters/terms (CRITICAL - Upload First!)',
      icon: '📅',
      fields: ['Name', 'Start Date', 'End Date', 'Academic Year', 'Status'],
      priority: 'CRITICAL',
      order: 1
    },
    departments: {
      name: 'Departments',
      description: 'Upload department information',
      icon: '🏢',
      fields: ['Code', 'Name', 'Description', 'Head of Department Email'],
      priority: 'HIGH',
      order: 2
    },
    programs: {
      name: 'Programs',
      description: 'Define degree programs (B.Tech, M.Tech, etc.)',
      icon: '🎓',
      fields: ['Code', 'Name', 'Department Code', 'Duration Years'],
      priority: 'HIGH', 
      order: 3
    },
    time_slots: {
      name: 'Time Slots',
      description: 'Define standard class periods (CRITICAL for scheduling)',
      icon: '⏰',
      fields: ['Slot Name', 'Start Time', 'End Time', 'Duration Minutes'],
      priority: 'CRITICAL',
      order: 4
    },
    
    // PHASE 2 - Core Data
    classrooms: {
      name: 'Classrooms', 
      description: 'Upload classroom data with equipment details',
      icon: '🏛️',
      fields: ['Room Code', 'Building', 'Floor', 'Capacity', 'Type', 'Equipment'],
      priority: 'HIGH',
      order: 5
    },
    faculty: {
      name: 'Faculty',
      description: 'Upload faculty with qualifications and preferences',
      icon: '👩‍🏫',
      fields: ['Name', 'Employee ID', 'Email', 'Department Code', 'Time Preferences'],
      priority: 'HIGH',
      order: 6
    },
    courses: {
      name: 'Courses',
      description: 'Upload courses with prerequisites and details',
      icon: '📚',
      fields: ['Course Code', 'Title', 'Department Code', 'Semester', 'Credits'],
      priority: 'HIGH',
      order: 7
    },
    batches: {
      name: 'Batches',
      description: 'Define student cohorts/batches',
      icon: '👥',
      fields: ['Name', 'Program Code', 'Start Year', 'End Year'],
      priority: 'HIGH',
      order: 8
    },
    students: {
      name: 'Students',
      description: 'Upload student records with contact details',
      icon: '👨‍🎓', 
      fields: ['Name', 'Student ID', 'Email', 'Program Code', 'Batch Name'],
      priority: 'HIGH',
      order: 9
    },
    
    // PHASE 3 - Critical for Scheduling
    student_enrollments: {
      name: 'Student Enrollments',
      description: 'CRITICAL: Which students are in which courses (Required for scheduling!)',
      icon: '📝',
      fields: ['Student ID', 'Course Code', 'Academic Year', 'Semester'],
      priority: 'CRITICAL',
      order: 10
    },
    course_assignments: {
      name: 'Course Assignments',
      description: 'CRITICAL: Assign faculty to courses for scheduling',
      icon: '👩‍🏫📚',
      fields: ['Course Code', 'Faculty Employee ID', 'Academic Year', 'Semester'],
      priority: 'CRITICAL',
      order: 11
    },
    course_prerequisites: {
      name: 'Course Prerequisites',
      description: 'Define prerequisite relationships between courses',
      icon: '🔗',
      fields: ['Course Code', 'Prerequisite Course Code', 'Is Mandatory'],
      priority: 'MEDIUM',
      order: 12
    },
    
    // LEGACY - keeping for backward compatibility  
    subjects: {
      name: 'Subjects (Legacy)',
      description: 'Legacy format - use Courses instead',
      icon: '📖',
      fields: ['Subject Name', 'Code', 'Subject Hours per Week', 'Faculty Name'],
      priority: 'LOW',
      order: 13
    }
  };

  // Load statistics on component mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/upload/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const downloadTemplate = async (type) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/upload/templates/${type}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_template.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to download template:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  const handleFileUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setUploading(true);
    setUploadStatus({ type, status: 'uploading', message: 'Uploading file...' });

    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/upload/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setUploadStatus({ 
          type, 
          status: 'success', 
          message: result.message,
          details: result.details
        });
        
        // Add to upload history
        setUploadHistory(prev => [{
          timestamp: new Date().toISOString(),
          type,
          result
        }, ...prev.slice(0, 4)]); // Keep last 5 uploads
        
        // Reload stats
        loadStats();
      } else {
        setUploadStatus({ 
          type, 
          status: 'error', 
          message: result.message,
          details: result.details
        });
      }
    } catch (error) {
      console.error('Upload error details:', error);
      setUploadStatus({ 
        type, 
        status: 'error', 
        message: 'Upload failed: ' + error.message
      });
    } finally {
      setUploading(false);
      // Clear file input
      event.target.value = '';
    }
  };

  const clearStatus = () => {
    setUploadStatus({});
  };

  return (
    <div className="data-upload-container">
      <div className="upload-header">
        <h2>📊 Data Import Center</h2>
        <p>Upload CSV files to populate your university data. Download templates to see required format.</p>
      </div>

      {/* Statistics Overview */}
      <div className="stats-overview">
        <h3>Current Data Overview</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{stats.departments || 0}</span>
            <span className="stat-label">Departments</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.subjects || 0}</span>
            <span className="stat-label">Subjects</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.students || 0}</span>
            <span className="stat-label">Students</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.faculty || 0}</span>
            <span className="stat-label">Faculty</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.classrooms || 0}</span>
            <span className="stat-label">Classrooms</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="upload-tabs">
        {Object.entries(dataTypes).map(([key, config]) => (
          <button
            key={key}
            className={`tab-button ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <span className="tab-icon">{config.icon}</span>
            <span className="tab-name">{config.name}</span>
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <div className="upload-content">
        <div className="upload-section">
          <div className="section-info">
            <h3>{dataTypes[activeTab].icon} {dataTypes[activeTab].name}</h3>
            <p>{dataTypes[activeTab].description}</p>
            
            <div className="required-fields">
              <strong>Required Fields:</strong>
              <div className="field-tags">
                {dataTypes[activeTab].fields.map(field => (
                  <span key={field} className="field-tag">{field}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="upload-actions">
            <div className="template-section">
              <h4>Step 1: Download Template</h4>
              <button
                className="template-button"
                onClick={() => downloadTemplate(activeTab)}
              >
                📥 Download CSV Template
              </button>
              <p className="help-text">
                Download the template, fill it with your data, then upload it back.
              </p>
            </div>

            <div className="upload-section-main">
              <h4>Step 2: Upload Your CSV File</h4>
              <div className="file-upload-area">
                <input
                  type="file"
                  id={`upload-${activeTab}`}
                  accept=".csv"
                  onChange={(e) => handleFileUpload(e, activeTab)}
                  disabled={uploading}
                  className="file-input"
                />
                <label htmlFor={`upload-${activeTab}`} className="file-upload-label">
                  {uploading ? (
                    <div className="upload-progress">
                      <div className="spinner"></div>
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <span className="upload-icon">📤</span>
                      <span>Click to select CSV file or drag and drop</span>
                      <span className="file-limit">Maximum file size: 5MB</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Status */}
        {uploadStatus.type && (
          <div className={`upload-status ${uploadStatus.status}`}>
            <div className="status-header">
              <h4>
                {uploadStatus.status === 'success' && '✅'}
                {uploadStatus.status === 'error' && '❌'}
                {uploadStatus.status === 'uploading' && '⏳'}
                {uploadStatus.message}
              </h4>
              <button className="close-status" onClick={clearStatus}>×</button>
            </div>
            
            {uploadStatus.details && (
              <div className="status-details">
                <p>
                  <strong>Total Rows:</strong> {uploadStatus.details.totalRows} | 
                  <strong> Success:</strong> {uploadStatus.details.successCount} | 
                  <strong> Errors:</strong> {uploadStatus.details.errorCount}
                </p>
                
                {uploadStatus.details.errors && uploadStatus.details.errors.length > 0 && (
                  <div className="error-list">
                    <strong>Errors:</strong>
                    <ul>
                      {uploadStatus.details.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recent Uploads */}
        {uploadHistory.length > 0 && (
          <div className="upload-history">
            <h4>Recent Uploads</h4>
            <div className="history-list">
              {uploadHistory.map((upload, index) => (
                <div key={index} className="history-item">
                  <div className="history-info">
                    <span className="history-type">{dataTypes[upload.type]?.icon} {upload.type}</span>
                    <span className="history-time">
                      {new Date(upload.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="history-result">
                    {upload.result.success ? (
                      <span className="success">✅ {upload.result.details?.successCount} records</span>
                    ) : (
                      <span className="error">❌ Failed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="upload-instructions">
        <h4>📋 Upload Instructions</h4>
        <ol>
          <li><strong>Download Template:</strong> Click the template button to get the correct CSV format</li>
          <li><strong>Fill Your Data:</strong> Open the template in Excel/Google Sheets and add your data</li>
          <li><strong>Save as CSV:</strong> Export/save the file as CSV format</li>
          <li><strong>Upload File:</strong> Select your CSV file using the upload button</li>
          <li><strong>Review Results:</strong> Check the upload status for any errors or warnings</li>
        </ol>
        
        <div className="upload-tips">
          <h5>💡 Tips:</h5>
          <ul>
            <li>Always upload departments first, then classrooms, faculty, subjects, and students</li>
            <li>Student and faculty uploads require existing departments</li>
            <li>Use exact department names - they are case-sensitive</li>
            <li>Email addresses must be unique across the system</li>
            <li>Files larger than 5MB will be rejected</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DataUpload;