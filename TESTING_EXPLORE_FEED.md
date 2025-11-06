# Phase 7: Explore Feed - Testing Guide

## 🧪 Testing the TikTok-Style Explore Feed

This guide will walk you through testing all features of the Explore Feed system.

---

## ⚙️ Setup Instructions

### Step 1: Run Database Migrations

Open **MySQL Workbench** and run the following scripts in order:

1. **Create Tables**:
   ```sql
   -- File: migrations/create-explore-feed-tables.sql
   -- This creates: videos, videoLikes, provinces, cities, suburbs, notifications, etc.
   ```

2. **Seed Data**:
   ```sql
   -- File: migrations/seed-explore-feed-data.sql
   -- This populates provinces, cities, suburbs, and sample videos
   ```

### Step 2: Verify Database Setup

Run this query to verify tables were created:

```sql
USE real_estate_portal;

SELECT 'Videos' AS TableName, COUNT(*) AS RecordCount FROM videos
UNION ALL
SELECT 'Provinces', COUNT(*) FROM provinces
UNION ALL
SELECT 'Cities', COUNT(*) FROM cities
UNION ALL
SELECT 'Suburbs', COUNT(*) FROM suburbs;
```

You should see:
- Videos: 5-6 sample videos
- Provinces: 9 South African provinces
- Cities: 6-7 major cities
- Suburbs: 6+ suburbs

### Step 3: Start the Development Server

```powershell
# Navigate to project directory
cd C:\Users\Edward\Dropbox\PC\Desktop\real_estate_portal

# Start the dev server
pnpm dev
```

The server should start on `http://localhost:3000`

---

## 📱 Testing User Features

### 1. View Explore Feed

**Navigate to**: `http://localhost:3000/explore`

**Expected Behavior**:
- ✅ Fullscreen video feed loads
- ✅ First video auto-plays
- ✅ Filter tabs visible (All, Listings, Content)
- ✅ Video controls visible (like, share, contact)

**Test Actions**:
1. **Scroll down** - Next video should auto-play, previous pauses
2. **Click filter tabs** - Feed filters by video type
3. **Observe video info** - Caption, agent name, property details (for listing videos)

### 2. Test Video Interactions

**Like a Video**:
1. Click the ❤️ heart icon on any video
2. **Expected**: Heart fills with color, like count increases
3. Click again to unlike
4. **Expected**: Heart outline returns, like count decreases

**Share a Video**:
1. Click the 🔗 share icon
2. **Expected**: Share link copied to clipboard
3. **Expected**: Toast notification "Link copied!"

### 3. Test Contact Agent Feature

**For Listing Videos**:
1. Click the "Contact Agent" button on a listing video
2. **Expected**: Modal opens with:
   - Agent information
   - Property details
   - Pre-filled message: "Hi [Agent], I saw your video about [Property] and would like to know more."
3. Fill in your details:
   - Name: "Test User"
   - Email: "test@example.com"
   - Phone: "0123456789" (optional)
   - Message: (pre-filled or customize)
4. Click "Send Message"
5. **Expected**: 
   - Success toast "Message sent successfully!"
   - Modal closes
   - Lead created in database

**For Content Videos**:
1. Click "Contact Agent" on a content video
2. **Expected**: Modal with generic message: "Hi [Agent], I saw your video on the Explore feed and would like to connect."
3. Send message
4. **Expected**: Same success behavior

### 4. Test Video Filtering

**All Videos Tab** (default):
- Shows both listing and content videos
- Video count displayed in tab

**Listings Tab**:
- Shows only videos with propertyId
- Property details visible (price, location, title)
- Contact button says "Inquire About Property"

**Content Tab**:
- Shows only videos without propertyId
- Agent info prominent
- Contact button says "Contact Agent"

---

## 🎥 Testing Agent Features

### Prerequisites
You need to be logged in as an agent. Use test credentials:
```
Email: agent@test.com
Password: agent123
```

