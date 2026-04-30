@echo off
setlocal
echo ==============================================
echo   Adarsh Auth - Railway Deployment Script
echo ==============================================
echo.

:: Show current changes
echo Current changes:
git status --short
echo.

:: Prompt for a commit message
set /p commit_msg="Enter commit message (or press enter for 'Auto-update'): "
if "%commit_msg%"=="" set commit_msg=Auto-update

echo.
echo [1/3] Adding changes...
git add .

echo.
echo [2/3] Committing changes...
git commit -m "%commit_msg%"

echo.
echo [3/3] Pushing to GitHub (This triggers Railway!)...
git pull --rebase
git push

echo.
echo ==============================================
echo   Done! Your changes have been sent to GitHub.
echo   Railway will now automatically rebuild and 
echo   deploy your updated project.
echo ==============================================
pause
