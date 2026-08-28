import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const apiKey = searchParams.get('api_key') || 'YOUR_API_KEY_HERE';
  const serverUrl = searchParams.get('url') || req.nextUrl.origin || 'http://localhost:3000';

  const batContent = `@echo off
title TradeLens MT5 1-Click Synchronizer
color 0B

echo =============================================================
echo   TradeLens - 1-Click MetaTrader 5 Desktop Synchronizer
echo =============================================================
echo.

:: 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python was not found in your system PATH.
    echo Please install Python 3 from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

:: 2. Check & Install dependencies
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

:: 3. Download tradelens_sync.py if missing
if not exist "%~dp0tradelens_sync.py" (
    if not exist "%~dp0scripts\\tradelens_sync.py" (
        echo [*] Downloading latest sync engine...
        powershell -Command "Invoke-WebRequest -Uri '${serverUrl}/scripts/tradelens_sync.py' -OutFile '%~dp0tradelens_sync.py'"
    )
)

echo [OK] Launching real-time synchronization...
echo.

if exist "%~dp0tradelens_sync.py" (
    python "%~dp0tradelens_sync.py" --api-key "${apiKey}" --url "${serverUrl}"
) else if exist "%~dp0scripts\\tradelens_sync.py" (
    python "%~dp0scripts\\tradelens_sync.py" --api-key "${apiKey}" --url "${serverUrl}"
) else (
    echo [X] Error: Could not locate tradelens_sync.py
    pause
)

pause
`;

  return new NextResponse(batContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-bat',
      'Content-Disposition': `attachment; filename="TradeLens_MT5_Sync.bat"`,
    },
  });
}
