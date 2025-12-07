#!/bin/bash

# Explore Frontend Refinement - Visual Documentation Capture Script
# This script provides commands and guidance for capturing visual documentation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCS_DIR="client/src/lib/testing/visual-documentation"
TIMESTAMP=$(date +%Y%m%d)

# Create directory structure
create_directories() {
    echo -e "${BLUE}Creating directory structure...${NC}"
    
    mkdir -p "$DOCS_DIR/screenshots/before/desktop"
    mkdir -p "$DOCS_DIR/screenshots/before/tablet"
    mkdir -p "$DOCS_DIR/screenshots/before/mobile"
    mkdir -p "$DOCS_DIR/screenshots/after/desktop"
    mkdir -p "$DOCS_DIR/screenshots/after/tablet"
    mkdir -p "$DOCS_DIR/screenshots/after/mobile"
    mkdir -p "$DOCS_DIR/videos"
    mkdir -p "$DOCS_DIR/gifs"
    mkdir -p "$DOCS_DIR/comparisons"
    
    echo -e "${GREEN}✓ Directory structure created${NC}"
}

# Display screenshot instructions
screenshot_instructions() {
    echo -e "\n${YELLOW}=== SCREENSHOT CAPTURE INSTRUCTIONS ===${NC}\n"
    
    echo -e "${BLUE}Pages to capture:${NC}"
    echo "1. ExploreHome - http://localhost:5173/explore"
    echo "2. ExploreFeed - http://localhost:5173/explore/feed"
    echo "3. ExploreShorts - http://localhost:5173/explore/shorts"
    echo "4. ExploreMap - http://localhost:5173/explore/map"
    
    echo -e "\n${BLUE}Devices to capture:${NC}"
    echo "- Desktop: 1920x1080"
    echo "- Tablet: 768x1024"
    echo "- Mobile: 375x667"
    
    echo -e "\n${BLUE}Chrome DevTools Method:${NC}"
    echo "1. Open Chrome DevTools (F12)"
    echo "2. Toggle device toolbar (Ctrl+Shift+M)"
    echo "3. Set device dimensions"
    echo "4. Navigate to page"
    echo "5. Ctrl+Shift+P → 'Capture full size screenshot'"
    
    echo -e "\n${BLUE}Save locations:${NC}"
    echo "Before: $DOCS_DIR/screenshots/before/[device]/"
    echo "After: $DOCS_DIR/screenshots/after/[device]/"
    
    echo -e "\n${BLUE}Naming convention:${NC}"
    echo "explore-home_${TIMESTAMP}.png"
    echo "explore-feed_${TIMESTAMP}.png"
    echo "explore-shorts_${TIMESTAMP}.png"
    echo "explore-map_${TIMESTAMP}.png"
}

# Display video recording instructions
video_instructions() {
    echo -e "\n${YELLOW}=== VIDEO RECORDING INSTRUCTIONS ===${NC}\n"
    
    echo -e "${BLUE}Videos to record:${NC}"
    echo "1. Smooth video playback (5-8s)"
    echo "   - Navigate to ExploreShorts"
    echo "   - Scroll down slowly"
    echo "   - Show auto-play/pause behavior"
    echo ""
    echo "2. Map/feed synchronization (5-8s)"
    echo "   - Navigate to ExploreMap"
    echo "   - Pan the map"
    echo "   - Click property in feed"
    echo "   - Show map centering"
    echo ""
    echo "3. Filter interactions (5-8s)"
    echo "   - Navigate to ExploreFeed"
    echo "   - Open filter panel"
    echo "   - Apply filters"
    echo "   - Show results updating"
    echo ""
    echo "4. Card animations (3-5s)"
    echo "   - Show property cards"
    echo "   - Hover over cards"
    echo "   - Click a card"
    
    echo -e "\n${BLUE}Recording settings:${NC}"
    echo "- Resolution: 1920x1080"
    echo "- Frame rate: 60 FPS"
    echo "- Format: MP4"
    
    echo -e "\n${BLUE}OBS Studio Quick Setup:${NC}"
    echo "1. Add 'Display Capture' source"
    echo "2. Settings → Video → 1920x1080, 60 FPS"
    echo "3. Settings → Output → Recording → MP4, 6000 Kbps"
    echo "4. Start Recording"
    
    echo -e "\n${BLUE}Save location:${NC}"
    echo "$DOCS_DIR/videos/"
    
    echo -e "\n${BLUE}Naming convention:${NC}"
    echo "smooth-video-playback.mp4"
    echo "map-feed-synchronization.mp4"
    echo "filter-interactions.mp4"
    echo "card-animations.mp4"
}

