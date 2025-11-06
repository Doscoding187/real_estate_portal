# Custom Authentication Setup

This document explains the new custom authentication system that replaces Manus OAuth.

## Overview

Your real estate platform now uses **email/password authentication** instead of Manus OAuth. This gives you:

✅ **Full Control** - You own the authentication system
✅ **No Dependencies** - No reliance on external OAuth services
✅ **Portable** - Works anywhere, easy to migrate/deploy
✅ **Customizable** - Easy to add features (email verification, 2FA, social login)

## Installation

### Step 1: Install Dependencies

```bash
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
```

### Step 2: Update Database Schema

The schema has been updated to support email/password authentication. Run migrations:

```bash
pnpm db:push
```

This will:
- Make `openId` optional (for backward compatibility)
- Add `passwordHash` field (for storing hashed passwords)
- Add `emailVerified` field (for email verification later)
- Make `email` unique (required for email/password auth)

### Step 3: Environment Variables

**Required:**
```env
JWT_SECRET=your-secret-key-here-minimum-32-characters
DATABASE_URL=mysql://user:password@host:port/database
```

**Optional:**
```env
BCRYPT_ROUNDS=10
```

**Removed (no longer needed):**
- `VITE_APP_ID` (was used for Manus OAuth)
- `OAUTH_SERVER_URL` (was used for Manus OAuth)
- `OWNER_OPEN_ID` (can remove if not needed)

### Step 4: Update Environment in `.env` File

Create or update your `.env` file in the project root:

```env
# Authentication
JWT_SECRET=your-super-secret-key-change-this-in-production

# Database
DATABASE_URL=mysql://user:password@localhost:3306/real_estate_db

# Node Environment
NODE_ENV=development
```

**Important:** Generate a strong JWT secret:
```bash
# Generate a random secret (use this in production)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Authentication Endpoints

### Register New User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

Sets a session cookie automatically.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

Sets a session cookie automatically.

### Logout

```http
POST /api/auth/logout
```

Clears the session cookie.

## How It Works

### Registration Flow

1. User submits email/password
2. Password is hashed with bcrypt
3. User record created in database
4. JWT session token created
5. Session cookie set in response
6. User is automatically logged in

### Login Flow

1. User submits email/password
2. Password verified against hash
3. JWT session token created
4. Session cookie set in response
5. User is logged in

### Session Verification

1. Request includes session cookie
2. JWT token extracted from cookie
3. Token verified and decoded
4. User ID extracted from token
5. User loaded from database
6. User attached to request context

## Frontend Integration

### Example: Login Component

```typescript
async function handleLogin(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Important: include cookies
    body: JSON.stringify({ email, password }),
  });
  
  if (response.ok) {
    const data = await response.json();
    // User is now logged in (cookie is set)
    // Refresh tRPC auth.me query to get user info
  }
}
```

### Example: Register Component

```typescript
async function handleRegister(email: string, password: string, name?: string) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Important: include cookies
    body: JSON.stringify({ email, password, name }),
  });
  
  if (response.ok) {
    // User is now registered and logged in
  }
}
```

## Security Features

✅ **Password Hashing** - Passwords stored as bcrypt hashes (never plain text)
✅ **JWT Tokens** - Secure session tokens with expiration
✅ **HTTP-Only Cookies** - Session cookies are HTTP-only (not accessible via JavaScript)
✅ **Secure Cookies** - Cookies use secure flags in production
✅ **Password Validation** - Minimum 8 characters required

## Migration from Manus OAuth

If you have existing users with Manus OAuth:

1. **Existing users can still use OAuth** (if you keep Manus routes) OR
2. **Users re-register** with email/password
3. **Manus `openId` is optional** - kept for backward compatibility

To migrate existing users:
- Users log in with Manus OAuth one last time
- Prompt them to set a password
- Link email to their account
- Future logins use email/password

## Next Steps

### Add Email Verification

1. Send verification email on registration
2. Add verification token to users table
3. Verify email before allowing login
4. Add `/api/auth/verify-email` endpoint

### Add Password Reset

1. Add `resetToken` and `resetTokenExpiry` to users table
2. Create `/api/auth/forgot-password` endpoint
3. Create `/api/auth/reset-password` endpoint
4. Send password reset emails

### Add Social Login (Optional)

Use Passport.js to add:
- Google OAuth
- GitHub OAuth
- Facebook OAuth

## Troubleshooting

### "Invalid or missing session cookie"

- Make sure cookies are enabled in browser
- Check that `JWT_SECRET` is set
- Verify cookie is being sent with requests (`credentials: 'include'`)

### "User already exists"

- Email must be unique
- User needs to login instead of register

### "Invalid email or password"

- Check email is correct
- Check password matches
- User must have `passwordHash` set (not OAuth-only user)

## Files Changed

### Backend
- ✅ `server/_core/auth.ts` - New custom auth service
- ✅ `server/_core/authRoutes.ts` - New auth routes (register/login/logout)
- ✅ `server/_core/context.ts` - Updated to use custom auth
- ✅ `server/_core/index.ts` - Updated to use new auth routes
- ✅ `server/db.ts` - Added user helper functions
- ✅ `drizzle/schema.ts` - Updated users table schema

### Frontend (Next Steps)
- `client/src/components/ManusDialog.tsx` - Replace with LoginForm
- `client/src/components/RegisterForm.tsx` - Create new component
- `client/src/const.ts` - Update login URL

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify environment variables are set
3. Check database schema is up to date (`pnpm db:push`)
4. Verify dependencies are installed (`pnpm install`)

---

**You now have full control over your authentication system!** 🎉

