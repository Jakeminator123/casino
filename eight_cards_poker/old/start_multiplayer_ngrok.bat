@echo off
echo ========================================
echo Eight Cards Poker - Multiplayer with Ngrok
echo ========================================
echo.

:: Check if ngrok is installed
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: ngrok is not installed or not in PATH
    echo.
    echo Please install ngrok:
    echo 1. Download from https://ngrok.com/download
    echo 2. Extract and add to PATH
    echo 3. Run: ngrok config add-authtoken YOUR_TOKEN
    echo.
    pause
    exit /b 1
)

echo Installing dependencies...
cd backend
pip install -r requirements.txt
echo.

:: Start Flask server in background
echo Starting game server on port 5000...
start /B python app.py

:: Wait a moment for server to start
timeout /t 3 /nobreak >nul

:: Start ngrok
echo.
echo Starting ngrok tunnel...
echo.
echo ========================================
echo SHARE THIS URL WITH YOUR OPPONENT:
echo ========================================
echo.
ngrok http 5000

:: When ngrok is closed, kill the Python process
taskkill /F /IM python.exe >nul 2>&1
pause