# Display GIF creation instructions
gif_instructions() {
    echo -e "\n${YELLOW}=== GIF CREATION INSTRUCTIONS ===${NC}\n"
    
    echo -e "${BLUE}GIFs to create:${NC}"
    echo "1. card-hover-animation.gif"
    echo "2. button-press-feedback.gif"
    echo "3. chip-selection.gif"
    echo "4. map-pin-bounce.gif"
    echo "5. video-buffering.gif"
    echo "6. filter-panel-slide.gif"
    echo "7. bottom-sheet-drag.gif"
    echo "8. skeleton-loading.gif"
    echo "9. empty-state.gif"
    echo "10. error-retry.gif"
    
    echo -e "\n${BLUE}GIF specifications:${NC}"
    echo "- Resolution: 800x600"
    echo "- Frame rate: 30 FPS"
    echo "- Duration: 2-4 seconds"
    echo "- File size: <2MB"
    
    echo -e "\n${BLUE}Using FFmpeg:${NC}"
    echo "ffmpeg -i input.mp4 -vf \"fps=30,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse\" output.gif"
    
    echo -e "\n${BLUE}Using Ezgif.com:${NC}"
    echo "1. Go to https://ezgif.com/video-to-gif"
    echo "2. Upload video"
    echo "3. Set size: 800px width"
    echo "4. Set frame rate: 30 FPS"
    echo "5. Convert and optimize"
    
    echo -e "\n${BLUE}Save location:${NC}"
    echo "$DOCS_DIR/gifs/"
}

# Check if required tools are installed
check_tools() {
    echo -e "\n${YELLOW}=== CHECKING REQUIRED TOOLS ===${NC}\n"
    
    # Check for FFmpeg
    if command -v ffmpeg &> /dev/null; then
        echo -e "${GREEN}✓ FFmpeg installed${NC}"
    else
        echo -e "${RED}✗ FFmpeg not installed${NC}"
        echo "  Install: brew install ffmpeg (macOS) or visit https://ffmpeg.org/"
    fi
    
    # Check for Chrome
    if command -v google-chrome &> /dev/null || command -v chrome &> /dev/null; then
        echo -e "${GREEN}✓ Chrome installed${NC}"
    else
        echo -e "${YELLOW}! Chrome not found (recommended for screenshots)${NC}"
    fi
    
    # Check for OBS (optional)
    if command -v obs &> /dev/null; then
        echo -e "${GREEN}✓ OBS Studio installed${NC}"
    else
        echo -e "${YELLOW}! OBS Studio not found (recommended for video recording)${NC}"
        echo "  Install: https://obsproject.com/"
    fi
}

# Create README for visual documentation
create_readme() {
    echo -e "\n${BLUE}Creating README.md...${NC}"
    
    cat > "$DOCS_DIR/README.md" << 'EOF'
# Explore Frontend Refinement - Visual Documentation

## Overview

This folder contains visual documentation for the Explore Frontend Refinement project, including before/after screenshots, demo videos, and GIFs of micro-interactions.

## Contents

### Screenshots

Before/after screenshots of all 4 Explore pages:
- **ExploreHome** (`/explore`)
- **ExploreFeed** (`/explore/feed`)
- **ExploreShorts** (`/explore/shorts`)
- **ExploreMap** (`/explore/map`)

Captured on:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

### Videos

Demo videos showcasing key features:
1. **smooth-video-playback.mp4** - Auto-play/pause behavior (5-8s)
2. **map-feed-synchronization.mp4** - Map and feed sync (5-8s)
3. **filter-interactions.mp4** - Filter application (5-8s)
4. **card-animations.mp4** - Hover and press states (3-5s)

### GIFs

Micro-interaction GIFs:
1. **card-hover-animation.gif** - Card lift on hover
2. **button-press-feedback.gif** - Button scale feedback
3. **chip-selection.gif** - Chip selection animation
4. **map-pin-bounce.gif** - Map pin bounce animation
5. **video-buffering.gif** - Buffering indicator
6. **filter-panel-slide.gif** - Filter panel slide-in
7. **bottom-sheet-drag.gif** - Mobile bottom sheet drag
8. **skeleton-loading.gif** - Skeleton loading state
9. **empty-state.gif** - Empty state animation
10. **error-retry.gif** - Error retry button

### Comparisons

Side-by-side before/after comparisons:
- **explore-home-comparison.png**
- **explore-feed-comparison.png**
- **explore-shorts-comparison.png**
- **explore-map-comparison.png**

## Usage

### In Pull Requests

```markdown
## Visual Changes

### ExploreHome
![Before/After](./visual-documentation/comparisons/explore-home-comparison.png)

### Key Interactions
![Card Hover](./visual-documentation/gifs/card-hover-animation.gif)
![Filter Panel](./visual-documentation/gifs/filter-panel-slide.gif)
```

### In Documentation

Embed images and GIFs in markdown files to illustrate features.

### In Presentations

Use screenshots and videos in stakeholder presentations.

## Tools Used

- **Screenshots:** Chrome DevTools
- **Videos:** OBS Studio / QuickTime
- **GIFs:** FFmpeg / Ezgif.com
- **Editing:** DaVinci Resolve / GIMP

## Quality Standards

- Screenshots: PNG format, full resolution
- Videos: 1080p 60fps MP4
- GIFs: 800x600, 30fps, <2MB
- All assets optimized for web

## Last Updated

December 2024
EOF
    
    echo -e "${GREEN}✓ README.md created${NC}"
}

