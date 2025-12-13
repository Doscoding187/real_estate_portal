# 🎨 City Page Component Breakdown (Based on Design)

## Visual Structure Analysis

Based on the uploaded design image, here's the exact component breakdown for a **City Page**:

---

## 📐 SECTION-BY-SECTION BREAKDOWN

### 1. **Hero Banner** (Top Section)
```
Component: HeroBillboard
├── Background: Large hero image (city skyline/landmark)
├── Overlay gradient for text readability
├── Title: "City of [Name]" (large, bold, white text)
├── Breadcrumb: Home > Province > City
└── Revenue Slot: Paid advertisement graphic overlay
```

**Implementation:**
```tsx
<HeroBillboard
  imageUrl="/images/cities/johannesburg-hero.jpg"
  title="City of Johannesburg"
  breadcrumbs={['Home', 'Gauteng', 'Johannesburg']}
  adSlot={activeCampaign}
/>
```

---

### 2. **Search Bar + Filters**
```
Component: LocationSearchRefinement
├── Search input (property search)
├── Property type filter dropdown
├── Price range slider
├── Popular searches chips:
│   └── "Sandton" | "Rosebank" | "Marshalltown" | etc.
└── "Search" button
```

**Current Status:** ✅ Exists as `SearchRefinementBar`

---

### 3. **Hot-Selling Development Properties in 2024**
```
Component: HotSellingSlider
├── Section Title: "Hot-Selling Development Properties in 2024"
├── Subtitle: "Developments with high demand"
├── Horizontal scrollable cards (4-5 visible):
│   ├── Card:
│   │   ├── Image (development photo)
│   │   ├── Badge: "HOT" or "HIGH DEMAND"
│   │   ├── Title: Development name
│   │   ├── Location: City, Suburb
│   │   ├── Price: "From R2.5M"
│   │   ├── Stats: Beds, Baths, Size
│   │   └── Demand indicator: "🔥 85% sold"
│   └── Arrow navigation (< >)
└── "View All" link
```

**Status:** ❌ Need to create

---

### 4. **Featured Development Creators**
```
Component: FeaturedDevelopersSlider
├── Section Title: "Featured Development Creators"
├── Subtitle: "Top-rated developers in Johannesburg"
├── Horizontal cards:
│   ├── Developer Card:
│   │   ├── Logo (circular)
│   │   ├── Company name
│   │   ├── Rating: ⭐ 4.8 (142 reviews)
│   │   ├── Active projects: 12
│   │   ├── Badge: "VERIFIED" or "PREMIUM"
│   │   └── "View Profile" button
│   └── Arrow navigation
└── "See All Developers" link
```

**Status:** ❌ Need to create

---

### 5. **Related Cities**
```
Component: RelatedCitiesGrid
├── Section Title: "Related Cities"
├── Grid layout (3-4 columns):
│   ├── City Card:
│   │   ├── Background image
│   │   ├── City name overlay
│   │   ├── Property count: "1,234 properties"
│   │   └── Link to city page
└── Subtle hover effect
```

**Status:** ⚠️ Similar to existing `LocationGrid`, needs styling update

---

### 6. **High-Demand Projects to Invest In Now**
```
Component: HighDemandProjectsGrid
├── Section Title: "High-demand projects to invest in now"
├── Grid layout (3 columns):
│   ├── Project Card:
│   │   ├── Large image
│   │   ├── Badge: "NEW" or "LAUNCHING SOON"
│   │   ├── Title: Project name
│   │   ├── Location
│   │   ├── Price range: "R1.8M - R3.2M"
│   │   ├── Developer logo (small)
│   │   ├── ROI indicator: "Expected ROI: 12%"
│   │   └── Stats bar: Completion %, Units available
└── "Load More" button
```

**Status:** ❌ Need to create

---

### 7. **Pre-owned resale sellers**
```
Component: PreOwnedSellersGrid  
├── Section Title: "Pre-owned resale sellers"
├── Subtitle: "Individual home owners & investors"
├── Grid (3-4 columns):
│   ├── Seller Card:
│   │   ├── Profile photo
│   │   ├── Name
│   │   ├── Location: Johannesburg
│   │   ├── Active listings: 3
│   │   ├── Rating: ⭐ 4.5
│   │   ├── Response time: "< 1 hour"
│   │   └── "Contact Seller" button
└── Pagination
```

**Status:** ❌ Need to create (similar to agents)

---

### 8. **Newly-added properties**
```
Component: NewlyAddedPropertiesGrid
├── Section Title: "Newly-added properties"
├── Grid (4 columns):
│   ├── Property Card:
│   │   ├── Image carousel
│   │   ├── Badge: "NEW LISTING" + days ago
│   │   ├── Price: Large, bold
│   │   ├── Title/Address
│   │   ├── Stats: 🛏️ 3 | 🛁 2 | 📐 150m²
│   │   ├── Suburb name
│   │   └── Favorite heart icon
└── "View All Properties" link
```

