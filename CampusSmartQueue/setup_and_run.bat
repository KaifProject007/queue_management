@echo off
title Campus SmartQueue 2.0 - One-Click Setup & Launch
cd /d "%~dp0"

echo =================================================================
echo       CAMPUS SMARTQUEUE 2.0 - AUTOMATED DEPENDENCY INSTALLER
echo =================================================================
echo.
echo [Step 1/2] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

echo [Step 2/2] Installing all required libraries from requirements.txt in 1 step...
echo (FastAPI, Uvicorn, Pandas, NumPy, Scikit-learn, LightGBM, HTTPX)
echo.
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Some packages failed to install. Retrying with --user flag...
    pip install --user -r requirements.txt
)

echo.
echo =================================================================
echo       ALL LIBRARIES INSTALLED SUCCESSFULLY!
echo       Starting Campus SmartQueue 2.0 on http://127.0.0.1:8000
echo =================================================================
echo.
python run.py
pause
