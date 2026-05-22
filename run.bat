@echo off
setlocal enabledelayedexpansion

echo ==========================================================
echo        JEWEL AI STUDIO - STARTUP SCRIPT
echo ==========================================================
echo.
echo This script boots Jewel AI Studio entirely on localhost.
echo Zero containers, zero external databases, zero external queues required!
echo Database: Local SQLite file (dev.db)
echo Queue: In-Memory asynchronous queue fallback
echo.

REM Check for root node_modules
if not exist "node_modules\" (
    echo [1/4] Installing root orchestration dependencies...
    call npm install --silent
) else (
    echo [1/4] Root dependencies found.
)

REM Check for backend node_modules
if not exist "backend\node_modules\" (
    echo [2/4] Installing backend dependencies...
    call npm run install:backend --silent
) else (
    echo [2/4] Backend dependencies found.
)

REM Check for frontend node_modules
if not exist "frontend\node_modules\" (
    echo [3/4] Installing frontend dependencies...
    call npm run install:frontend --silent
) else (
    echo [3/4] Frontend dependencies found.
)

echo [4/4] Setting up local SQLite database...
cd backend
if not exist ".env" (
    echo [!] WARNING: backend\.env is missing.
    echo Please make sure to configure your API keys.
)

if not exist "prisma\dev.db" (
    echo Database file not found. Initializing schema...
    call npx prisma db push --accept-data-loss
) else (
    echo Database file found. Synchronizing local schema...
    call npx prisma db push --accept-data-loss
)
cd ..

echo.
echo ----------------------------------------------------------
echo SUCCESS: Services are configured!
echo The system will automatically find available ports.
echo Check the console output below for your access URLs!
echo ----------------------------------------------------------
echo.
echo Starting frontend and backend dev servers...
echo Press CTRL+C to stop both servers.
echo.

call npm run dev
