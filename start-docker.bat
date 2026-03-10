@echo off
REM Quick start script for LedgerCart Docker deployment (Windows)

echo ==========================================
echo  Building LedgerCart Containers
echo ==========================================
echo.

REM Check if docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop for Windows first
    pause
    exit /b 1
)

REM Check if docker-compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker Compose is not installed or not in PATH
    pause
    exit /b 1
)

echo [OK] Docker and Docker Compose are installed
echo.

REM Build and start containers
echo Building and starting all services...
echo This may take a few minutes on first run...
echo.
docker-compose up --build -d

echo.
echo Waiting for services to be ready...
timeout /t 15 /nobreak >nul

REM Check service health
echo.
echo Checking service status...
docker-compose ps

echo.
echo ==========================================
echo   LedgerCart is now running!
echo ==========================================
echo.
echo  Frontend (Store):  http://localhost
echo  Admin Panel:       http://localhost/admin
echo  Backend API:       http://localhost:8000
echo  API Docs:          http://localhost:8000/docs
echo.
echo  Default Login Credentials:
echo    Admin:    admin@ledgercart.com / admin123
echo    Customer: customer@demo.com / customer123
echo    Staff:    staff@ledgercart.com / staff123
echo.
echo  Useful Commands:
echo    View logs:     docker-compose logs -f
echo    Stop all:      docker-compose down
echo    Restart:       docker-compose restart
echo.
echo ==========================================
echo.
pause
