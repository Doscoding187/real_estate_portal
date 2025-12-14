# City Page Specification - Locked Direction

## ✅ Confirmed Direction (Locked)
**Page stacking order (top → bottom)**
1. **Global Navigation** (Existing)
2. **Monetized Location Banner** (NEW, taller)
3. **Search Stage** (Slightly lowered, overlapping)
4. **Recent Searches / Recent Locations** (Optional)
5. **Continue Browsing** (Low priority)
6. **Location Content Sections** (Later)

---

## 1️⃣ Global Navigation
**Status:** Unchanged
- Uses the same nav as the homepage.
- Sits **ABOVE** the banner.
- No transparency tricks; maintains brand consistency and trust.

## 2️⃣ Monetized Banner Image (KEY REVENUE ZONE)
**Purpose:**
- Primary advertising real estate.
- Location-specific campaigns.
- Developer / bank / mortgage ads.
- Seasonal promotions.

**Behavior:**
- Full-width.
- Taller and visually dominant (Taller than 99acres).
- Zero clutter inside.
- **Recommended Height:**
    - Desktop: 420–480px
    - Tablet: ~360px
    - Mobile: ~260–300px

**Rules:**
- Image OR video (future).
- One clickable destination.
- Impression + click tracking ready.
- CMS / ad-server driven.
- **NO search inputs inside the banner.**

```text
┌────────────────────────────────────┐
│  MONETIZED LOCATION BANNER         │
│  (Developer / Campaign Image)      │
└────────────────────────────────────┘
```

## 3️⃣ Search Stage (Lowered + Overlapping)
**Placement:**
- Comes after the banner in DOM.
- Visually overlaps upward into the banner.
- Creates depth and hierarchy.

**Design Concept:**
```text
┌──────────── Banner ────────────────┐
│                                    │
│        (image pops)                │
│                                    │
└───────────────▲────────────────────┘
                │ overlap
        ┌───────┴────────────────┐
        │   SEARCH STAGE CARD     │
        │                         │
        └─────────────────────────┘
```

**Content (Approved):**
- Buy / Rent / Commercial / Land tabs
- Property type
- Location (pre-filled & locked)
- CTA
- Listings count text

## 4️⃣ Recent Searches / Recent Locations (Nice-to-have)
**Rules:**
- Show only if data exists.
- User-specific (localStorage / account-based).
- Horizontally scrollable pills.
- **Example:** "Buy in Sandton · Rent in Rosebank · Buy in Fourways"
- *Build it after core functionality.*

## 5️⃣ Featured Top Projects (Dynamic Carousel)
**Internal Name:** `FeaturedPropertiesCarousel`
**Public Title:** "Top Selling Projects in {Location}" (e.g., Sandton)

**Placement:**
- Below Market Overview / Prices.
- Above Developers section.

**Purpose:**
- Demand signaling ("Hot selling").
- Curated discovery (Not just raw feed).
- Monetization (Tier 1 Paid Slots).

**Behavior:**
- **Context-Aware:** Reuses homepage component, scoped to current location.
- **Tabs:** Dynamic sub-locations (e.g., Morningside, Bryanston) derived from data.
    - *Fallback:* "All | City of Johannesburg" if no sub-locations.
- **Slots:** Fixed **10 slots** per tab.
- **Rotation:** 4-week time-based cycle.

**Monetization Logic (Priority Order):**
1.  🥇 **Tier 1 (Paid):** Location-specific featuring (Guaranteed).
2.  🥈 **Tier 2 (Subscribed):** Active subscriptions (Fallback).
3.  🥉 **Tier 3 (Merit):** Most liked / High performance (Filler).

**Guardrails:**
- Max 2-3 developments per developer per tab.
- No "ad" styling distinction (Visual consistency).

**Reference Spec (React):**
```tsx
<section className="bg-white py-12">
  <div className="mx-auto max-w-7xl px-6">
    <div className="mb-8">
      <h2 className="text-2xl font-semibold">Top Selling Projects in Sandton</h2>
      <p className="mt-2 max-w-3xl text-gray-600">Discover high-demand residential developments...</p>
    </div>
    {/* Dynamic Tabs */}
    <div className="mb-6 flex gap-3 overflow-x-auto">
       {/* ["All", "Morningside", "Bryanston"...] */}
    </div>
    {/* Carousel */}
    <div className="flex gap-6 overflow-x-auto pb-4">
       {/* Featured Cards (Paid > Subscribed > Merit) */}
    </div>
  </div>
</section>
```

---

## 6️⃣ Property Type Explorer (Navigation)
**Internal Name:** `LocationPropertyTypeExplorer`
**Public Title:** "Browse property types in {Location}" (e.g., Sandton)

**Placement:**
- Below Featured Properties (Section 5).
- Above High-Demand Developments (Section 7).