If this account doesn't exist, create it and run:
```bash
tsx set-admin.ts agent@test.com
```

### 1. Access Video Upload

**Navigate to**: Agent Dashboard → Upload Video button

Or directly: `http://localhost:3000/explore` (upload button visible for agents)

### 2. Upload a Listing Video

**Step 1: Select Type**
1. Click "Upload Video" button
2. Select "Listing Video"
3. Click "Next"

**Step 2: Add Details**
1. **Caption**: "Beautiful 3-bed home in Sandton! Check out this amazing property 🏡"
2. **Select Property**: Choose from dropdown (your listed properties)
3. Click "Next"

**Step 3: Upload**
1. Click "Choose File"
2. Select a video file (MP4, MOV, or AVI, max 100MB)
3. **Expected**: 
   - File name displays
   - Duration extracted and shown
   - Upload button enabled
4. Click "Upload Video"
5. **Expected**:
   - Progress indicator
   - Success message
   - Modal closes
   - New video appears in feed

### 3. Upload a Content Video

**Follow same steps** but:
- Select "Content Video" in step 1
- No property selection required
- Caption examples:
  - "Market update for South African real estate 📊"
  - "5 tips for first-time buyers 💡"
  - "Property investment guide 🏢"

### 4. Verify Upload

1. Navigate to Explore Feed
2. Scroll to find your video
3. **Verify**:
   - Video plays correctly
   - Caption displays
   - Agent name shows (your name)
   - Property details show (for listing videos)
   - Like/share/contact buttons work

---

## 🔍 Testing Edge Cases

### 1. Authentication Tests

**Logged Out User**:
- ✅ Can view Explore Feed
- ✅ Can like videos (stores in session)
- ✅ Can contact agents
- ❌ Cannot upload videos (button hidden)

**Logged In User (non-agent)**:
- ✅ All viewing features work
- ✅ Likes persist to database
- ❌ Cannot upload videos

**Logged In Agent**:
- ✅ Full access to all features
- ✅ Can upload videos
- ✅ Can view own videos

### 2. Video Validation Tests

**File Size**:
1. Try uploading file > 100MB
2. **Expected**: Error "File size must be less than 100MB"

**File Type**:
1. Try uploading non-video file (e.g., .pdf)
2. **Expected**: Error "Invalid file type. Please upload MP4, MOV, or AVI"

**Duration** (if implemented):
1. Try uploading video > 60 seconds
2. **Expected**: Warning or error about duration

### 3. Network Error Tests

**Slow Connection**:
1. Open DevTools → Network → Throttle to "Slow 3G"
2. Try uploading video
3. **Expected**: Upload takes longer but completes or shows progress

**Upload Failure**:
1. Start upload, then disable network
2. **Expected**: Error message "Upload failed. Please try again."

---

## 📊 Database Verification

### Check Video Records

```sql
-- View all videos
SELECT 
  v.id,
  v.type,
  v.caption,
  v.views,
  v.likes,
  v.duration,
  a.name AS agentName,
  p.title AS propertyTitle
FROM videos v
JOIN agents a ON v.agentId = a.id
LEFT JOIN properties p ON v.propertyId = p.id
ORDER BY v.createdAt DESC;
```

### Check Video Likes

```sql
-- View all likes
SELECT 
  vl.id,
  v.caption AS videoCaption,
  u.name AS userName,
  vl.createdAt
FROM videoLikes vl
JOIN videos v ON vl.videoId = v.id
JOIN users u ON vl.userId = u.id
ORDER BY vl.createdAt DESC;
```

### Check Lead Generation

```sql
-- View leads from video inquiries
SELECT 
  l.id,
  l.name,
  l.email,
  l.phone,
  l.message,
  l.source,
  a.name AS agentName,
  l.createdAt
FROM leads l
JOIN agents a ON l.agentId = a.id
WHERE l.source LIKE '%video%' OR l.source = 'explore_feed'
ORDER BY l.createdAt DESC;
```

