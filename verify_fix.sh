#!/bin/bash

# Quick verification script to check if the EduSmart Scheduler fix was successful

echo "🔍 EduSmart Scheduler Fix Verification"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ "$2" = "success" ]; then
        echo -e "${GREEN}✅ $1${NC}"
    elif [ "$2" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
    fi
}

# Check if Docker is running
echo "1. Checking Docker status..."
if docker info >/dev/null 2>&1; then
    print_status "Docker is running" "success"
else
    print_status "Docker is not running" "error"
    echo "Please start Docker and try again"
    exit 1
fi

# Check if containers are running
echo ""
echo "2. Checking containers..."
if docker-compose ps | grep -q "postgres.*Up"; then
    print_status "PostgreSQL container is running" "success"
else
    print_status "PostgreSQL container is not running" "error"
    echo "Run: docker-compose up -d"
    exit 1
fi

if docker-compose ps | grep -q "backend.*Up"; then
    print_status "Backend container is running" "success"
else
    print_status "Backend container is not running" "warning"
    echo "Run: docker-compose up -d"
fi

# Test database connection
echo ""
echo "3. Testing database connection..."
if docker-compose exec postgres pg_isready -U edusmart_user -d edusmart_scheduler >/dev/null 2>&1; then
    print_status "Database connection successful" "success"
else
    print_status "Database connection failed" "error"
    exit 1
fi

# Check if departments table exists
echo ""
echo "4. Checking critical tables..."
tables_check=$(docker-compose exec postgres psql -U edusmart_user -d edusmart_scheduler -t -c "
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'departments';
" 2>/dev/null | tr -d ' ')

if [ "$tables_check" = "1" ]; then
    print_status "Departments table exists" "success"
else
    print_status "Departments table missing" "error"
    echo "Run: ./setup.sh reset"
    exit 1
fi

# Test API health endpoint
echo ""
echo "5. Testing API health..."
# Wait a moment for backend to be ready
sleep 2

if curl -s http://localhost:3001/api/upload/health | grep -q '"success":true'; then
    print_status "API health check passed" "success"
else
    print_status "API health check failed" "error"
    echo "Check backend logs: docker-compose logs backend"
fi

# Test template download
echo ""
echo "6. Testing template download..."
if curl -s -o /tmp/dept_test.csv "http://localhost:3001/api/upload/templates/departments" 2>/dev/null; then
    if [ -s /tmp/dept_test.csv ]; then
        print_status "Template download works" "success"
        rm -f /tmp/dept_test.csv
    else
        print_status "Template download returned empty file" "error"
    fi
else
    print_status "Template download failed" "error"
fi

echo ""
echo "📋 Summary:"
echo "==========="
echo "If all checks passed, your EduSmart Scheduler is ready!"
echo ""
echo "🎯 Next steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Login with: admin@university.edu / admin123"
echo "3. Go to Data Upload section"
echo "4. Download departments template"
echo "5. Upload your departments CSV"
echo ""
echo "📁 Sample files available:"
echo "- departments_sample.csv (ready to upload)"
echo "- FIX_INSTRUCTIONS.md (detailed troubleshooting)"
echo ""

# Check if sample CSV exists
if [ -f "departments_sample.csv" ]; then
    print_status "Sample CSV file is ready for testing" "success"
else
    print_status "Sample CSV file not found" "warning"
    echo "Create it from the template download"
fi

echo ""
echo "💡 If any checks failed, run: ./setup.sh reset"