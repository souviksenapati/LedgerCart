#!/bin/bash
# Quick start script for LedgerCart Docker deployment

echo "🏗️  Building LedgerCart Docker Containers..."
echo ""

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Build and start containers
echo "📦 Building and starting all services..."
docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ LedgerCart is now running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Frontend (Store):  http://localhost"
echo "👨‍💼 Admin Panel:       http://localhost/admin"
echo "�️  Console Panel:     http://localhost:8081"
echo "�🔌 Backend API:       http://localhost:8000"
echo "📚 API Docs:          http://localhost:8000/docs"
echo ""
echo "🔐 Default Login Credentials:"
echo "   Admin:    admin@ledgercart.com / admin123"
echo "   Customer: customer@demo.com / customer123"
echo "   Staff:    staff@ledgercart.com / staff123"
echo ""
echo "📋 Useful Commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop all:      docker-compose down"
echo "   Restart:       docker-compose restart"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
