# 🚀 Run TiDB Explore Migration NOW

## Quick Start (2 minutes)

Your TiDB database needs the missing columns in the `explore_shorts` table. Here's how to fix it:

### ✅ Method 1: Run TypeScript Script (RECOMMENDED)

```bash
# Run the migration script
npx tsx scripts/run-tidb-explore-migration.ts
```

That's it! The script will:
- ✅ Connect to your TiDB database
- ✅ Add missing columns (`content_type`, `topic_id`, `category_id`)
- ✅ Create all required tables
- ✅ Verify everything worked

---

### ✅ Method 2: Direct SQL (Alternative)

If you prefer to run SQL directly:

1. **Connect to TiDB** using your preferred MySQL client:
   ```bash
   mysql -h gateway01.ap-northeast-1.prod.aws.tidbcloud.com \
         -P 4000 \
         -u 292qWmvn2YGy2jW.root \
         -p \
         --ssl-mode=REQUIRED \
         listify_property_sa
   ```

2. **Copy and paste** the entire content of `RAILWAY_EXPLORE_SHORTS_FIX.sql`

3. **Execute** and verify the output

---

## 🔍 What This Fixes

### ❌ Before Migration
```
Error: Unknown column 'content_type' in 'field list'
GET /api/explore/feed → 500 Internal Server Error
Explore page crashes
```

### ✅ After Migration
```
GET /api/explore/feed → 200 OK
Explore page loads successfully
All features working
```

---

## 📊 Tables Created/Updated

1. **explore_shorts** - Main content table
   - ✅ Adds `content_type` column
   - ✅ Adds `topic_id` column  
   - ✅ Adds `category_id` column
   - ✅ Creates indexes for performance

2. **explore_interactions** - User engagement tracking

3. **explore_highlight_tags** - Property highlights

4. **explore_user_preferences** - Personalization data

---

## 🎯 Verification

After running the migration, verify it worked:

```bash
# Test the API endpoint
curl http://localhost:8081/api/explore/feed

# Should return 200 OK with data
```

Or visit your Explore page in the browser - it should load without errors!

---

## 🆘 Troubleshooting

### Connection Issues
If you get connection errors:
- ✅ Check your `.env` file has the correct `DATABASE_URL`
- ✅ Verify TiDB is accessible from your network
- ✅ Ensure SSL is enabled in the connection

### Column Already Exists
If you see "Duplicate column name" errors:
- ✅ This is OK! It means the columns already exist
- ✅ The migration uses `IF NOT EXISTS` to be safe

### Permission Denied
If you get permission errors:
- ✅ Verify your TiDB user has `ALTER TABLE` privileges
- ✅ Contact your TiDB admin if needed

---

## 📝 Your Database Info

- **Host**: `gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000`
- **Database**: `listify_property_sa`
- **SSL**: Required (TLS 1.2+)
- **Type**: TiDB (MySQL-compatible)

---

## 🎉 Success Checklist

After migration, you should have:
- ✅ `explore_shorts` table with all columns
- ✅ `explore_interactions` table created
- ✅ `explore_highlight_tags` table created
- ✅ `explore_user_preferences` table created
- ✅ All indexes created
- ✅ API endpoint returns 200
- ✅ Explore page loads

---

## 🚀 Ready to Run?

Execute this command now:

```bash
npx tsx scripts/run-tidb-explore-migration.ts
```

The migration is **safe to run multiple times** - it won't break existing data!
