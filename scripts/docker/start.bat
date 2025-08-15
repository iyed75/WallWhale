@echo off
REM ===================================
REM WallWhale Server Docker Startup Script (Windows)
REM ===================================

setlocal enabledelayedexpansion

echo 🐳 WallWhale Server - Docker Startup
echo ==========================================
echo.

REM Function to check if Docker is running
call :check_docker
if !errorlevel! neq 0 goto :error_exit

REM Create necessary directories
call :create_directories

REM Check for .env file
call :check_env_file

REM Determine deployment method
set DEPLOYMENT_METHOD=docker
if exist "docker-compose.yml" (
    echo Docker Compose configuration found
    echo Choose deployment method:
    echo 1^) Docker Compose ^(recommended^)
    echo 2^) Plain Docker
    echo.
    set /p choice="Enter choice (1-2): "
    
    if "!choice!"=="1" set DEPLOYMENT_METHOD=compose
    if "!choice!"=="2" set DEPLOYMENT_METHOD=docker
    if "!choice!"=="" set DEPLOYMENT_METHOD=compose
)

REM Build image
call :build_image
if !errorlevel! neq 0 goto :error_exit

REM Start services
if "!DEPLOYMENT_METHOD!"=="compose" (
    call :start_with_compose
) else (
    call :start_with_docker
)

if !errorlevel! neq 0 goto :error_exit

REM Show logs
call :show_logs !DEPLOYMENT_METHOD!

echo.
echo [INFO] ✅ Startup complete!
echo.
echo Useful commands:
echo   View logs: docker logs -f depot-server
if "!DEPLOYMENT_METHOD!"=="compose" (
    echo   Stop services: docker-compose down
    echo   Restart services: docker-compose restart
    echo   View status: docker-compose ps
) else (
    echo   Stop container: docker stop depot-server
    echo   Start container: docker start depot-server
    echo   Remove container: docker rm depot-server
)

goto :end

REM ===================================
REM Functions
REM ===================================

:check_docker
echo [INFO] Checking Docker...
docker --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Docker is not installed or not in PATH
    echo Please install Docker from: https://docs.docker.com/get-docker/
    exit /b 1
)

docker info >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Docker is not running
    echo Please start Docker and try again
    exit /b 1
)

echo [INFO] Docker is available and running
exit /b 0

:create_directories
echo [INFO] Creating necessary directories...
if not exist "data" mkdir data
if not exist "downloads" mkdir downloads
if not exist "logs" mkdir logs
if not exist "certs" mkdir certs
echo [INFO] Directories created successfully
exit /b 0

:check_env_file
if not exist ".env" (
    echo [WARN] No .env file found
    echo.
    set /p create_env="Would you like to create a basic .env file? (y/n): "
    if /i "!create_env!"=="y" call :create_basic_env
) else (
    echo [INFO] .env file found
)
exit /b 0

:create_basic_env
echo [INFO] Creating basic .env file...
(
echo # WallWhale Server Configuration
echo NODE_ENV=production
echo PORT=3000
echo HOST=0.0.0.0
echo.
echo # Database ^(SQLite for Docker^)
echo DATABASE_URL=file:/app/data/depot.db
echo.
echo # Admin Configuration
echo ADMIN_EMAIL=admin@example.com
echo ADMIN_PASSWORD=admin123
echo.
echo # Security ^(CHANGE THESE IN PRODUCTION!^)
echo JWT_SECRET=your-jwt-secret-change-this-in-production
echo API_KEY_SALT=your-api-key-salt-change-this-in-production
echo.
echo # Steam Accounts ^(ADD YOUR ACCOUNTS^)
echo STEAM_ACCOUNTS=username:password
echo.
echo # File Storage
echo SAVE_ROOT=/app/downloads
echo DEPOTDOWNLOADER_PATH=/app/DepotDownloaderMod/DepotDownloaderMod.exe
echo.
echo # Features
echo DOCS_ENABLED=true
echo ENABLE_METRICS=true
echo ENABLE_HEALTH_CHECKS=true
echo.
echo # Logging
echo LOG_LEVEL=info
echo LOG_FORMAT=json
) > .env

echo [INFO] Basic .env file created
echo [WARN] Please edit .env file and add your Steam accounts before starting
exit /b 0

:build_image
echo [INFO] Building Docker image...
docker build -t wallwhale-server .
if !errorlevel! neq 0 (
    echo [ERROR] Failed to build Docker image
    exit /b 1
)
echo [INFO] Docker image built successfully
exit /b 0

:start_with_compose
echo [INFO] Starting with Docker Compose...

REM Check for profiles
set PROFILES=
if defined COMPOSE_PROFILES (
    set PROFILES=--profile !COMPOSE_PROFILES!
    echo [INFO] Using profiles: !COMPOSE_PROFILES!
)

REM Start services
docker-compose up -d !PROFILES!
if !errorlevel! neq 0 (
    echo [ERROR] Failed to start with Docker Compose
    exit /b 1
)

echo [INFO] Services started successfully
echo.
echo Services Status:
docker-compose ps
echo.
echo [INFO] Server should be available at: http://localhost:!PORT!
if "!PORT!"=="" echo [INFO] Server should be available at: http://localhost:3000
echo [INFO] API Documentation: http://localhost:!PORT!/docs
echo [INFO] Health Check: http://localhost:!PORT!/health
exit /b 0

:start_with_docker
echo [INFO] Starting with Docker...

REM Stop and remove existing container
docker stop depot-server >nul 2>&1
docker rm depot-server >nul 2>&1

REM Run container
set PORT_PARAM=3000
if defined PORT set PORT_PARAM=!PORT!

docker run -d ^
    --name depot-server ^
    -p !PORT_PARAM!:3000 ^
    -v "%cd%\data:/app/data" ^
    -v "%cd%\downloads:/app/downloads" ^
    -v "%cd%\logs:/app/logs" ^
    -v "%cd%\DepotDownloaderMod:/app/DepotDownloaderMod:ro" ^
    --env-file .env ^
    wallwhale-server

if !errorlevel! equ 0 (
    echo [INFO] Container started successfully
    echo [INFO] Server should be available at: http://localhost:!PORT_PARAM!
) else (
    echo [ERROR] Failed to start container
    exit /b 1
)
exit /b 0

:show_logs
echo.
echo [INFO] Recent logs:
if "%1"=="compose" (
    docker-compose logs --tail=20 api
) else (
    docker logs --tail=20 depot-server
)
exit /b 0

:error_exit
echo.
echo [ERROR] Script failed. Check the output above for details.
pause
exit /b 1

:end
echo.
pause
exit /b 0
