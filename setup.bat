@echo off
echo ============================================
echo   3D Model Hub Setup
echo ============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Step 1: Installing Node.js...
    winget install OpenJS.NodeJS --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo Install failed. Please install Node.js from https://nodejs.org
        pause
        exit /b 1
    )
    echo Please restart this script after installation.
    pause
    exit /b 0
)

echo Step 1: Node.js found.
echo Step 2: Installing dependencies...
cd /d "%~dp0"
call npm install
echo Step 3: Starting server...
echo.
echo Server running at http://localhost:3456
echo Press Ctrl+C to stop.
echo.
node server-http.js
pause
