@echo off
REM Explore Frontend Refinement - Visual Documentation Capture Script (Windows)
REM This script provides commands and guidance for capturing visual documentation

setlocal enabledelayedexpansion

REM Configuration
set DOCS_DIR=client\src\lib\testing\visual-documentation
set TIMESTAMP=%date:~-4%%date:~4,2%%date:~7,2%

REM Colors (using ANSI escape codes if supported)
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "RED=[91m"
set "NC=[0m"

:MENU
cls
echo.
echo ========================================
echo   VISUAL DOCUMENTATION CAPTURE TOOL
echo ========================================
echo.
echo 1. Create directory structure
echo 2. Show screenshot instructions
echo 3. Show video recording instructions
echo 4. Show GIF creation instructions
echo 5. Check required tools
echo 6. Create README
echo 7. Show completion checklist
echo 8. Run all setup steps
echo 9. Exit
echo.
set /p choice="Select an option (1-9): "

if "%choice%"=="1" goto CREATE_DIRS
if "%choice%"=="2" goto SCREENSHOT_INSTRUCTIONS
if "%choice%"=="3" goto VIDEO_INSTRUCTIONS
if "%choice%"=="4" goto GIF_INSTRUCTIONS
if "%choice%"=="5" goto CHECK_TOOLS
if "%choice%"=="6" goto CREATE_README
if "%choice%"=="7" goto SHOW_CHECKLIST
if "%choice%"=="8" goto RUN_ALL
if "%choice%"=="9" goto EXIT
goto MENU

:CREATE_DIRS
echo.
echo Creating directory structure...
echo.

mkdir "%DOCS_DIR%\screenshots\before\desktop" 2>nul
mkdir "%DOCS_DIR%\screenshots\before\tablet" 2>nul
mkdir "%DOCS_DIR%\screenshots\before\mobile" 2>nul
mkdir "%DOCS_DIR%\screenshots\after\desktop" 2>nul
mkdir "%DOCS_DIR%\screenshots\after\tablet" 2>nul
mkdir "%DOCS_DIR%\screenshots\after\mobile" 2>nul
mkdir "%DOCS_DIR%\videos" 2>nul
mkdir "%DOCS_DIR%\gifs" 2>nul
mkdir "%DOCS_DIR%\comparisons" 2>nul

echo Directory structure created successfully!
echo.
pause
goto MENU

:SCREENSHOT_INSTRUCTIONS
cls
echo.
echo ========================================
echo   SCREENSHOT CAPTURE INSTRUCTIONS
echo ========================================
echo.
echo Pages to capture:
echo   1. ExploreHome - http://localhost:5173/explore
echo   2. ExploreFeed - http://localhost:5173/explore/feed
echo   3. ExploreShorts - http://localhost:5173/explore/shorts
echo   4. ExploreMap - http://localhost:5173/explore/map
echo.
echo Devices to capture:
echo   - Desktop: 1920x1080
echo   - Tablet: 768x1024
echo   - Mobile: 375x667
echo.
echo Chrome DevTools Method:
echo   1. Open Chrome DevTools (F12)
echo   2. Toggle device toolbar (Ctrl+Shift+M)
echo   3. Set device dimensions
echo   4. Navigate to page
echo   5. Ctrl+Shift+P -^> 'Capture full size screenshot'
echo.
echo Windows Snipping Tool:
echo   1. Press Windows + Shift + S
echo   2. Select area to capture
echo   3. Save to appropriate folder
echo.
echo Save locations:
echo   Before: %DOCS_DIR%\screenshots\before\[device]\
echo   After: %DOCS_DIR%\screenshots\after\[device]\
echo.
echo Naming convention:
echo   explore-home_%TIMESTAMP%.png
echo   explore-feed_%TIMESTAMP%.png
echo   explore-shorts_%TIMESTAMP%.png
echo   explore-map_%TIMESTAMP%.png
echo.
pause
goto MENU

