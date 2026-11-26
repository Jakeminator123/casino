@echo off
rem Startar editorn for standarddockan och oppnar den i webblasaren. Stang fonstret for att stanga editorn.
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Standarddockans editor
where node >nul 2>&1
if errorlevel 1 (
    echo Node hittades inte. Installera Node 24 fran nodejs.org och dubbelklicka igen.
    pause
    exit /b 1
)
node editor\server.ts --oppna
if errorlevel 1 (
    echo.
    echo Editorn stannade med ett fel. Fonstret stangs nar du trycker pa en tangent.
    pause
)
