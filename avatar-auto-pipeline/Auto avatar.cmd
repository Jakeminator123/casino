@echo off
rem Ett knapptryck: dra 1-8 foton (eller en mapp med foton) till den här filen.
rem   "Auto avatar.cmd" foto1.jpg foto2.jpg foto3.jpg
setlocal enabledelayedexpansion
set "avatar_python=python"
if exist "%~dp0.venv\Scripts\python.exe" set "avatar_python=%~dp0.venv\Scripts\python.exe"
if "%~1"=="" (
    echo Dra 1-8 foton eller en mapp till "Auto avatar.cmd", eller starta "STARTA avatar.cmd".
    pause
    exit /b 1
)
set "photos="
if exist "%~1\*" (
    for %%F in ("%~1\*.jpg" "%~1\*.jpeg" "%~1\*.png" "%~1\*.webp") do set photos=!photos! "%%~fF"
    if not defined AVATAR_NAMN set "AVATAR_NAMN=%~n1"
    if not defined AVATAR_UT set "AVATAR_UT=%~dp0output\%~n1"
) else (
    for %%F in (%*) do set photos=!photos! "%%~fF"
    if not defined AVATAR_NAMN set "AVATAR_NAMN=%~n1"
    if not defined AVATAR_UT set "AVATAR_UT=%~dp0output\%~n1"
)
"%avatar_python%" -B "%~dp0auto_avatar.py" --photos !photos! --name "%AVATAR_NAMN%" --out "%AVATAR_UT%" --samples 24
if errorlevel 1 (
    echo Avatarbygget avbrots. Se meddelandet och loggarna i %AVATAR_UT%.
    pause
    exit /b 1
)
echo Klart: %AVATAR_UT%
exit /b 0