**Purpose:**
- Buyer navigation accelerator ("What can I find here?").
- Discovery & Intent Segmentation.
- Trust signal (Inventory counts).

**Behavior:**
- **Visual:** Grid/Scrollable Cards.
- **Content:** Property Type Name, Inventory Count ("9,400+ Properties").
- **Interaction:** Explicit clickable affordance (Arrow/Chevron).
- **No Monetization:** Pure UX/Navigation block.

**Card Variants (Context-Aware):**
- **Count:** "9,400+ Properties" (shows liquidity).
- **Status:** Grey out low inventory types.

**Engineering Contract:**
```javascript
LocationPropertyTypeExplorer({
  locationScope,
  types: ["Apartments", "Houses", "Villas", "Commercial"],
  counts: { apartments: 9400, houses: 230 }
})
```

---

## 7️⃣ Top Localities (Market Intelligence)
**Internal Name:** `LocationTopLocalities`
**Public Title:** "Top Localities in {Location}"
**Subtitle:** "Discover {Location}'s most in-demand localities based on buyer activity, price trends, and livability."

**Placement:**
- Below Property Type Explorer (Section 6).
- Above High-Demand Developments (Section 8).

**Purpose:**
- Data Authority ("Where are people looking?").
- Buyer Decision Support (Shortlisting).
- Future Monetization (Sponsored Localities).

**Behavior:**
- **Format:** Horizontal Slider (Carousel).
- **Slots:** Max **10 Cards**.
- **Interaction:** Entire card Clickable -> Navigate to Locality Page.
- **CTA:** "Explore all {Location} localities →".

**Card Content (Single Locality):**
1.  **Visual:** Representative Image (Context).
2.  **Identity:** Locality Name (e.g., "Morningside").
3.  **Data:** Avg Price (e.g., "R 12,500/sqm"), Inventory Count.
4.  **Social Proof:** Rating (optional), "Trending" badge.
5.  **Fallback:** Handle missing data gracefully (e.g., "Price on request").

**Engineering Contract:**
```javascript
LocationTopLocalities({
  locationScope,
  limit: 10,
  sortBy: ["demand", "search_volume"],
  dataPoints: ["price", "inventory", "rating"]
})
```

---

## 8️⃣ High-Demand Developments (Dynamic Carousel)
**Internal Name:** `LocationFeaturedDevelopmentsCarousel`
**Public Title:** "High-Demand Developments in {Location}"
**Subtitle:** "Projects buyers are actively viewing in this area"

**Placement:**
- Below Top Localities.
- Above Recommended Agents.

**Purpose:**
- Monetization (Paid featured).
- SEO Reinforcement (Location + Development relevance).
- Engagement (Trending/Most viewed).

**Behavior:**
- **Slots:** Fixed **10 slots**.
- **Content:** Projects/Developments (Not individual units).
- **Ordering:**
    1. Paid Featured (Location-specific)
    2. Subscribed (Fallback)
    3. Engagement-based (Views/Saves)
- **Difference from Section 5:** Focus on *trending/viewed* vs *top selling/sales*.

**Card Content (Single Project):**
1.  **Visual:** Development Hero Image.
2.  **Info:** Development Name, Developer Name (clickable).
3.  **Details:** Unit types (e.g., "1, 2, 3 Bed"), Sub-location.
4.  **Price:** Starting price / Range.
5.  **Traffic:** No "Buy Now" CTA (Click card to view).

**Engineering Contract:**
```javascript
LocationFeaturedDevelopmentsCarousel({
  locationScope,        // e.g., 'sandton'
  limit: 10,
  priority: ["paid", "subscribed", "engagement"],
  title: `High-Demand Developments in ${locationName}`,
  subtitle: "Projects buyers are actively viewing in this area"
})
```

---

## 9️⃣ Recommended Agents (Dynamic Carousel)
**Internal Name:** `LocationRecommendedAgentsCarousel`
**Public Title:** "Recommended Agents in {Location}"
**Subtitle:** "Trusted property professionals active in this area"

**Placement:**
- Below High-Demand Developments.
- Above Developer Showcase.

**Purpose:**
- Supply-side monetization.
- Trust building (Professionals vs just listings).
- Lead conversion.

**Behavior:**
- **Slots:** Fixed **10 slots** per carousel.
- **Rotation:** 4-week time-based cycle.
- **Context:** Relevant to current location (Active listings or location package).

**Card Content (Single Agent):**
1.  **Identity:** Profile Photo/Avatar, Name, Role (Estate Agent/Developer Sales).
2.  **Badge:** Featured / Verified / Pro (Optional).
3.  **Relevance:** "Specialises in: {Area1}, {Area2}".
4.  **Stats:** Years Active, Active Listings.
5.  **Action:** Click to Profile.