# Display completion checklist
show_checklist() {
    echo -e "\n${YELLOW}=== VISUAL DOCUMENTATION CHECKLIST ===${NC}\n"
    
    echo "Screenshots:"
    echo "  [ ] ExploreHome - Before (Desktop, Tablet, Mobile)"
    echo "  [ ] ExploreHome - After (Desktop, Tablet, Mobile)"
    echo "  [ ] ExploreFeed - Before (Desktop, Tablet, Mobile)"
    echo "  [ ] ExploreFeed - After (Desktop, Tablet, Mobile)"
    echo "  [ ] ExploreShorts - Before (Desktop, Tablet, Mobile)"
    echo "  [ ] ExploreShorts - After (Desktop, Tablet, Mobile)"
    echo "  [ ] ExploreMap - Before (Desktop, Tablet, Mobile)"
    echo "  [ ] ExploreMap - After (Desktop, Tablet, Mobile)"
    echo ""
    echo "Videos:"
    echo "  [ ] Smooth video playback (5-8s)"
    echo "  [ ] Map/feed synchronization (5-8s)"
    echo "  [ ] Filter interactions (5-8s)"
    echo "  [ ] Card animations (3-5s)"
    echo ""
    echo "GIFs:"
    echo "  [ ] Card hover animation"
    echo "  [ ] Button press feedback"
    echo "  [ ] Chip selection"
    echo "  [ ] Map pin bounce"
    echo "  [ ] Video buffering indicator"
    echo "  [ ] Filter panel slide"
    echo "  [ ] Bottom sheet drag"
    echo "  [ ] Skeleton loading"
    echo "  [ ] Empty state animation"
    echo "  [ ] Error retry button"
    echo ""
    echo "Comparisons:"
    echo "  [ ] ExploreHome comparison"
    echo "  [ ] ExploreFeed comparison"
    echo "  [ ] ExploreShorts comparison"
    echo "  [ ] ExploreMap comparison"
}

# Main menu
show_menu() {
    echo -e "\n${GREEN}=== VISUAL DOCUMENTATION CAPTURE TOOL ===${NC}\n"
    echo "1. Create directory structure"
    echo "2. Show screenshot instructions"
    echo "3. Show video recording instructions"
    echo "4. Show GIF creation instructions"
    echo "5. Check required tools"
    echo "6. Create README"
    echo "7. Show completion checklist"
    echo "8. Run all setup steps"
    echo "9. Exit"
    echo ""
    read -p "Select an option (1-9): " choice
    
    case $choice in
        1) create_directories ;;
        2) screenshot_instructions ;;
        3) video_instructions ;;
        4) gif_instructions ;;
        5) check_tools ;;
        6) create_readme ;;
        7) show_checklist ;;
        8) 
            create_directories
            check_tools
            create_readme
            screenshot_instructions
            video_instructions
            gif_instructions
            show_checklist
            ;;
        9) 
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *) 
            echo -e "${RED}Invalid option${NC}"
            ;;
    esac
    
    # Show menu again
    show_menu
}

# Run the script
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Visual Documentation Capture Tool"
    echo ""
    echo "Usage: ./capture-visual-docs.sh [option]"
    echo ""
    echo "Options:"
    echo "  --help, -h     Show this help message"
    echo "  --setup        Run all setup steps"
    echo "  --check        Check required tools"
    echo ""
    echo "Interactive mode: Run without arguments"
    exit 0
elif [ "$1" == "--setup" ]; then
    create_directories
    check_tools
    create_readme
    echo -e "\n${GREEN}Setup complete!${NC}"
    echo "Run './capture-visual-docs.sh' for instructions"
    exit 0
elif [ "$1" == "--check" ]; then
    check_tools
    exit 0
else
    show_menu
fi
