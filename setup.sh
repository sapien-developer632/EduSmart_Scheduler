#!/bin/bash

# EduSmart Scheduler Database Setup Script
# This script helps initialize and verify the database setup

echo "🏛️ EduSmart Scheduler Database Setup"
echo "=================================="

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker first."
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to check if containers are running
check_containers() {
    if docker-compose ps | grep -q "postgres.*Up"; then
        echo "✅ PostgreSQL container is running"
    else
        echo "❌ PostgreSQL container is not running"
        return 1
    fi
    
    if docker-compose ps | grep -q "backend.*Up"; then
        echo "✅ Backend container is running"
    else
        echo "⚠️  Backend container is not running"
        return 1
    fi
}

# Function to reset database
reset_database() {
    echo ""
    echo "🔄 Resetting Database..."
    echo "This will stop containers, remove volumes, and restart fresh"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping containers..."
        docker-compose down
        
        echo "Removing database volume..."
        docker volume rm edusmart_scheduler-main_postgres_data 2>/dev/null || true
        
        echo "Starting containers with fresh database..."
        docker-compose up -d postgres redis
        
        echo "Waiting for PostgreSQL to be ready..."
        sleep 10
        
        # Wait for PostgreSQL to be healthy
        for i in {1..30}; do
            if docker-compose exec postgres pg_isready -U edusmart_user -d edusmart_scheduler >/dev/null 2>&1; then
                echo "✅ PostgreSQL is ready"
                break
            fi
            echo "Waiting for PostgreSQL... ($i/30)"
            sleep 2
        done
        
        echo "Starting all services..."
        docker-compose up -d
        
        echo "✅ Database reset complete"
    else
        echo "Database reset cancelled"
    fi
}

# Function to verify database schema
verify_database() {
    echo ""
    echo "🔍 Verifying Database Schema..."
    
    # Check if we can connect to database
    if ! docker-compose exec postgres psql -U edusmart_user -d edusmart_scheduler -c "SELECT 1;" >/dev/null 2>&1; then
        echo "❌ Cannot connect to database"
        return 1
    fi
    
    echo "✅ Database connection successful"
    
    # Check if tables exist
    echo "Checking required tables..."
    tables=$(docker-compose exec postgres psql -U edusmart_user -d edusmart_scheduler -t -c "
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'departments', 'programs', 'students', 'faculty', 'courses', 'classrooms', 'academic_terms')
        ORDER BY table_name;
    " | tr -d ' ' | grep -v '^$')
    
    required_tables=("academic_terms" "classrooms" "courses" "departments" "faculty" "programs" "students" "users")
    
    for table in "${required_tables[@]}"; do
        if echo "$tables" | grep -q "^$table$"; then
            echo "✅ Table '$table' exists"
        else
            echo "❌ Table '$table' missing"
        fi
    done
    
    # Check if default data exists
    echo ""
    echo "Checking default data..."
    
    user_count=$(docker-compose exec postgres psql -U edusmart_user -d edusmart_scheduler -t -c "SELECT COUNT(*) FROM users;")
    dept_count=$(docker-compose exec postgres psql -U edusmart_user -d edusmart_scheduler -t -c "SELECT COUNT(*) FROM departments;")
    term_count=$(docker-compose exec postgres psql -U edusmart_user -d edusmart_scheduler -t -c "SELECT COUNT(*) FROM academic_terms;")
    
    echo "👥 Users: $(echo $user_count | tr -d ' ')"
    echo "🏢 Departments: $(echo $dept_count | tr -d ' ')"
    echo "📅 Academic Terms: $(echo $term_count | tr -d ' ')"
    
    if [ "$(echo $user_count | tr -d ' ')" -gt 0 ] && [ "$(echo $dept_count | tr -d ' ')" -gt 0 ]; then
        echo "✅ Default data is present"
        return 0
    else
        echo "⚠️  Default data may be missing"
        return 1
    fi
}

# Function to test API endpoints
test_api() {
    echo ""
    echo "🌐 Testing API Endpoints..."
    
    # Wait for backend to be ready
    echo "Waiting for backend service..."
    for i in {1..30}; do
        if curl -s http://localhost:3001/api/upload/health >/dev/null 2>&1; then
            echo "✅ Backend API is responding"
            break
        fi
        echo "Waiting for backend API... ($i/30)"
        sleep 2
    done
    
    # Test health endpoint
    echo "Testing database health endpoint..."
    health_response=$(curl -s http://localhost:3001/api/upload/health)
    
    if echo "$health_response" | grep -q '"success":true'; then
        echo "✅ Database health check passed"
        echo "$health_response" | jq '.' 2>/dev/null || echo "$health_response"
    else
        echo "❌ Database health check failed"
        echo "$health_response"
        return 1
    fi
    
    # Test template download
    echo ""
    echo "Testing template download..."
    if curl -s -o /tmp/dept_template.csv "http://localhost:3001/api/upload/templates/departments"; then
        echo "✅ Template download works"
        echo "Sample template content:"
        head -2 /tmp/dept_template.csv
        rm -f /tmp/dept_template.csv
    else
        echo "❌ Template download failed"
    fi
}

# Function to show database logs
show_logs() {
    echo ""
    echo "📋 Recent Database Logs:"
    echo "========================"
    docker-compose logs --tail=20 postgres
}

# Function to show help
show_help() {
    echo ""
    echo "🆘 Available Commands:"
    echo "====================="
    echo "  verify     - Check database schema and connectivity"
    echo "  reset      - Reset database (WARNING: deletes all data)"
    echo "  test       - Test API endpoints"
    echo "  logs       - Show recent database logs"
    echo "  help       - Show this help message"
    echo ""
    echo "💡 Common Troubleshooting:"
    echo "  1. If tables are missing, try: ./setup.sh reset"
    echo "  2. If API fails, check: ./setup.sh logs"
    echo "  3. If containers aren't running: docker-compose up -d"
}

# Main script logic
case "${1:-help}" in
    "verify")
        check_docker
        if check_containers; then
            verify_database
        else
            echo "❌ Containers are not running. Starting them..."
            docker-compose up -d
            sleep 10
            verify_database
        fi
        ;;
    "reset")
        check_docker
        reset_database
        echo ""
        echo "⏳ Waiting for services to start..."
        sleep 15
        verify_database
        ;;
    "test")
        check_docker
        if check_containers; then
            test_api
        else
            echo "❌ Containers are not running. Please start them first: docker-compose up -d"
        fi
        ;;
    "logs")
        show_logs
        ;;
    "help"|*)
        show_help
        ;;
esac

echo ""
echo "🎯 Next Steps:"
echo "1. If database is working: Upload departments CSV through the web interface"
echo "2. Use admin credentials: admin@university.edu / admin123"
echo "3. Check logs if you encounter issues: ./setup.sh logs"