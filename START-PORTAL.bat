@echo off
setlocal enabledelayedexpansion
title Student Project Finder & Originality Checker - Starting Portal...

echo ==============================================================================
echo       STUDENT PROJECT FINDER & ORIGINALITY CHECKER - ACADEMIC PORTAL
echo           Python Flask + MySQL / SQLite + HTML5 / CSS3 / Vanilla JS
echo ==============================================================================
echo.

:: Detect Python
set PYTHON_CMD=python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    ) else (
        echo [ERROR] Python was not detected in PATH or standard installation folder!
        echo Please ensure Python 3.10+ is installed.
        pause
        exit /b 1
    )
)

echo [*] Python executable found: %PYTHON_CMD%
%PYTHON_CMD% --version

:: Ensure UTF-8 output encoding
set PYTHONIOENCODING=utf-8

:: Initialize database & seed admin and demo accounts
echo [*] Checking and initializing database and demo seed accounts...
%PYTHON_CMD% seed_admin.py
%PYTHON_CMD% seed_demo.py

:: Read PORT from .env if defined (default 5000)
set APP_PORT=5000
if exist .env (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if /i "%%A"=="PORT" set APP_PORT=%%B
    )
)

:: Launch browser in background after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:!APP_PORT!"

:: Start the Flask server
echo [*] Launching Flask Application on http://localhost:!APP_PORT! ...
echo [*] Press Ctrl+C at any time to stop the server.
echo.
%PYTHON_CMD% app.py

pause
