# CMS Integration - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Access the Admin Panel

Navigate to: `/advertise-cms-admin`

You'll see:
- JSON editor with current content
- Validation panel
- Save/Refresh controls

### 2. Edit Content

The content is structured as JSON. Here's what you can edit:

```json
{
  "hero": {
    "headline": "Your headline here (50-70 chars)",
    "subheadline": "Your subheadline here (100-150 chars)",
    "primaryCTA": {
      "label": "Button text",
      "href": "/link",
      "variant": "primary"
    }
  },
  "partnerTypes": [...],
  "faqs": [...]
}
```

### 3. Validate Before Saving

Click **"Validate"** to check:
- ✅ Character limits
- ✅ Required fields
- ✅ JSON structure

### 4. Save Changes

Click **"Save Changes"** to persist your edits.

Content is stored in browser localStorage and cached for 5 minutes.

## 📝 Content Rules

| Content Type | Character Limit | Example |
|--------------|----------------|---------|
| Headlines | 50-70 chars | "Reach Thousands of Verified Home Seekers" |
| Subheadlines | 100-150 chars | "Advertise your properties, developments..." |
| Feature Descriptions | 80-120 chars | "Reach users actively searching for properties..." |
| FAQ Answers | 150-300 chars | "Pricing varies by partner type and plan tier..." |

## 🔧 Using CMS in Components

### Option 1: Full Page Content

```tsx
import { useAdvertiseCMS } from '@/hooks/useAdvertiseCMS';

function MyPage() {
  const { content, isLoading, error } = useAdvertiseCMS();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{content.hero.headline}</h1>
      <p>{content.hero.subheadline}</p>
    </div>
  );
}
```

### Option 2: Section-Specific Content

```tsx
import { useAdvertiseCMSSection } from '@/hooks/useAdvertiseCMS';

function HeroSection() {
  const { content, isLoading } = useAdvertiseCMSSection('hero');

  if (isLoading || !content) return null;

  return <h1>{content.headline}</h1>;
}
```

### Option 3: Update Content Programmatically

```tsx
import { useAdvertiseCMS } from '@/hooks/useAdvertiseCMS';

function AdminPanel() {
  const { updateContent } = useAdvertiseCMS();

  const handleUpdate = async () => {
    await updateContent({
      hero: {
        headline: 'New Headline',
        // ... other fields
      },
    });
  };

  return <button onClick={handleUpdate}>Update</button>;
}
```

## 🎨 Icon System

Icons are specified by name in CMS:

```json
{
  "partnerTypes": [
    {
      "iconName": "Home",
      "title": "Real Estate Agent"
    }
  ]
}
```

Available icons:
- `Home`, `Building2`, `Landmark`, `FileText`, `Wrench`
- `Target`, `Sparkles`, `ShieldCheck`, `LayoutDashboard`
- `UserPlus`, `Upload`, `TrendingUp`
- `Megaphone`, `Video`, `Rocket`, `Users`, `Image`
- `CheckCircle`, `Star`

## 🔍 Validation Examples

### ✅ Valid Headline
```json
{
  "headline": "Reach Thousands of Verified Home Seekers Across SA"
}
```
Length: 55 characters (within 50-70 range)

### ❌ Invalid Headline (Too Short)
```json
{
  "headline": "Reach Home Seekers"
}
```
Length: 18 characters (below 50 minimum)

### ⚠️ Warning (Close to Limit)
```json
{
  "headline": "Reach Thousands of Verified Home Seekers Across South Africa Now"
}
```
Length: 68 characters (close to 70 maximum)

## 🐛 Troubleshooting

### Content Not Updating?

1. Check browser console for errors
2. Verify JSON is valid (use Validate button)
3. Clear cache: `localStorage.removeItem('advertise-page-content')`
4. Refresh the page

### Validation Errors?

Common issues:
- **"Too short"**: Add more descriptive text
- **"Too long"**: Be more concise
- **"Cannot be empty"**: Fill in required fields
- **"JSON Parse Error"**: Check for missing commas, quotes, brackets

### Icons Not Showing?

- Verify icon name matches available icons
- Check spelling (case-sensitive)
- Fallback icon (Home) will show if name is invalid

## 📚 Full Documentation

For complete documentation, see:
- `client/src/services/cms/README.md` - Full API documentation
- `.kiro/specs/advertise-with-us-landing/CMS_INTEGRATION_COMPLETE.md` - Implementation details
- `client/src/components/advertise/HeroSection.cms.example.tsx` - Migration example

## 🎯 Common Tasks

### Update Hero Headline

1. Go to `/advertise-cms-admin`
2. Find `"hero"` → `"headline"`
3. Edit text (keep 50-70 chars)
4. Click Validate
5. Click Save Changes

### Add New FAQ

1. Go to `/advertise-cms-admin`
2. Find `"faqs"` array
3. Add new object:
```json
{
  "id": "faq-9",
  "question": "Your question?",
  "answer": "Your answer (150-300 chars)",
  "order": 9
}
```
4. Validate and Save

### Update Partner Type

1. Go to `/advertise-cms-admin`
2. Find `"partnerTypes"` array
3. Edit desired partner:
```json
{
  "id": "agent",
  "iconName": "Home",
  "title": "Real Estate Agent",
  "benefit": "Your benefit text (80-120 chars)",
  "href": "/advertise/agents",
  "order": 1
}
```
4. Validate and Save

### Change CTA Button Text

1. Go to `/advertise-cms-admin`
2. Find `"hero"` → `"primaryCTA"` → `"label"`
3. Edit button text
4. Validate and Save

## 💡 Pro Tips

1. **Always validate before saving** - Catches errors early
2. **Keep backups** - Copy JSON before major changes
3. **Test on staging first** - If available
4. **Use warnings as guides** - They help optimize content
5. **Check character counts** - Use online tools if needed

## 🔐 Security Note

Current implementation uses localStorage (client-side). For production:
- Consider server-side CMS (Contentful, Strapi)
- Add authentication for admin panel
- Implement role-based access control
- Add audit logging

## 📞 Support

Questions? Check:
1. This quick start guide
2. Full README in `client/src/services/cms/README.md`
3. Example component in `HeroSection.cms.example.tsx`
4. Type definitions in `client/src/services/cms/types.ts`