---

## 🐛 Common Issues & Solutions

### Issue: Videos not loading

**Solution**:
1. Check database has video records: `SELECT COUNT(*) FROM videos;`
2. Check network tab for API errors
3. Verify tRPC endpoint: `video.getVideos` returns data

### Issue: Upload button not visible

**Solution**:
1. Verify you're logged in as agent
2. Check user role: `SELECT role FROM users WHERE email = 'your@email.com';`
3. Check agent record exists: `SELECT * FROM agents WHERE userId = [userId];`

### Issue: Video won't play

**Solution**:
1. Check videoUrl is valid
2. Test URL directly in browser
3. Check file format (MP4 recommended)
4. Check CORS settings for video hosting

### Issue: Contact form not submitting

**Solution**:
1. Open DevTools console for errors
2. Check form validation (all required fields)
3. Verify tRPC mutation: `video.contactAgent`
4. Check database for lead creation

### Issue: Likes not persisting

**Solution**:
1. Verify user is logged in
2. Check `videoLikes` table for records
3. Check for unique constraint errors (can't like twice)
4. Verify userId matches logged-in user

---

## ✅ Feature Checklist

Use this checklist to verify all features work:

### Viewing Features
- [ ] Explore feed loads and displays videos
- [ ] First video auto-plays on load
- [ ] Scrolling to next video auto-plays it
- [ ] Previous video pauses when scrolling away
- [ ] Filter tabs work (All, Listings, Content)
- [ ] Video progress indicator shows
- [ ] View count increments on video view

### Interaction Features
- [ ] Like button toggles correctly
- [ ] Like count updates in real-time
- [ ] Share button copies link to clipboard
- [ ] Share toast notification appears
- [ ] Contact modal opens with correct data
- [ ] Contact form validates inputs
- [ ] Contact form submits successfully
- [ ] Lead is created in database

### Upload Features (Agent Only)
- [ ] Upload modal opens
- [ ] Type selection works (listing vs content)
- [ ] Property selection appears for listing videos
- [ ] File picker opens
- [ ] File validation works (size, type)
- [ ] Duration extraction works
- [ ] Upload progresses and completes
- [ ] New video appears in feed immediately

### Mobile Features
- [ ] Feed works on mobile viewport (< 768px)
- [ ] Touch scrolling works smoothly
- [ ] Buttons are touch-friendly
- [ ] Modal is mobile-responsive
- [ ] Upload works on mobile

### Performance
- [ ] Feed loads within 2 seconds
- [ ] Videos don't lag when scrolling
- [ ] No memory leaks during extended use
- [ ] Multiple videos can be uploaded without issues

---

## 🎯 Success Criteria

Your Explore Feed is working correctly if:

1. ✅ Users can view and scroll through videos
2. ✅ Videos auto-play/pause correctly
3. ✅ Likes work and persist
4. ✅ Contact forms create leads
5. ✅ Agents can upload both video types
6. ✅ Filtering works correctly
7. ✅ Mobile experience is smooth
8. ✅ No console errors
9. ✅ Database records are created properly
10. ✅ Navigation integration works

---

## 📞 Need Help?

If you encounter issues:

1. Check the console for errors
2. Verify database migrations ran successfully
3. Check that tRPC routes are registered in `server/routers.ts`
4. Ensure video components exist in `client/src/pages/ExploreFeed.tsx`
5. Review the Phase 7 guide: `PHASE7_EXPLORE_FEED_GUIDE.md`

---

## 🚀 Next Steps

After testing:

1. **Add Real Videos**: Replace sample URLs with actual S3 URLs
2. **Configure S3**: Set up AWS S3 bucket for video storage
3. **Optimize Performance**: Add video thumbnails, lazy loading
4. **Add Analytics**: Track user behavior and engagement
5. **Implement Comments**: Phase 8 social features

Happy Testing! 🎉
