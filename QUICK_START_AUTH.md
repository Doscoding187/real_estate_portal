# Quick Start: Custom Authentication Setup

## 🚀 3-Minute Setup

### 1. Install Dependencies
```bash
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
```

### 2. Update Database
```bash
pnpm db:push
```

### 3. Set Environment Variable
Add to your `.env` file:
```env
JWT_SECRET=generate-a-random-32-character-secret-here
```

Generate a secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Test It
```bash
# Start server
pnpm dev

# Test registration (in another terminal)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test"}'
```

## ✅ Done!

Your authentication system is now:
- ✅ Email/password based
- ✅ Fully independent from Manus OAuth
- ✅ Secure with bcrypt hashing
- ✅ JWT session tokens
- ✅ Ready for production

## 📚 Full Documentation

See:
- **AUTHENTICATION_SETUP.md** - Complete setup guide
- **MIGRATION_GUIDE.md** - Migration details
- **IMPLEMENTATION_SUMMARY.md** - What was changed

## 🔗 API Endpoints

### Register
```http
POST /api/auth/register
Body: { "email": "...", "password": "...", "name": "..." }
```

### Login
```http
POST /api/auth/login
Body: { "email": "...", "password": "..." }
```

### Logout
```http
POST /api/auth/logout
```

---

**That's it!** You now have full control over authentication. 🎉