**Monetization Logic (Priority Order):**
1.  🥇 **Tier 1 (Paid):** Location-specific featured agent package.
2.  🥈 **Tier 2 (Subscribed):** Active subscribers with >X listings in location.
3.  🥉 **Tier 3 (Performance):** High response rate / listing quality (Fallback).

**Engineering Contract:**
```javascript
LocationRecommendedAgentsCarousel({
  locationScope,
  limit: 10,
  priority: ["paid_featured", "subscription", "performance"],
  relevance: "listings_in_location",
  cycle: "4-weeks"
})
```

---

## 🔟 Developer Showcase (Dynamic Slider)
**Internal Name:** `DeveloperShowcaseCarousel`
**Public Title:** "Featured Developers in {Location}"

**Placement:**
- Below Recommended Agents.
- Above Buyer CTA.

**Purpose:**
- Developer-level monetization.
- Trust & Credibility ("Who builds here?").
- Brand building vs. Product selling.

**Behavior:**
- **Slots:** Fixed **10 slots** per carousel.
- **Rotation:** 4-week time-based cycle.
- **Context:** Shows developers relevant to *current location* (Active projects or Location-specific package).

**Slide Content (Single Developer):**
1.  **Identity:** Logo, Name, Years Established, Project Count.
2.  **Highlights:** 1-3 Featured Developments (Image + Name + Price).
3.  **CTA:** "View all projects by this developer".

**Monetization Logic (Priority Order):**
1.  🥇 **Tier 1 (Paid):** Location-specific showcase package.
2.  🥈 **Tier 2 (Subscribed):** Active subscribers with projects in location.
3.  🥉 **Tier 3 (Merit):** Editorial picks / High engagement.

**Engineering Contract:**
```javascript
DeveloperShowcaseCarousel({
  locationScope,        // e.g., 'sandton'
  limit: 10,            // Fixed slot count
  developmentsPerDeveloper: 3, // Max preview items
  cycle: "4-weeks",     // billing/rotation cycle
  priority: ["paid", "subscribed", "merit"]
})
```

---

## 1️⃣1️⃣ Buyer CTA (Primary - Alerts & Browse)
**Internal Name:** `LocationBuyerCTA`
**Placement:**
- Below Developer Showcase.
- Above Listings Feed.

**Purpose:**
- Capture high-intent buyers (Alerts).
- Keep users in the "discovery" loop (Browse more).
- Reduce friction (No payment/sales push).

**Variants (Context-Aware):**
1.  **Alerts (High Conversion):** "Get alerts for new properties in {Location}".
2.  **Browse (Discovery):** "Browse all 1,240 verified listings in {Location}".
3.  **Compare (Research):** "Compare prices & trends in {Location}".

**Behavior:**
- **Visual:** Clean, distinct block. No "ad" blindness.
- **Action:** Open Modal (Lead Capture) or Navigate to Feed.

**Engineering Contract:**
```javascript
LocationBuyerCTA({
  locationScope,
  type: "alerts", // or 'browse'
  title: "Get alerts for new properties in Sandton",
  subtitle: "Be the first to see new listings matching your criteria."
})
```

---

## 1️⃣2️⃣ Listings Feed / Market Stats (Content)
**Internal Name:** `LocationListingsFeed`
**Content:**
- Standard listings grid (filtered by location).
- SEO content block (Area guide).
- Market stats (Avg price, trends).

---

## 1️⃣3️⃣ Seller CTA (Secondary - Supply Capture)
**Internal Name:** `LocationSellerCTA`
**Placement:**
- Bottom 20-30% of page (After listings/stats).
- Before Footer.

**Purpose:**
- Capture private sellers & agents.
- Segment users (Owner vs Agent vs Developer).
- Reinforce demand ("Buyers are looking here").

**Copy Strategy (Buyer-Safe):**
- **Title:** "Have a property in {Location}?"
- **Subtitle:** "1,243 buyers viewed properties in {Location} this week."
- **Button:** "List your property" (Avoid "Sell Now").

**Visual:**
- Subdued but distinct.
- Gradient background or Location Watermark.
- **NOT** a main focus block (Secondary).

**Engineering Contract:**
```javascript
LocationSellerCTA({
  locationScope,
  stats: { viewsThisWeek: 1243 },
  segmentation: true // Show Owner/Agent choice on click
})
```

---

## 1️⃣4️⃣ Technical Implications

**Ads Architecture:**
We’ll design the banner as:
```typescript
interface LocationAdSlot {
  locationSlug: string;
  device: 'mobile' | 'tablet' | 'desktop';
  campaignId: string;
  imageUrl: string;
  clickUrl: string;
  impressionTracking: boolean;
}
```
- Keeps ads separate from content.
- Search stage reusable.
- Page fast and cacheable.
