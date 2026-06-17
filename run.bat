@echo off
cd /d "%~dp0project2video"

:loop
echo.
echo ========================================
echo   Project2Video - AI Video Generator
echo ========================================
echo.

:input
set /p PROJECT_PATH="Enter project path (or 'q' to quit): "
if /i "%PROJECT_PATH%"=="q" goto end
if "%PROJECT_PATH%"=="" (
    echo Path cannot be empty, please try again
    goto input
)

echo.
echo Choose template:
echo   1. minimal       - Minimal style (universal)
echo   2. product-hunter - Product Hunt style
echo   3. game-trailer   - Game trailer style
echo.
set /p TEMPLATE_CHOICE="Select template (1-3, default 1): "

if "%TEMPLATE_CHOICE%"=="2" (
    set TEMPLATE=product-hunter
) else if "%TEMPLATE_CHOICE%"=="3" (
    set TEMPLATE=game-trailer
) else (
    set TEMPLATE=minimal
)

echo.
echo Choose mode:
echo   1. Standard  - AI analysis + render video
echo   2. Fast      - Skip AI, use default script
echo   3. Story only - Generate storyboard only
echo.
set /p MODE_CHOICE="Select mode (1-3, default 1): "

set EXTRA_ARGS=
if "%MODE_CHOICE%"=="2" (
    set EXTRA_ARGS=--fast
) else if "%MODE_CHOICE%"=="3" (
    set EXTRA_ARGS=--story-only --save-intermediates
)

echo.
echo Generating video...
echo.

node bin/cli.js "%PROJECT_PATH%" -t %TEMPLATE% --save-intermediates %EXTRA_ARGS%

echo.
echo ========================================
echo Done!
echo.
set /p CONTINUE="Process another project? (y/n, default y): "
if /i "%CONTINUE%"=="n" goto end
goto loop

:end
echo.
echo Bye!
pause
