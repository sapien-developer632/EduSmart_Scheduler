#!/bin/bash

# EduSmart Scheduler - Quick Setup Script for GitHub Codespaces
# This script initializes the environment and starts the application

set -e

echo "🚀 EduSmart Scheduler Setup"
echo "========================="

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.template .env
    
    # Generate a random JWT secret
    if command -v openssl &> /dev/null; then
        JWT_SECRET=$(openssl rand -base64 32)
        sed -i "s/your_super_secret_jwt_key_change_in_production_minimum_32_characters/$JWT_SECRET/" .env
        echo "✅ Generated secure JWT secret"
    else
        echo "⚠️  OpenSSL not found. Please manually update JWT_SECRET in .env file"
    fi
else
    echo "✅ Environment file already exists"
fi

# Stop any running containers
echo "🛑 Stopping any existing containers..."
docker-compose down > /dev/null 2>&1 || true

# Build and start all services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "✅ EduSmart Scheduler is running!"
    echo ""
    echo "📱 Access your application:"
    echo "   Frontend:  http://localhost:3000"
    echo "   Backend:   http://localhost:3001/api"
    echo ""
    echo "🔑 Default login credentials:"
    echo "   Email:     admin@university.edu"
    echo "   Password:  admin123"
    echo ""
    echo "📋 Useful commands:"
    echo "   View logs: docker-compose logs -f"
    echo "   Stop app:  docker-compose down"
    echo "   Restart:   docker-compose restart"
    echo ""
    echo "🎉 Setup complete! Happy scheduling!"
else
    echo "❌ Some services failed to start. Check logs with: docker-compose logs"
    exit 1
fi
