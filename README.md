# EduSmart Scheduler - Docker Setup for GitHub Codespaces

A comprehensive university timetable management system built with React, Node.js, PostgreSQL, and Redis.

## System Architecture

This application consists of four main services:
- **Frontend**: React.js application (Port 3000)
- **Backend**: Node.js/Express API server (Port 3001)
- **Worker**: Background job processor for timetable generation
- **Database**: PostgreSQL with Redis for caching and job queues

## Quick Start on GitHub Codespaces

### 1. Repository Setup

1. Create a new repository on GitHub
2. Upload all the Docker configuration files to your repository
3. Open the repository in GitHub Codespaces

### 2. Environment Setup

1. Copy the environment template:
```bash
cp .env.template .env
```

2. Update the JWT secret in `.env`:
```bash
# Generate a secure JWT secret
openssl rand -base64 32
```

3. Replace the JWT_SECRET in your `.env` file with the generated secret

### 3. Run the Application

Start all services using Docker Compose:
```bash
docker-compose up --build
```

This will:
- Build all Docker images
- Start PostgreSQL database with schema initialization
- Start Redis for caching and job queues
- Launch the backend API server
- Launch the worker service for background jobs
- Start the React frontend application

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Database**: localhost:5432 (accessible within containers)
- **Redis**: localhost:6379 (accessible within containers)

### 5. Default Login Credentials

- **Email**: admin@university.edu
- **Password**: admin123

## Project Structure

```
edusmart-scheduler/
├── docker-compose.yml          # Main orchestration file
├── .env.template              # Environment variables template
├── .env                       # Your environment variables (create this)
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/                   # Backend source code (create this)
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/                   # Frontend source code (create this)
├── worker/
│   ├── Dockerfile
│   ├── package.json
│   └── src/                   # Worker source code (create this)
└── database/
    └── init/
        └── 01-schema.sql      # Database initialization script
```

## Development Workflow

### Running in Development Mode

The Docker setup is configured for development with:
- Hot reloading for frontend (React)
- Auto-restart for backend (nodemon)
- Volume mounts for live code editing
- Debugging support

### Viewing Logs

View logs for specific services:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f worker
docker-compose logs -f postgres
```

### Database Access

Connect to PostgreSQL:
```bash
docker-compose exec postgres psql -U edusmart_user -d edusmart_scheduler
```

### Redis Access

Connect to Redis:
```bash
docker-compose exec redis redis-cli
```

## Next Steps: Creating Application Code

After the Docker environment is running, you'll need to create the actual application code:

### 1. Backend Structure
```
backend/src/
├── server.js              # Main server file
├── config/
│   ├── database.js        # Database connection
│   └── redis.js           # Redis connection
├── controllers/           # API controllers
├── middleware/            # Authentication, validation
├── models/               # Database models
├── routes/               # API routes
└── utils/                # Helper functions
```

### 2. Frontend Structure
```
frontend/src/
├── components/           # Reusable components
├── pages/               # Page components
├── store/               # Redux store
├── services/            # API services
├── utils/               # Helper functions
└── styles/              # CSS/styling
```

### 3. Worker Structure
```
worker/src/
├── worker.js            # Main worker file
├── algorithms/          # Genetic algorithm implementation
├── jobs/               # Job processors
└── utils/              # Helper functions
```

## Key Features to Implement

1. **Authentication System**
   - JWT-based authentication
   - Role-based access control (Admin, Faculty, Student)

2. **Data Management**
   - CRUD operations for all entities
   - CSV/Excel bulk upload functionality
   - Data validation and error handling

3. **Timetable Generation**
   - Genetic algorithm implementation
   - Constraint satisfaction problem solving
   - Background job processing

4. **User Interfaces**
   - Admin dashboard for system management
   - Faculty interface for viewing schedules
   - Student portal for timetable viewing

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Ensure ports 3000, 3001, 5432, and 6379 are available
   - Modify ports in docker-compose.yml if needed

2. **Database Connection Issues**
   - Wait for postgres health check to pass
   - Check database credentials in .env file

3. **Container Build Failures**
   - Clear Docker cache: `docker system prune -a`
   - Rebuild without cache: `docker-compose build --no-cache`

4. **Permission Issues on Linux/Mac**
   ```bash
   sudo chown -R $USER:$USER .
   ```

### Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (careful: this deletes data)
docker-compose down -v

# Stop and remove images
docker-compose down --rmi all
```

## Production Considerations

Before deploying to production:

1. Change all default passwords and secrets
2. Use environment-specific configuration
3. Implement proper logging and monitoring
4. Set up database backups
5. Configure SSL/HTTPS
6. Implement proper error handling
7. Add comprehensive testing

## Database Schema

The database includes tables for:
- Users (authentication)
- Departments and Programs
- Courses and Prerequisites
- Students and Faculty
- Academic Terms and Batches
- Classrooms and Resources
- Course Offerings and Enrollments
- Scheduled Sessions (timetable)
- Audit Logs

## Technology Stack

- **Frontend**: React 18, Redux Toolkit, Material-UI
- **Backend**: Node.js, Express.js, JWT authentication
- **Database**: PostgreSQL 15 with advanced features
- **Cache/Queue**: Redis with Bull queue
- **Algorithm**: Genetic Algorithm for optimization
- **DevOps**: Docker, Docker Compose

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues with the Docker setup or application architecture, please create an issue in the repository with detailed information about your environment and the problem you're experiencing.
