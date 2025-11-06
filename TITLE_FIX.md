# Fixing Browser Title Not Updating

## Issue
The browser title (`<title>` tag) is not updating even though `.env` file was changed.

## Solution Steps

### 1. Verify .env File Location
The `.env` file must be in the **project root** (same level as `package.json`).

### 2. Verify .env File Content
Make sure it contains:
```
VITE_APP_TITLE=South Africa's Fastest Growing Real Estate Platform
```

### 3. Restart Development Server
**Important:** Vite only reads `.env` files when the server starts!

1. Stop the server (Ctrl+C in terminal)
2. Start it again:
   ```powershell
   pnpm dev
   ```

### 4. Clear Browser Cache
After restarting:
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or open DevTools > Application > Clear Storage > Clear site data

### 5. Check Vite HTML Processing
The `index.html` uses `%VITE_APP_TITLE%` which Vite replaces at build time.

**If still not working:**

1. **Check if Vite is reading the .env file:**
   - Look at server console output when starting
   - You should see Vite starting up

2. **Check for multiple .env files:**
   ```powershell
   Get-ChildItem -Recurse -Filter ".env*" | Select-Object FullName
   ```
   Make sure you're editing the right one!

3. **Try clearing Vite cache:**
   ```powershell
   Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue
   pnpm dev
   ```

4. **Verify the title in the browser:**
   - Open DevTools (F12)
   - Go to Elements tab
   - Search for `<title>`
   - See what it actually contains

5. **Alternative: Update directly in index.html** (temporary test):
   ```html
   <title>South Africa's Fastest Growing Real Estate Platform</title>
   ```
   This will work immediately (but won't use the env variable).

## Common Issues

- **Server not restarted:** Vite caches env vars on startup
- **Wrong .env file:** Multiple .env files in project
- **Browser cache:** Old HTML cached in browser
- **Vite cache:** Old build artifacts

## Quick Test

To verify the env variable is being read:
1. Add this to `client/src/App.tsx` temporarily:
   ```tsx
   console.log('Title:', import.meta.env.VITE_APP_TITLE);
   ```
2. Check browser console - should show the new title
3. If it shows old title, env var isn't being read

---

**The server is restarting now - give it a moment and then refresh your browser!**

