# 💎 Refined Location Pages Implementation Plan

## 🧠 Strategic Approach: The Hybrid Path (Option C)

We are proceeding with the **Hybrid Approach**:
1.  **Close out Phase 3A (Days 1-3)**: Finish property tests for existing Location Grid to ensure stability.
2.  **Pivot to Revenue (Day 4+)**: Immediately start Phase 3B (Hero Ads & Demand Scoring).

### 🔑 Key Architectural Decisions (Based on User Feedback)

1.  **Unified Monetization Schema**: Instead of 3 separate tables, we will use a single `location_targeting` table for Ads, Developers, and Agents.
2.  **Location Monetization Hub**: A single Admin Dashboard rather than fragmented pages.
3.  **Early Instrumentation**: Analytics tracking added immediately to feed the Demand Scoring engine.
4.  **SEO Priority**: Moving Editorial Content up in priority to build authority while building revenue features.

---

## 📅 Phase 3A: Integrity & Stability (Days 1-3)

**Goal**: Ensure the current "mostly done" Phase 3 is robust before adding complexity.

- [ ] **3.4 Write Property Tests** (`client/src/components/location/__tests__/LocationHierarchy.property.test.tsx`)
    -   **Property 1: Hierarchical Consistency**: City must belong to Province, Suburb to City.
    -   **Property 2: Navigation Links**: generated URLs must resolve to valid routes.
    -   **Property 3**: Data completeness (no missing names/slugs).

---

## 💰 Phase 3B: Revenue Foundation (Week 2)

**Goal**: Ship one visible, monetizable feature & the scoring engine.

### 3B.1: Unified Schema Implementation
```sql
CREATE TABLE location_targeting (
  id INT PRIMARY KEY AUTO_INCREMENT,
  target_type ENUM('hero_ad', 'featured_developer', 'recommended_agent'),
  target_id INT, -- ID of the ad/developer/agent
  location_type ENUM('province', 'city', 'suburb'),
  location_id INT,
  ranking INT DEFAULT 0,
  start_date DATETIME,
  end_date DATETIME,
  status ENUM('active', 'scheduled', 'expired', 'paused'),
  metadata JSON, -- Stores image_url (ads), specific_badge (agents), etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_location (location_type, location_id, status)
);
```

### 3B.2: Demand Scoring Engine v1
-   **Database**: Add `demand_score`, `views_count`, `inquiries_count` to `developments` table.
-   **Telemetry**: Add `trackEvent` hooks to existing components (`Hero`, `Listings`).
-   **Algorithm**: Simple V1 = `(views * 0.5) + (inquiries * 2.0) + (recent_activity_bonus)`.

### 3B.3: Hero Billboard UI
-   **Component**: `HeroBillboard.tsx` accepting `location_targeting` data.
-   **Logic**: Fetch active `hero_ad` for current location sorted by `ranking`.

### 3B.4: Admin Hub v0.1
-   **Page**: `AdminLocationHub.tsx`
-   **Tab 1**: "Billboards" (Upload image → Insert into `location_targeting`).

---

## 🚀 Phase 4: Validated Revenue Streams (Weeks 3-5)

**Philosophy**: One stream at a time.

### Week 3: Hot-Selling Developments
-   **UI**: `HotSellingSlider.tsx` powered by Demand Scoring Engine.
-   **Data**: Real data from the `trackEvent` metrics gathered in Week 2.

### Week 4: Featured Developers
-   **UI**: `DeveloperSlider.tsx`.
-   **Backend**: Query `location_targeting` where type='featured_developer'.
-   **Admin**: "Developers" tab in Hub to assign slots.

### Week 5: Recommended Agents
-   **UI**: `AgentSlider.tsx`.
-   **Backend**: Hybrid ranking (Paid slot from `location_targeting` + Performance slot from listings data).
-   **Admin**: "Agents" tab in Hub.

---

## 📝 Phase 5: Authority & SEO (Week 6-7)

**Goal**: Build the content moat.

-   **CityScope/ProvinceScope**: Simple CMS (Payload/Strapi or custom table `location_insights`).
-   **SEO**: Ensure `SEOTextBlock` is auto-populated with new dynamic data (e.g., "Home to top developers like X and Y").

---

## 📊 Phase 6: Performance Dashboard (Week 8)

**Goal**: The "Sales Deck" view.

-   **Dashboard**: Heatmaps of Demand Scores.
-   **Reports**: Ad impression vs Click-through rates.

---

## 🏁 Immediate Action Items

1.  **Execute Phase 3A**: Create `LocationHierarchy.property.test.tsx` (TODAY).
2.  **Define Targeting Schema**: Create the migration file for `location_targeting`.
3.  **Instrument Analytics**: Add specific tracking events to `HeroLocation` and `FeaturedListings`.

Let's build. 🛠️
