@echo off
REM Corn Thief Maze - Android App Build Script for Windows
REM This script builds the Android app using Gradle

setlocal enabledelayedexpansion

echo.
echo =========================================
echo Corn Thief Maze - Android Build
echo =========================================
echo.

REM Check if gradle is installed
where gradle >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Gradle is not installed or not in PATH
    echo.
    echo Please install Gradle 8.2.1:
    echo 1. Download from: https://gradle.org/releases/
    echo 2. Extract to a folder
    echo 3. Add the bin folder to your PATH environment variable
    echo.
    echo Or use Android Studio's built-in Gradle
    exit /b 1
)

REM Parse command line arguments
set BUILD_TYPE=debug
set TASK=assembleDebug

if "%1"=="" (
    echo Building Debug APK...
    set BUILD_TYPE=debug
    set TASK=assembleDebug
) else if /i "%1"=="release" (
    echo Building Release APK...
    set BUILD_TYPE=release
    set TASK=assembleRelease
) else if /i "%1"=="clean" (
    echo Cleaning build directory...
    call gradle clean
    exit /b !errorlevel!
) else if /i "%1"=="install" (
    echo Installing Debug APK to device...
    set BUILD_TYPE=debug
    set TASK=installDebug
) else (
    echo Usage: build.bat [debug^|release^|clean^|install]
    echo.
    echo Examples:
    echo   build.bat              - Build debug APK
    echo   build.bat release      - Build release APK
    echo   build.bat clean        - Clean build directory
    echo   build.bat install      - Build and install debug APK to connected device
    exit /b 1
)

REM Run gradle task
echo.
echo Running gradle %TASK%...
echo.
call gradle %TASK%

if !errorlevel! equ 0 (
    echo.
    echo =========================================
    echo Build successful!
    echo =========================================
    if "%BUILD_TYPE%"=="debug" (
        echo APK location: app\build\outputs\apk\debug\app-debug.apk
    ) else if "%BUILD_TYPE%"=="release" (
        echo APK location: app\build\outputs\apk\release\app-release.apk
    )
    echo.
) else (
    echo.
    echo =========================================
    echo Build failed!
    echo =========================================
    exit /b !errorlevel!
)

endlocal
