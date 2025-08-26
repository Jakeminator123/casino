@echo off
echo ========================================
echo Starting Eight Cards Poker Multiplayer Server
echo ========================================
echo.
echo Uninstalling eventlet (incompatible with Python 3.12)...
pip uninstall -y eventlet >nul 2>&1
echo.
echo Installing dependencies...
cd backend
pip install -r requirements.txt
echo.
echo Starting server...
echo.
echo LOCAL PLAY:
echo   Open http://localhost:5000 in two browser windows
echo.
echo ONLINE PLAY:
echo   Run start_multiplayer_ngrok.bat instead to share via internet
echo.
python app.py
pause
