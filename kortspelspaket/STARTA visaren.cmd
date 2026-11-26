@echo off
rem Startar visaren for Card Games Animation Pack och oppnar den i webblasaren. Packar forst upp paketet ur
rem Hamtade filer om det inte redan ar gjort. Stang fonstret for att stanga visaren.
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Kortspelspaketets visare
where node >nul 2>&1
if errorlevel 1 (
    echo Node hittades inte. Installera Node 24 fran nodejs.org och dubbelklicka igen.
    pause
    exit /b 1
)
if not exist "paket\unity\Assets" (
    node packa-upp.ts
    if errorlevel 1 (
        echo.
        echo Paketet kunde inte packas upp. Fonstret stangs nar du trycker pa en tangent.
        pause
        exit /b 1
    )
)
rem (utan Nodes varning om att lasa TypeScript ar pa forsok: den ser ut som ett fel men ar inget)
node --disable-warning=ExperimentalWarning visa\server.ts --oppna
if errorlevel 1 (
    echo.
    echo Visaren stannade med ett fel. Fonstret stangs nar du trycker pa en tangent.
    pause
)
