@echo off
setlocal
set "HERE=%~dp0"
where pwsh >nul 2>&1
if %errorlevel%==0 (
    pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%HERE%starta_avatar.ps1" %*
) else (
    powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%HERE%starta_avatar.ps1" %*
)
set "RC=%errorlevel%"
if not "%RC%"=="0" (
    echo.
    echo Korningen avslutades med felkod %RC%.
    pause
)
exit /b %RC%
