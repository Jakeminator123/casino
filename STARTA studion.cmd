@echo off
rem Startar studion, ingangen till hela casino-repot, och visar startsidan i webblasaren. Studion gar sedan i bakgrunden
rem utan fonster; den har rutan stangs av sig sjalv. Studion startar dockans editor nar dess sida oppnas. Stoppa allt
rem med: node start.ts stoppa
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Studion
where node >nul 2>&1
if errorlevel 1 (
    echo Node hittades inte. Installera Node 24 fran nodejs.org och dubbelklicka igen.
    pause
    exit /b 1
)
node start.ts
if errorlevel 1 (
    echo.
    echo Studion startade inte. Fonstret stangs nar du trycker pa en tangent.
    pause
)
