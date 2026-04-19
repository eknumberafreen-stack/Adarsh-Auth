@echo off
REM SaaS Authentication Platform - Installation Script (Windows)
REM This script automates the installation process

echo ================================================
echo   SaaS Authentication Platform - Installer
echo ================================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

node -v
echo [OK] Node.js is installed

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

npm -v
echo [OK] npm is installed

echo.
echo ================================================
echo   Installing Dependencies
echo ================================================
echo.

REM Install backend dependencies
echo Installing backend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed

echo.

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
cd ..
echo [OK] Frontend dependencies installed

echo.
echo ================================================
echo   Configuration
echo ================================================
echo.

REM Setup backend environment
if not exist .env (
    echo Creating backend .env file...
    copy .env.example .env
    echo [OK] Backend .env created
    echo [WARNING] IMPORTANT: Edit .env and set your JWT secrets!
) else (
    echo [WARNING] .env already exists, skipping...
)

REM Setup frontend environment
if not exist frontend\.env.local (
    echo Creating frontend .env.local file...
    copy frontend\.env.local.example frontend\.env.local
    echo [OK] Frontend .env.local created
) else (
    echo [WARNING] frontend\.env.local already exists, skipping...
)

echo.
echo ================================================
echo   Generating Secrets
echo ================================================
echo.

echo Add these to your .env file:
echo.
echo JWT_ACCESS_SECRET=
powershell -Command "[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))"
echo.
echo JWT_REFRESH_SECRET=
powershell -Command "[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))"
echo.

echo ================================================
echo   Installation Complete!
echo ================================================
echo.
echo [OK] All dependencies installed
echo [OK] Configuration files created
echo.
echo Next steps:
echo.
echo 1. Edit .env and set your JWT secrets (see above)
echo 2. Make sure MongoDB is running
echo 3. Make sure Redis is running
echo 4. Run: npm run dev
echo 5. Open: http://localhost:3000
echo.
echo For detailed instructions, see SETUP.md
echo For quick start, see QUICK_START.md
echo.
echo ================================================
pause