**Status:** ✅ Similar to `FeaturedListings`, filter by recent

---

### 9. **Have a property to sell?** (CTA Section)
```
Component: CTASection
├── Background: Gradient or soft color
├── Illustration: Property/house graphic (left)
├── Text:
│   ├── Headline: "Have a property to sell?"
│   ├── Subtext: "List it with Property Listify - reach thousands"
├── Two CTA buttons:
│   ├── Primary: "List Your Property" (blue)
│   └── Secondary: "Learn More" (outline)
└── Trust badges: "Free listing" | "No commission" | "Verified buyers"
```

**Status:** ❌ Need to create

---

### 10. **High-demand suburbs**
```
Component: HighDemandSuburbsSlider
├── Section Title: "High-demand suburbs"
├── Horizontal cards:
│   ├── Suburb Card:
│   │   ├── Background image
│   │   ├── Suburb name (large)
│   │   ├── Demand badge: "🔥 HOT"
│   │   ├── Stats:
│   │   │   ├── Avg price: R2.5M
│   │   │   ├── Properties: 234
│   │   │   └── Growth: +15% YoY
│   │   └── "Explore Suburb" button
└── Arrow navigation
```

**Status:** ⚠️ Exists but needs demand scoring

---

### 11. **Footer**
```
Component: Footer (Global)
├── Logo + tagline
├── Links columns:
│   ├── About
│   ├── Properties
│   ├── Developers
│   ├── Resources
│   └── Contact
├── Newsletter signup
└── Social icons + copyright
```

**Status:** ✅ Global component exists

---

## 🎯 NEW COMPONENTS NEEDED (Priority Order)

### High Priority (Week 1-2)
1. **HeroBillboard** - Revenue slot, most visible
2. **HotSellingSlider** - Engagement driver
3. **HighDemandProjectsGrid** - Investment focus
4. **CTASection** - Conversion driver

### Medium Priority (Week 3-4)
5. **FeaturedDevelopersSlider** - Monetization
6. **PreOwnedSellersGrid** - Marketplace depth
7. **HighDemandSuburbsSlider** - Enhanced with scoring

### Lower Priority (Week 5+)
8. **CityScope Editorial Section** (not shown in image but in spec)
9. **Recommended Agents Slider** (B2B focus)
10. **Property Type Filter Cards** (for suburbs)

---

## 📊 COMPONENT REUSABILITY MAP

```
HeroBillboard
├── Used on: Province, City, Suburb pages
└── Props: imageUrl, title, adSlot, breadcrumbs

HotSellingSlider / HighDemandProjectsGrid
├── Province: All developments in province
├── City: City-filtered
└── Suburb: Suburb-filtered

FeaturedDevelopersSlider
├── Province: Top provincial developers
└── City: City-specific developers

CTASection
├── Used on: All location pages
└── Props: contextual copy based on page type

PopularSearches
├── Province: Top cities & suburbs
├── City: Top suburbs
└── Suburb: Property types
```

---

## 🎨 DESIGN TOKENS TO USE

Based on the uploaded image, the design uses:

### Colors
```css
--primary-blue: #2563eb   /* CTA buttons */
--text-dark: #1e293b      /* Headings */
--text-gray: #64748b      /* Body text */
--bg-light: #f8fafc       /* Section backgrounds */  
--card-bg: #ffffff        /* Cards */
--border: #e2e8f0         /* Borders */
--accent-hot: #dc2626     /* "HOT" badges */
--accent-verified: #10b981 /* "VERIFIED" badges */
```

### Typography
```css
--font-heading: 'Inter', sans-serif
--font-body: 'Inter', sans-serif

--text-3xl: 1.875rem (30px)   /* Section titles */
--text-xl: 1.25rem (20px)      /* Card titles */
--text-base: 1rem (16px)       /* Body */
--text-sm: 0.875rem (14px)     /* Metadata */
```

### Spacing
```css
--section-gap: 4rem (64px)     /* Between sections */
--card-gap: 1rem (16px)        /* Between cards */
--container-padding: 2rem (32px) /* Page sides */
```

### Cards
```css
border-radius: 12px
box-shadow: 0 1px 3px rgba(0,0,0,0.1)
hover: scale(1.02) + shadow increase
transition: all 0.2s ease
```

---

## 🚀 IMMEDIATE ACTION ITEMS

To match the design in the image:

1. **Create `HeroBillboard.tsx`** with ad slot support
2. **Create `HotSellingSlider.tsx`** with demand badges
3. **Update `DevelopmentsGrid`** to support "High-Demand Projects" variant
4. **Create `FeaturedDevelopersSlider.tsx`** with ratings
5. **Create `CTASection.tsx`** with illustration
6. **Add demand scoring** to backend for developments
7. **Create admin interface** for billboard ad management

---

*Component specs extracted from uploaded design image*
*Date: 2025-12-12*
