@echo off
cd /d "C:\Users\Hariom\Downloads\Adarsh Auth"
start "Adarsh Auth Server" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"
