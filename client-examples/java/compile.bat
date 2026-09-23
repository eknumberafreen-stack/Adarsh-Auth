@echo off
echo Compiling AdarshAuth Java Example...
javac -d . AdarshAuth.java Main.java
if %ERRORLEVEL% EQU 0 (
    echo Compilation successful!
    echo Run "run.bat" to start the application.
) else (
    echo Compilation failed. Ensure JDK is installed.
)
pause
