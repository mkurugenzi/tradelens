@echo off
title TradeLens MT5 1-Click Synchronizer
color 0B

echo =============================================================
echo   TradeLens - 1-Click MetaTrader 5 Desktop Synchronizer
echo =============================================================
echo.

:: 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python is not found in your system PATH.
    echo Please install Python from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

:: 2. Check & Install required packages
echo [*] Checking dependencies (MetaTrader5, requests)...
python -c "import MetaTrader5, requests" >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Installing required Python packages...
    python -m pip install --upgrade MetaTrader5 requests
    if %errorlevel% neq 0 (
        echo [X] Failed to install packages. Please check your internet connection.
        pause
        exit /b 1
    )
)

echo [OK] Dependencies ready!
echo.

:: 3. Run Sync Script
:: You can pass your API key here or leave it blank to be prompted
set SERVER_URL=http://localhost:3000

if not exist "%~dp0scripts\tradelens_sync.py" (
    if exist "%~dp0tradelens_sync.py" (
        python "%~dp0tradelens_sync.py" --url %SERVER_URL%
    ) else (
        echo [X] tradelens_sync.py not found in current directory or scripts folder.
        pause
        exit /b 1
    )
) else (
    python "%~dp0scripts\tradelens_sync.py" --url %SERVER_URL%
)

pause