:VIDEO_INSTRUCTIONS
cls
echo.
echo ========================================
echo   VIDEO RECORDING INSTRUCTIONS
echo ========================================
echo.
echo Videos to record:
echo.
echo 1. Smooth video playback (5-8s)
echo    - Navigate to ExploreShorts
echo    - Scroll down slowly
echo    - Show auto-play/pause behavior
echo.
echo 2. Map/feed synchronization (5-8s)
echo    - Navigate to ExploreMap
echo    - Pan the map
echo    - Click property in feed
echo    - Show map centering
echo.
echo 3. Filter interactions (5-8s)
echo    - Navigate to ExploreFeed
echo    - Open filter panel
echo    - Apply filters
echo    - Show results updating
echo.
echo 4. Card animations (3-5s)
echo    - Show property cards
echo    - Hover over cards
echo    - Click a card
echo.
echo Recording settings:
echo   - Resolution: 1920x1080
echo   - Frame rate: 60 FPS
echo   - Format: MP4
echo.
echo Windows Game Bar (Built-in):
echo   1. Press Windows + G
echo   2. Click "Capture" button
echo   3. Start recording
echo   4. Windows + Alt + R to stop
echo.
echo OBS Studio (Recommended):
echo   1. Download from https://obsproject.com/
echo   2. Add 'Display Capture' source
echo   3. Settings -^> Video -^> 1920x1080, 60 FPS
echo   4. Settings -^> Output -^> Recording -^> MP4, 6000 Kbps
echo   5. Start Recording
echo.
echo Save location:
echo   %DOCS_DIR%\videos\
echo.
echo Naming convention:
echo   smooth-video-playback.mp4
echo   map-feed-synchronization.mp4
echo   filter-interactions.mp4
echo   card-animations.mp4
echo.
pause
goto MENU

:GIF_INSTRUCTIONS
cls
echo.
echo ========================================
echo   GIF CREATION INSTRUCTIONS
echo ========================================
echo.
echo GIFs to create:
echo   1. card-hover-animation.gif
echo   2. button-press-feedback.gif
echo   3. chip-selection.gif
echo   4. map-pin-bounce.gif
echo   5. video-buffering.gif
echo   6. filter-panel-slide.gif
echo   7. bottom-sheet-drag.gif
echo   8. skeleton-loading.gif
echo   9. empty-state.gif
echo   10. error-retry.gif
echo.
echo GIF specifications:
echo   - Resolution: 800x600
echo   - Frame rate: 30 FPS
echo   - Duration: 2-4 seconds
echo   - File size: ^<2MB
echo.
echo ScreenToGif (Recommended for Windows):
echo   1. Download from https://www.screentogif.com/
echo   2. Install and launch
echo   3. Click "Recorder"
echo   4. Select area to record
echo   5. Click "Record"
echo   6. Edit frames
echo   7. Export as GIF
echo.
echo Using FFmpeg (if installed):
echo   ffmpeg -i input.mp4 -vf "fps=30,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" output.gif
echo.
echo Using Ezgif.com (Online):
echo   1. Go to https://ezgif.com/video-to-gif
echo   2. Upload video
echo   3. Set size: 800px width
echo   4. Set frame rate: 30 FPS
echo   5. Convert and optimize
echo.
echo Save location:
echo   %DOCS_DIR%\gifs\
echo.
pause
goto MENU

:CHECK_TOOLS
cls
echo.
echo ========================================
echo   CHECKING REQUIRED TOOLS
echo ========================================
echo.

REM Check for Chrome
where chrome >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Chrome installed
) else (
    echo [!] Chrome not found ^(recommended for screenshots^)
)

REM Check for FFmpeg
where ffmpeg >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] FFmpeg installed
) else (
    echo [!] FFmpeg not installed
    echo     Download from https://ffmpeg.org/
)

REM Check for OBS
where obs64 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] OBS Studio installed
) else (
    echo [!] OBS Studio not found ^(recommended for video recording^)
    echo     Download from https://obsproject.com/
)

REM Check for ScreenToGif
if exist "%LOCALAPPDATA%\ScreenToGif\ScreenToGif.exe" (
    echo [OK] ScreenToGif installed
) else (
    echo [!] ScreenToGif not found ^(recommended for GIF creation^)
    echo     Download from https://www.screentogif.com/
)

echo.
echo Recommended Tools:
echo   - Chrome ^(screenshots^)
echo   - OBS Studio ^(video recording^)
echo   - ScreenToGif ^(GIF creation^)
echo   - FFmpeg ^(video/GIF conversion^)
echo.
pause
goto MENU

:CREATE_README
echo.
echo Creating README.md...
echo.

