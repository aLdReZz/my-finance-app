@echo off
echo ========================================
echo   MY FINANCE APP - Quick Start
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [1/2] Installing dependencies...
    echo This will take 1-2 minutes on first run.
    echo.
    call npm install
    echo.
    echo Dependencies installed!
    echo.
) else (
    echo Dependencies already installed.
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo WARNING: .env file not found!
    echo.
    echo Please create a .env file with your Firebase configuration.
    echo You can copy .env.example and edit it:
    echo.
    echo   copy .env.example .env
    echo   notepad .env
    echo.
    pause
    exit /b 1
)

echo [2/2] Starting the app...
echo.
echo Your app will open automatically in your browser.
echo.
echo To stop the app: Press Ctrl+C in this window
echo ========================================
echo.

npm start
