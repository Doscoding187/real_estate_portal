# 🚀 Run Railway Migration NOW - Quick Guide

## The Problem
Your Explore page is showing a 500 error because the `explore_shorts` table is missing columns: `content_type`, `topic_id`, and `category_id`.

## The Solution (Choose ONE method)

### ⚡ Method 1: Direct SQL on Railway (FASTEST - 2 minutes)

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/
   - Open your project
   - Click on your **MySQL database**

2. **Open Query Tab**
   - Click on the "Query" tab in the database view

3. **Copy and Paste SQL**
   - Open the file: `RAILWAY_EXPLORE_SHORTS_FIX.sql`
   - Copy ALL the SQL content
   - Paste it into the Railway Query editor

4. **Execute**
   - Click "Run" or press Ctrl+Enter
   - Wait for completion (should take 5-10 seconds)

5. **Verify**
   - You should see "Tables created successfully!" message
   - Check the counts for each table

6. **Test**
   - Refresh your Explore page: https://real-estate-portal-xi.vercel.app/explore
   - The 500 error should be gone!

---

### 🔧 Method 2: Run Migration Script Locally

1. **Set Database URL**
   ```bash
   # Get your Railway MySQL connection string from Railway dashboard
   # It looks like: mysql://user:password@host:port/database
   
   # On Windows PowerShell:
   $env:DATABASE_URL="your-railway-connection-string"
   
   # On Windows CMD:
   set DATABASE_URL=your-railway-connection-string
   ```

2. **Run Migration**
   ```bash
   tsx scripts/run-explore-shorts-migration.ts
   ```

3. **Add Missing Columns**
   If the script completes but you still get errors, run this SQL on Railway:
   ```sql
   ALTER TABLE explore_shorts 
   ADD COLUMN content_type VARCHAR(50) DEFAULT 'property' AFTER developer_id,
   ADD COLUMN topic_id INT NULL AFTER content_type,
   ADD COLUMN category_id INT NULL AFTER topic_id;
   
   CREATE INDEX idx_explore_shorts_content_type ON explore_shorts(content_type);
   CREATE INDEX idx_explore_shorts_topic_id ON explore_shorts(topic_id);
   CREATE INDEX idx_explore_shorts_category_id ON explore_shorts(category_id);
   ```

---

## ✅ Verification Steps

After running the migration:

### 1. Check Tables Exist
```sql
SHOW TABLES LIKE 'explore%';
```
Should show:
- explore_shorts
- explore_interactions
- explore_highlight_tags
- explore_user_preferences

### 2. Check Table Structure
```sql
DESCRIBE explore_shorts;
```
Should include these columns:
- content_type
- topic_id
- category_id
- (plus all the other columns)

### 3. Test the API
Visit: https://realestateportal-production-9bb8.up.railway.app/api/trpc/explore.getFeed?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22feedType%22%3A%22recommended%22%2C%22limit%22%3A20%2C%22offset%22%3A0%7D%7D%7D

Should return: `200 OK` with JSON data (even if empty)
Should NOT return: `500 Internal Server Error`

### 4. Test the Explore Page
Visit: https://real-estate-portal-xi.vercel.app/explore

Should show: The Explore page without errors
Should NOT show: 500 error or "Failed query" errors

---

## 🎯 Recommended: Method 1 (Direct SQL)

**Why?** It's the fastest and most reliable way to fix the issue right now.

**Steps:**
1. Railway Dashboard → MySQL Database → Query tab
2. Copy `RAILWAY_EXPLORE_SHORTS_FIX.sql` content
3. Paste and Run
4. Done! ✅

---

## 📝 What This Migration Does

1. **Creates `explore_shorts` table** with ALL required columns including:
   - `content_type` (property, video, etc.)
   - `topic_id` (for categorization)
   - `category_id` (for filtering)

2. **Creates supporting tables**:
   - `explore_interactions` (user engagement tracking)
   - `explore_highlight_tags` (highlight definitions)
   - `explore_user_preferences` (user preferences)

3. **Adds indexes** for performance

4. **Handles existing tables** - Uses `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` so it won't break if tables already exist

---

## 🆘 Troubleshooting

### Error: "Column already exists"
✅ This is fine! It means the column was already there. The migration will continue.

### Error: "Table already exists"
✅ This is fine! The migration uses `IF NOT EXISTS` to handle this.

### Error: "Foreign key constraint fails"
⚠️ This means referenced tables (listings, developments, agents, developers, users) don't exist.
**Solution**: Remove the foreign key constraints from the SQL or create those tables first.

### Still getting 500 errors after migration?
1. Check Railway logs for the actual error
2. Verify all columns exist: `DESCRIBE explore_shorts;`
3. Check if there's data: `SELECT * FROM explore_shorts LIMIT 1;`

---

## 🎉 Success Indicators

After successful migration:
- ✅ No more 500 errors on Explore page
- ✅ API returns 200 (even if empty results)
- ✅ Console shows no "Failed query" errors
- ✅ Tables exist in Railway database

---

## Need Help?

If you encounter issues:
1. Check Railway database logs
2. Verify the SQL ran successfully
3. Check for any error messages in the Query tab
4. Make sure you're connected to the correct database

**Ready? Go with Method 1 - it's the quickest! 🚀**
