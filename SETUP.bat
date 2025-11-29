@echo off
echo ========================================
echo   MY FINANCE APP - Setup Wizard
echo ========================================
echo.

REM Step 1: Check Node.js
echo [Step 1/3] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Download the LTS version and restart your computer.
    echo.
    pause
    exit /b 1
)

node --version
echo Node.js is installed!
echo.

REM Step 2: Install dependencies
echo [Step 2/3] Installing dependencies...
echo This will take 1-2 minutes...
echo.
call npm install
if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies!
    echo Please check your internet connection and try again.
    echo.
    pause
    exit /b 1
)
echo.
echo Dependencies installed successfully!
echo.

REM Step 3: Setup .env file
echo [Step 3/3] Setting up Firebase configuration...
echo.

if exist ".env" (
    echo .env file already exists.
    choice /C YN /M "Do you want to create a new one"
    if errorlevel 2 goto skip_env
)

copy .env.example .env >nul 2>&1
echo.
echo Created .env file from template.
echo.
echo IMPORTANT: You need to add your Firebase configuration!
echo.
echo Opening .env file in Notepad...
echo Replace the placeholder values with your actual Firebase config.
echo.
pause
notepad .env

:skip_env
echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Make sure your .env file has the correct Firebase config
echo 2. Double-click START-APP.bat to run the app
echo.
echo Or run manually with: npm start
echo.
pause