(
echo # Explore Frontend Refinement - Visual Documentation
echo.
echo ## Overview
echo.
echo This folder contains visual documentation for the Explore Frontend Refinement project, including before/after screenshots, demo videos, and GIFs of micro-interactions.
echo.
echo ## Contents
echo.
echo ### Screenshots
echo.
echo Before/after screenshots of all 4 Explore pages:
echo - **ExploreHome** ^(`/explore`^)
echo - **ExploreFeed** ^(`/explore/feed`^)
echo - **ExploreShorts** ^(`/explore/shorts`^)
echo - **ExploreMap** ^(`/explore/map`^)
echo.
echo Captured on:
echo - Desktop ^(1920x1080^)
echo - Tablet ^(768x1024^)
echo - Mobile ^(375x667^)
echo.
echo ### Videos
echo.
echo Demo videos showcasing key features:
echo 1. **smooth-video-playback.mp4** - Auto-play/pause behavior ^(5-8s^)
echo 2. **map-feed-synchronization.mp4** - Map and feed sync ^(5-8s^)
echo 3. **filter-interactions.mp4** - Filter application ^(5-8s^)
echo 4. **card-animations.mp4** - Hover and press states ^(3-5s^)
echo.
echo ### GIFs
echo.
echo Micro-interaction GIFs:
echo 1. **card-hover-animation.gif** - Card lift on hover
echo 2. **button-press-feedback.gif** - Button scale feedback
echo 3. **chip-selection.gif** - Chip selection animation
echo 4. **map-pin-bounce.gif** - Map pin bounce animation
echo 5. **video-buffering.gif** - Buffering indicator
echo 6. **filter-panel-slide.gif** - Filter panel slide-in
echo 7. **bottom-sheet-drag.gif** - Mobile bottom sheet drag
echo 8. **skeleton-loading.gif** - Skeleton loading state
echo 9. **empty-state.gif** - Empty state animation
echo 10. **error-retry.gif** - Error retry button
echo.
echo ### Comparisons
echo.
echo Side-by-side before/after comparisons:
echo - **explore-home-comparison.png**
echo - **explore-feed-comparison.png**
echo - **explore-shorts-comparison.png**
echo - **explore-map-comparison.png**
echo.
echo ## Tools Used
echo.
echo - **Screenshots:** Chrome DevTools, Windows Snipping Tool
echo - **Videos:** OBS Studio, Windows Game Bar
echo - **GIFs:** ScreenToGif, FFmpeg, Ezgif.com
echo.
echo ## Quality Standards
echo.
echo - Screenshots: PNG format, full resolution
echo - Videos: 1080p 60fps MP4
echo - GIFs: 800x600, 30fps, ^<2MB
echo - All assets optimized for web
echo.
echo ## Last Updated
echo.
echo December 2024
) > "%DOCS_DIR%\README.md"

echo README.md created successfully!
echo.
pause
goto MENU

:SHOW_CHECKLIST
cls
echo.
echo ========================================
echo   VISUAL DOCUMENTATION CHECKLIST
echo ========================================
echo.
echo Screenshots:
echo   [ ] ExploreHome - Before ^(Desktop, Tablet, Mobile^)
echo   [ ] ExploreHome - After ^(Desktop, Tablet, Mobile^)
echo   [ ] ExploreFeed - Before ^(Desktop, Tablet, Mobile^)
echo   [ ] ExploreFeed - After ^(Desktop, Tablet, Mobile^)
echo   [ ] ExploreShorts - Before ^(Desktop, Tablet, Mobile^)
echo   [ ] ExploreShorts - After ^(Desktop, Tablet, Mobile^)
echo   [ ] ExploreMap - Before ^(Desktop, Tablet, Mobile^)
echo   [ ] ExploreMap - After ^(Desktop, Tablet, Mobile^)
echo.
echo Videos:
echo   [ ] Smooth video playback ^(5-8s^)
echo   [ ] Map/feed synchronization ^(5-8s^)
echo   [ ] Filter interactions ^(5-8s^)
echo   [ ] Card animations ^(3-5s^)
echo.
echo GIFs:
echo   [ ] Card hover animation
echo   [ ] Button press feedback
echo   [ ] Chip selection
echo   [ ] Map pin bounce
echo   [ ] Video buffering indicator
echo   [ ] Filter panel slide
echo   [ ] Bottom sheet drag
echo   [ ] Skeleton loading
echo   [ ] Empty state animation
echo   [ ] Error retry button
echo.
echo Comparisons:
echo   [ ] ExploreHome comparison
echo   [ ] ExploreFeed comparison
echo   [ ] ExploreShorts comparison
echo   [ ] ExploreMap comparison
echo.
pause
goto MENU

:RUN_ALL
call :CREATE_DIRS
call :CHECK_TOOLS
call :CREATE_README
echo.
echo ========================================
echo   SETUP COMPLETE!
echo ========================================
echo.
echo Next steps:
echo   1. Review screenshot instructions ^(option 2^)
echo   2. Review video recording instructions ^(option 3^)
echo   3. Review GIF creation instructions ^(option 4^)
echo   4. Start capturing visual documentation
echo   5. Check completion checklist ^(option 7^)
echo.
pause
goto MENU

:EXIT
echo.
echo Goodbye!
echo.
exit /b 0
