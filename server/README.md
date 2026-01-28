# Server Environment Configuration

This server requires specific environment variables to function correctly.

## 🔑 Environment Variables & Secrets

### Local Development

- **Secrets MUST be placed in `.env.local`**. This file is git-ignored.
- The application will **throw a hard error** at startup if `DATABASE_URL` is missing.
- **Do NOT put secrets in `.env`**. Use `.env` only for public defaults or documentation references.

### Production

- **Secrets be placed in `.env.production`** (or your platform's secret manager).

### Example `.env.local`

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DBNAME?sslaccept=strict"
```

## 🛡️ Runtime Safety

Strict runtime checks are enforced in `server/db-connection.ts`. The server will fail fast if the configuration is invalid, preventing silent failures or phantom connections.
