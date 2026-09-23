@echo off
echo Building AdarshAuth C++ Example...

call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Searching for Visual Studio vcvars64.bat...
)

cl.exe /EHsc /std:c++17 /O2 main.cpp /Fe:AdarshAuth-Example.exe /link wininet.lib bcrypt.lib advapi32.lib

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [+] Build successful! Output: AdarshAuth-Example.exe
    del main.obj >nul 2>&1
) else (
    echo.
    echo [-] Build failed. Ensure MSVC C++ toolset is installed.
)
pause
