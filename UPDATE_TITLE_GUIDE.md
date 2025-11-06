# How to Update the Browser Title

## Current Status
✅ `.env` file updated with new title:
```
VITE_APP_TITLE=South Africa's Fastest Growing Real Estate Platform
```

## Steps to Apply the Change

### 1. **Stop the Server** (if running)
Press `Ctrl+C` in the terminal where `pnpm dev` is running

### 2. **Clear Vite Cache**
```powershell
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
```

### 3. **Restart the Server**
```powershell
pnpm dev
```

### 4. **Hard Refresh Browser**
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

OR

- Open DevTools (F12)
- Right-click the refresh button
- Select "Empty Cache and Hard Reload"

### 5. **Verify in Browser**
- Check the browser tab title
- Or open DevTools > Elements tab > Search for `<title>`

## If Still Not Working

### Option A: Update HTML Directly (Temporary Fix)
Edit `client/index.html` line 14:
```html
<title>South Africa's Fastest Growing Real Estate Platform</title>
```
This works immediately but won't use the env variable.

### Option B: Verify Server is Reading .env
1. Add this temporarily to `client/src/App.tsx`:
```tsx
console.log('Title from env:', import.meta.env.VITE_APP_TITLE);
```
2. Check browser console - should show the new title
3. If it shows old title, env var isn't being read

### Option C: Check for Multiple .env Files
```powershell
Get-ChildItem -Recurse -Filter ".env*" | Select-Object FullName
```
Make sure the `.env` file in the root directory has the correct title.

---

**The server should be restarting now. Wait 10-20 seconds, then hard refresh your browser!**

