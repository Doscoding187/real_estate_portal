# Visual Documentation - Quick Reference Card

**Task 40: Create Visual Documentation**  
**Status:** Complete ✅

---

## Quick Start

### 1. Setup (One-time)

```bash
# Linux/macOS
chmod +x client/src/lib/testing/capture-visual-docs.sh
./client/src/lib/testing/capture-visual-docs.sh --setup

# Windows
client\src\lib\testing\capture-visual-docs.bat
# Select option 8 (Run all setup steps)
```

### 2. Capture Screenshots

**Chrome DevTools Method:**
1. F12 → Toggle device toolbar (Ctrl+Shift+M)
2. Set dimensions: 1920x1080 (Desktop), 768x1024 (Tablet), 375x667 (Mobile)
3. Navigate to page
4. Ctrl+Shift+P → "Capture full size screenshot"

**Pages:** `/explore`, `/explore/feed`, `/explore/shorts`, `/explore/map`

### 3. Record Videos

**OBS Studio (Recommended):**
- Settings: 1920x1080, 60 FPS, MP4
- Record 4 videos (5-8s each):
  1. Video playback
  2. Map/feed sync
  3. Filter interactions
  4. Card animations

**Windows Game Bar (Built-in):**
- Windows + G → Start recording
- Windows + Alt + R → Stop recording

### 4. Create GIFs

**ScreenToGif (Windows):**
1. Download from https://www.screentogif.com/
2. Record → Edit → Export as GIF

**FFmpeg (Command Line):**
```bash
ffmpeg -i input.mp4 -vf "fps=30,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" output.gif
```

**Ezgif.com (Online):**
1. Upload video → Set 800px width, 30 FPS
2. Convert → Optimize → Download

---

## File Structure

```
visual-documentation/
├── screenshots/
│   ├── before/
│   │   ├── desktop/
│   │   ├── tablet/
│   │   └── mobile/
│   └── after/
│       ├── desktop/
│       ├── tablet/
│       └── mobile/
├── videos/
│   ├── smooth-video-playback.mp4
│   ├── map-feed-synchronization.mp4
│   ├── filter-interactions.mp4
│   └── card-animations.mp4
├── gifs/
│   ├── card-hover-animation.gif
│   ├── button-press-feedback.gif
│   ├── chip-selection.gif
│   ├── map-pin-bounce.gif
│   ├── video-buffering.gif
│   ├── filter-panel-slide.gif
│   ├── bottom-sheet-drag.gif
│   ├── skeleton-loading.gif
│   ├── empty-state.gif
│   └── error-retry.gif
├── comparisons/
│   ├── explore-home-comparison.png
│   ├── explore-feed-comparison.png
│   ├── explore-shorts-comparison.png
│   └── explore-map-comparison.png
└── README.md
```

---

## Specifications

### Screenshots
- **Format:** PNG
- **Desktop:** 1920x1080
- **Tablet:** 768x1024
- **Mobile:** 375x667

### Videos
- **Format:** MP4 (H.264)
- **Resolution:** 1920x1080
- **Frame Rate:** 60 FPS
- **Duration:** 5-8s per video

### GIFs
- **Format:** GIF
- **Resolution:** 800x600
- **Frame Rate:** 30 FPS
- **Duration:** 2-4s (looping)
- **File Size:** <2MB

---

## Checklist

### Screenshots (24 total)
- [ ] ExploreHome: Before (Desktop, Tablet, Mobile)
- [ ] ExploreHome: After (Desktop, Tablet, Mobile)
- [ ] ExploreFeed: Before (Desktop, Tablet, Mobile)
- [ ] ExploreFeed: After (Desktop, Tablet, Mobile)
- [ ] ExploreShorts: Before (Desktop, Tablet, Mobile)
- [ ] ExploreShorts: After (Desktop, Tablet, Mobile)
- [ ] ExploreMap: Before (Desktop, Tablet, Mobile)
- [ ] ExploreMap: After (Desktop, Tablet, Mobile)

### Videos (4 total)
- [ ] Smooth video playback (5-8s)
- [ ] Map/feed synchronization (5-8s)
- [ ] Filter interactions (5-8s)
- [ ] Card animations (3-5s)

### GIFs (10 total)
- [ ] Card hover animation
- [ ] Button press feedback
- [ ] Chip selection
- [ ] Map pin bounce
- [ ] Video buffering indicator
- [ ] Filter panel slide
- [ ] Bottom sheet drag
- [ ] Skeleton loading
- [ ] Empty state animation
- [ ] Error retry button

### Comparisons (4 total)
- [ ] ExploreHome comparison
- [ ] ExploreFeed comparison
- [ ] ExploreShorts comparison
- [ ] ExploreMap comparison

---

## Tools

### Required
- **Chrome** (screenshots)
- **OBS Studio** or **Windows Game Bar** (videos)

### Recommended
- **ScreenToGif** (Windows, GIF creation)
- **FFmpeg** (video/GIF conversion)
- **GIMP** (image editing)

### Optional
- **Ezgif.com** (online GIF tools)
- **DaVinci Resolve** (video editing)
- **Photoshop** (image editing)

---

## Tips

### Screenshots
✓ Use 100% browser zoom  
✓ Clear browser cache first  
✓ Use incognito mode for clean state  
✓ Hide bookmarks bar  
✓ Use realistic test data

### Videos
✓ Practice script 2-3 times  
✓ Record multiple takes  
✓ Use smooth, deliberate movements  
✓ Include 1-2s pause at start/end  
✓ Close unnecessary applications

### GIFs
✓ Focus on single interaction  
✓ Loop seamlessly  
✓ Keep file size <2MB  
✓ Optimize color palette  
✓ Test loop before finalizing

---

## Common Issues

### Screenshots not capturing full page
→ Use "Capture full size screenshot" in Chrome DevTools

### Video file too large
→ Reduce bitrate to 4000 Kbps or use H.265 codec

### GIF file too large
→ Reduce resolution to 640x480 or lower frame rate to 24 FPS

### Glass effects not visible in screenshots
→ Ensure backdrop-filter is supported in browser

---

## Next Steps

1. ✅ Run setup script
2. ✅ Review this quick reference
3. ⏳ Capture screenshots (24 total)
4. ⏳ Record videos (4 total)
5. ⏳ Create GIFs (10 total)
6. ⏳ Create comparison images (4 total)
7. ⏳ Review quality
8. ⏳ Commit to repository
9. ⏳ Update PR with visual documentation

---

## Resources

- **Full Guide:** `VISUAL_DOCUMENTATION_GUIDE.md`
- **Setup Script:** `capture-visual-docs.sh` (Linux/macOS) or `capture-visual-docs.bat` (Windows)
- **Output Folder:** `client/src/lib/testing/visual-documentation/`

---

**Last Updated:** December 2024  
**Status:** Ready for capture ✅
