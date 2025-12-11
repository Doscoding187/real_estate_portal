# Advertise With Us Page - Quick Test Guide

## 🚀 Quick Start

```bash
# 1. Start dev server
pnpm dev

# 2. Open browser
# Navigate to: http://localhost:5173/advertise-with-us

# 3. Open DevTools Console (F12)
```

## ✅ What to Look For

### Console Output (Should See)
```
✓ FeaturesGridSection loaded successfully
✓ SocialProofSection loaded successfully
✓ PricingPreviewSection loaded successfully
✓ FinalCTASection loaded successfully
✓ FAQSection loaded successfully
```

### Page Sections (Should Render)
1. ✅ Hero with "Reach High-Intent Property Buyers"
2. ✅ Billboard banner (Sandton Heights)
3. ✅ Partner selection cards (4 cards)
4. ✅ Value proposition benefits
5. ✅ How It Works (3 steps)
6. ✅ Features Grid (6 tiles)
7. ✅ Social Proof metrics (4 metrics)
8. ✅ Pricing Preview (4 cards)
9. ✅ Final CTA
10. ✅ FAQ accordion (8 questions)

### What NOT to See
- ❌ Yellow error boxes
- ❌ "Features Grid Error"
- ❌ "Social Proof Error"
- ❌ "Pricing Preview Error"
- ❌ "Final CTA Error"
- ❌ "FAQ Error"
- ❌ Red console errors

## 🔍 If You See Errors

### Step 1: Check Console
Look for specific error messages:
- `TypeError: Cannot read property 'map' of undefined` → Data issue
- `ChunkLoadError` → Build issue
- `Failed to load [Component]` → Import issue

### Step 2: Clear Cache
```bash
# Hard reload
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# Or clear build cache
rm -rf node_modules/.vite
pnpm dev
```

### Step 3: Check Network Tab
- Verify all JS chunks are loading (200 status)
- Check for failed requests (404, 500)

### Step 4: Try Incognito Mode
- Rules out browser extension conflicts
- Tests with clean cache

## 🐛 Common Issues

### Issue: "Cannot read property 'map' of undefined"
**Fix**: Check that data is being passed to components correctly

### Issue: "ChunkLoadError"
**Fix**: Clear cache and rebuild
```bash
rm -rf node_modules/.vite
pnpm build
pnpm dev
```

### Issue: Components show "Loading..." forever
**Fix**: Check console for warnings about missing props

### Issue: Error boundaries still showing
**Fix**: Check browser console for the actual error message

## 📱 Mobile Testing

```bash
# 1. Get your local IP
ipconfig (Windows)
ifconfig (Mac/Linux)

# 2. Access from mobile
http://[YOUR_IP]:5173/advertise-with-us

# 3. Check mobile layout
- Sections stack vertically
- Text is readable
- Buttons are tappable
- No horizontal scroll
```

## 🎯 Quick Verification

Run this checklist in under 2 minutes:

1. [ ] Page loads without errors
2. [ ] Console shows 5 "loaded successfully" messages
3. [ ] All 10 sections visible
4. [ ] No yellow error boxes
5. [ ] Scroll is smooth
6. [ ] Animations work
7. [ ] CTAs are clickable
8. [ ] FAQ accordion opens/closes

## 🔧 Emergency Fixes

### If page is completely broken:
```bash
# Rollback changes
git checkout HEAD -- client/src/components/advertise/
git checkout HEAD -- client/src/pages/AdvertiseWithUs.tsx

# Restart dev server
pnpm dev
```

### If specific component is broken:
```bash
# Rollback just that component
git checkout HEAD -- client/src/components/advertise/[ComponentName].tsx

# Restart dev server
pnpm dev
```

## 📊 Performance Check

```bash
# Run Lighthouse audit
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Select "Performance" and "Desktop"
4. Click "Analyze page load"

# Target scores:
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90
- SEO: > 90
```

## 🎨 Visual Check

Quickly scan for these visual issues:
- [ ] Sections are centered
- [ ] Consistent spacing between sections
- [ ] Text is readable (good contrast)
- [ ] Images load properly
- [ ] No layout shifts
- [ ] Animations are smooth
- [ ] Mobile layout works

## 🔗 Related Docs

- Full troubleshooting: `ADVERTISE_PAGE_RUNTIME_FIX.md`
- Fix summary: `ADVERTISE_PAGE_FIX_COMPLETE.md`
- Original troubleshooting: `ADVERTISE_WITH_US_TROUBLESHOOTING.md`

## ⚡ One-Line Test

```bash
# Start server and open browser in one command
pnpm dev & sleep 3 && open http://localhost:5173/advertise-with-us
```

## 🎉 Success Criteria

Page is working correctly if:
1. ✅ No error boundaries visible
2. ✅ All sections render with content
3. ✅ Console shows successful loads
4. ✅ No red errors in console
5. ✅ Page is interactive
6. ✅ Animations work smoothly
7. ✅ Mobile layout is responsive

## 📞 Need Help?

If issues persist after following this guide:
1. Check `ADVERTISE_PAGE_RUNTIME_FIX.md` for detailed troubleshooting
2. Review console logs for specific error messages
3. Test in incognito mode to rule out extensions
4. Try a different browser
5. Contact frontend team with console logs and screenshots
