@echo off
echo ================================================
echo   Fixing TypeScript Configuration
echo ================================================
echo.

cd frontend

echo Reinstalling React type definitions...
call npm install --save-dev @types/react @types/react-dom

echo.
echo ================================================
echo   Done!
echo ================================================
echo.
echo Now do this in VS Code:
echo 1. Press Ctrl+Shift+P
echo 2. Type: TypeScript: Restart TS Server
echo 3. Press Enter
echo.
echo The error should be gone!
echo.

pause
