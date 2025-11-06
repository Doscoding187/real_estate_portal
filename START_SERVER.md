# How to Start the Development Server

## Quick Start

### Option 1: Use the PowerShell Script (Recommended)

Run this in PowerShell:

```powershell
.\start-dev.ps1
```

### Option 2: Manual Start

```powershell
# Stop any existing Node processes
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Set environment and start
$env:NODE_ENV="development"
pnpm dev
```

### Option 3: Direct Start

```powershell
pnpm dev
```

## What Should Happen

When the server starts successfully, you should see:

```
Server running on http://localhost:3000/
```

Then open your browser and go to:
- **http://localhost:3000**

## Troubleshooting

### Issue 1: "Connection Refused"

**If you see "ERR_CONNECTION_REFUSED":**

1. **Check if the server actually started:**
   ```powershell
   Get-Process -Name node -ErrorAction SilentlyContinue
   ```

2. **Check if port 3000 is listening:**
   ```powershell
   netstat -ano | findstr :3000
   ```

3. **Look for errors in the console** - The server might be crashing immediately

### Issue 2: Server Starts But Crashes Immediately

**Common causes:**

1. **Missing dependencies:**
   ```powershell
   pnpm install
   ```

2. **Missing files:**
   - Check `client/index.html` exists
   - Check `client/src/main.tsx` exists
   - Check `server/_core/index.ts` exists

3. **TypeScript errors:**
   ```powershell
   pnpm check
   ```

4. **Vite setup issues:**
   - Check if `node_modules/vite` exists
   - Try: `npx vite --version`

### Issue 3: Port Already in Use

If port 3000 is busy, the server should automatically try 3001, 3002, etc.

**Check the console output for the actual port number.**

Or manually set a different port:
```powershell
$env:PORT="3001"
pnpm dev
```

### Issue 4: Database Connection Errors

The server should still start even without DATABASE_URL, but you might see warnings.

**To fix database issues:**
1. Set `DATABASE_URL` in your environment
2. Run `pnpm db:push` to initialize the schema

### Issue 5: No Console Output

If you don't see any output:

1. **Run directly:**
   ```powershell
   $env:NODE_ENV="development"
   npx tsx server/_core/index.ts
   ```

2. **Check for syntax errors:**
   ```powershell
   pnpm check
   ```

## Still Not Working?

1. **Kill all Node processes:**
   ```powershell
   Stop-Process -Name node -Force -ErrorAction SilentlyContinue
   ```

2. **Reinstall dependencies:**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item pnpm-lock.yaml
   pnpm install
   ```

3. **Check Windows Firewall** - Make sure it's not blocking Node.js

4. **Try running as Administrator** - Sometimes ports require admin privileges

5. **Check antivirus** - Some antivirus software blocks Node.js

## What Port Does It Use?

- **Default:** Port 3000
- **If 3000 is busy:** Automatically tries 3001, 3002, etc.
- **Check console output** for the actual port

## Verify Server is Running

Once started, you should be able to:
1. Open http://localhost:3000 (or the port shown in console)
2. See your real estate portal homepage
3. Navigate between pages

If the page loads but shows errors, that's a different issue (frontend/API problems).

---

**Need more help?** Check the console output for specific error messages!
