@echo off
cls
echo.
echo    ╔═══════════════════════════════════════════════╗
echo    ║      EIGHT CARDS POKER - MULTIPLAYER         ║
echo    ╚═══════════════════════════════════════════════╝
echo.
echo    Choose how to play:
echo.
echo    [1] LOCAL - Play on this computer only
echo    [2] ONLINE - Share game via Internet (ngrok)
echo    [3] FIX - Repair Python dependencies
echo    [4] EXIT
echo.
set /p choice="    Enter your choice (1-4): "

if "%choice%"=="1" goto LOCAL
if "%choice%"=="2" goto ONLINE
if "%choice%"=="3" goto FIX
if "%choice%"=="4" exit
goto :eof

:LOCAL
cls
echo.
echo    Starting LOCAL game server...
echo    ────────────────────────────────────────────────
echo.
cd backend
echo    Checking dependencies...
pip install -r requirements.txt >nul 2>&1
echo.
echo    ╔═══════════════════════════════════════════════╗
echo    ║           SERVER IS RUNNING!                 ║
echo    ╠═══════════════════════════════════════════════╣
echo    ║  Player 1: Open http://localhost:5000        ║
echo    ║  Player 2: Open http://localhost:5000        ║
echo    ║           (in different browser/window)      ║
echo    ╚═══════════════════════════════════════════════╝
echo.
echo    Press Ctrl+C to stop the server
echo.
python app_simple.py
goto :eof

:ONLINE  
cls
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo    ╔═══════════════════════════════════════════════╗
    echo    ║            NGROK NOT FOUND!                  ║
    echo    ╠═══════════════════════════════════════════════╣
    echo    ║  1. Download: https://ngrok.com/download     ║
    echo    ║  2. Create account and get auth token        ║
    echo    ║  3. Run: ngrok config add-authtoken TOKEN    ║
    echo    ╚═══════════════════════════════════════════════╝
    echo.
    pause
    goto :eof
)

echo.
echo    Starting ONLINE game server...
echo    ────────────────────────────────────────────────
echo.
cd backend
echo    Checking dependencies...
pip install -r requirements.txt >nul 2>&1

:: Start server in background
start /B python app_simple.py >nul 2>&1
timeout /t 3 /nobreak >nul

cls
echo.
echo    ╔═══════════════════════════════════════════════╗
echo    ║         STARTING NGROK TUNNEL...             ║
echo    ╠═══════════════════════════════════════════════╣
echo    ║  Share the URL below with your opponent:     ║
echo    ╚═══════════════════════════════════════════════╝
echo.
cd ..
ngrok http 5000

:: Kill python when ngrok closes
taskkill /F /IM python.exe >nul 2>&1
goto :eof

:FIX
cls
echo.
echo    Fixing Python dependencies...
echo    ────────────────────────────────────────────────
echo.
echo    Removing incompatible packages...
pip uninstall -y eventlet >nul 2>&1
pip uninstall -y gevent >nul 2>&1
echo.
echo    Installing clean dependencies...
cd backend
pip install --upgrade -r requirements.txt
echo.
echo    ✓ Dependencies fixed!
echo.
pause
goto :eof
