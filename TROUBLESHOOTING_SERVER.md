# Troubleshooting: Server Won't Start

## Common Issues and Solutions

### Issue 1: "Cannot find module 'bcryptjs'"

**Solution:**
```bash
pnpm add bcryptjs
```

✅ **Already fixed!** bcryptjs is now installed.

---

### Issue 2: Server Crashes on Startup

**Check for errors:**
1. Look at the terminal output when you run `pnpm dev`
2. Look for red error messages
3. Common causes:
   - Missing environment variables (`JWT_SECRET`, `DATABASE_URL`)
   - Database connection errors
   - Import/TypeScript errors

**Fix:**
- Set `JWT_SECRET` in `.env` file
- Check `DATABASE_URL` is correct
- Run `pnpm check` to check for TypeScript errors

---

### Issue 3: "Connection Refused" but Server Appears Running

**Check if server is actually listening:**
```powershell
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Check for Node processes
Get-Process -Name node -ErrorAction SilentlyContinue
```

**If port is busy:**
- Server should automatically try port 3001, 3002, etc.
- Check console output for actual port number
- Try: `http://localhost:3001` instead of `:3000`

---

### Issue 4: Database Connection Errors

**Check:**
- `DATABASE_URL` is set correctly in `.env`
- Database server is running
- Database exists
- Credentials are correct

**Test connection:**
```bash
# Try connecting to your database manually
mysql -u username -p -h localhost database_name
```

---

### Issue 5: TypeScript/Import Errors

**Check for errors:**
```bash
pnpm check
```

**Common fixes:**
- Missing dependencies: `pnpm install`
- Import errors: Check file paths
- Type errors: Check TypeScript configuration

---

### Issue 6: Environment Variables Missing

**Required variables:**
```env
JWT_SECRET=your-secret-key-here
DATABASE_URL=mysql://user:password@host:port/database
NODE_ENV=development
```

**Check if set:**
```powershell
# In PowerShell
$env:JWT_SECRET
$env:DATABASE_URL
```

---

## Step-by-Step Debugging

### Step 1: Check Dependencies
```bash
pnpm install
```

### Step 2: Check TypeScript
```bash
pnpm check
```

### Step 3: Check Environment Variables
Make sure `.env` file exists with:
- `JWT_SECRET`
- `DATABASE_URL`

### Step 4: Try Starting Server
```bash
$env:NODE_ENV="development"
pnpm dev
```

### Step 5: Check Console Output
Look for:
- ✅ `Server running on http://localhost:3000/` = Success!
- ❌ Red error messages = Check error details

---

## Quick Fixes

### Quick Fix 1: Reinstall Dependencies
```bash
Remove-Item -Recurse -Force node_modules
Remove-Item pnpm-lock.yaml
pnpm install
```

### Quick Fix 2: Clear Port
```powershell
# Kill all Node processes
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Wait a moment, then restart
pnpm dev
```

### Quick Fix 3: Use Different Port
```powershell
$env:PORT="3001"
pnpm dev
```

---

## Still Not Working?

1. **Share the error message** from the console
2. **Check if database is accessible**
3. **Verify environment variables are set**
4. **Look for TypeScript errors** (`pnpm check`)

---

## Expected Output When Server Starts

You should see:
```
Server running on http://localhost:3000/
```

If you see this, the server is running! Open your browser and go to:
- **http://localhost:3000**

