# Partner Profile Page - Visual Guide

## Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ┌────┐                                                 │ │
│  │  │Logo│  ABC Properties                                 │ │
│  │  │    │  ✓ Verified Partner                            │ │
│  │  └────┘  Property Professional | Premium Member        │ │
│  │                                                         │ │
│  │          Leading property experts in Johannesburg       │ │
│  │          with over 15 years of experience...           │ │
│  │                                                         │ │
│  │          📍 Service Areas:                              │ │
│  │          [Johannesburg] [Pretoria] [Sandton]           │ │
│  │                                                         │ │
│  │                                          🛡️ Trust Score │ │
│  │                                               85        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 👁️       │ │ 📈       │ │ ❤️       │ │ ⭐       │      │
│  │ Total    │ │ Engage   │ │ Content  │ │ Quality  │      │
│  │ Views    │ │ Rate     │ │ Pieces   │ │ Score    │      │
│  │ 15,420   │ │ 12.5%    │ │ 45       │ │ 78       │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Reviews & Ratings                                      │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │        4.8                                       │  │ │
│  │  │     ⭐⭐⭐⭐⭐                                      │  │ │
│  │  │     24 reviews                                   │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │ John Smith  ⭐⭐⭐⭐⭐         📅 Jan 5, 2026   │  │ │
│  │  │ Excellent service! Very professional and...      │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │ Sarah Jones ⭐⭐⭐⭐           📅 Jan 3, 2026   │  │ │
│  │  │ Great experience working with this partner...    │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Mobile Layout (< 768px)

```
┌──────────────────────┐
│  ← Back              │
├──────────────────────┤
│                      │
│  ┌────┐              │
│  │Logo│              │
│  └────┘              │
│                      │
│  ABC Properties      │
│  ✓ Verified Partner  │
│  Property Prof...    │
│  Premium Member      │
│                      │
│  🛡️ Trust Score      │
│       85             │
│                      │
│  Leading property... │
│                      │
│  📍 Service Areas:   │
│  [Johannesburg]      │
│  [Pretoria]          │
│  [Sandton]           │
│                      │
├──────────────────────┤
│  👁️ Total Views      │
│     15,420           │
├──────────────────────┤
│  📈 Engagement       │
│     12.5%            │
├──────────────────────┤
│  ❤️ Content          │
│     45               │
├──────────────────────┤
│  ⭐ Quality          │
│     78               │
├──────────────────────┤
│                      │
│  Reviews & Ratings   │
│                      │
│       4.8            │
│    ⭐⭐⭐⭐⭐         │
│    24 reviews        │
│                      │
│  John Smith ⭐⭐⭐⭐⭐ │
│  📅 Jan 5, 2026      │
│  Excellent service!  │
│                      │
└──────────────────────┘
```

## Component Breakdown

### 1. Header Card
```tsx
<Card className="p-6 mb-6">
  <div className="flex flex-col md:flex-row gap-6">
    {/* Logo */}
    <div className="flex-shrink-0">
      <img src={logoUrl} className="w-24 h-24 rounded-lg" />
    </div>
    
    {/* Company Info */}
    <div className="flex-1">
      <h1>{companyName}</h1>
      <div className="flex items-center gap-2">
        {/* Badges */}
        <Badge>✓ Verified Partner</Badge>
        <Badge>{tierName}</Badge>
        <Badge>{subscriptionTier}</Badge>
      </div>
      
      {/* Description */}
      <p>{description}</p>
      
      {/* Service Locations */}
      <div className="flex items-start gap-2">
        <MapPin />
        <div>
          <p>Service Areas</p>
          {locations.map(loc => <Badge>{loc}</Badge>)}
        </div>
      </div>
    </div>
    
    {/* Trust Score */}
    <div className="text-right">
      <Shield />
      <span>{trustScore}</span>
      <p>Trust Score</p>
    </div>
  </div>
</Card>
```

### 2. Metrics Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
  <MetricCard
    icon={Eye}
    label="Total Views"
    value="15,420"
    iconColor="text-blue-500"
  />
  {/* ... more metrics */}
</div>
```

### 3. Reviews Section
```tsx
<Card className="p-6">
  <h2>Reviews & Ratings</h2>
  
  {/* Average Rating */}
  <div className="text-center">
    <div className="text-4xl font-bold">4.8</div>
    <div className="flex items-center">
      {[1,2,3,4,5].map(star => <Star filled />)}
    </div>
    <p>24 reviews</p>
  </div>
  
  {/* Individual Reviews */}
  <div className="space-y-4">
    {reviews.map(review => (
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <span>{userName}</span>
            <div>{stars}</div>
          </div>
          <div>
            <Calendar />
            {date}
          </div>
        </div>
        <p>{comment}</p>
      </div>
    ))}
  </div>
</Card>
```

## Color Scheme

### Badges
- **Verified**: Green (`bg-green-500`)
- **Tier**: Outline (`variant="outline"`)
- **Subscription**: Secondary (`variant="secondary"`)
- **Location**: Secondary (`variant="secondary"`)

### Icons
- **Views**: Blue (`text-blue-500`)
- **Engagement**: Green (`text-green-500`)
- **Content**: Red (`text-red-500`)
- **Quality**: Yellow (`text-yellow-500`)
- **Trust**: Primary (`text-primary`)

### Stars
- **Filled**: Yellow (`fill-yellow-400 text-yellow-400`)
- **Empty**: Gray (`text-gray-300`)

## States

### Loading State
```
┌─────────────────────────────────────┐
│  [Skeleton: 10px x 24px]            │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │  [Skeleton: 24px x 24px]      │  │
│  │  [Skeleton: 200px x 32px]     │  │
│  │  [Skeleton: 100% x 16px]      │  │
│  │  [Skeleton: 75% x 16px]       │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Skeleton: 24px] [Skeleton: 24px] │
│  [Skeleton: 24px] [Skeleton: 24px] │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  [Skeleton: 48px x 200px]     │  │
│  │  [Skeleton: 100% x 128px]     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Error State (404)
```
┌─────────────────────────────────────┐
│                                     │
│           ⚠️                        │
│                                     │
│      Partner Not Found              │
│                                     │
│  The partner profile you're         │
│  looking for doesn't exist or       │
│  has been removed.                  │
│                                     │
│         [← Go Back]                 │
│                                     │
└─────────────────────────────────────┘
```

### Empty Reviews State
```
┌─────────────────────────────────────┐
│  Reviews & Ratings                  │
│                                     │
│           ⭐                        │
│                                     │
│      No reviews yet                 │
│                                     │
│  Be the first to review this        │
│  verified partner!                  │
│                                     │
└─────────────────────────────────────┘
```

## Interaction Flow

1. **User clicks partner link** → Navigate to `/partner/:partnerId`
2. **Page loads** → Show skeleton loaders
3. **Data fetches** → Display profile, metrics, reviews
4. **User clicks back** → Navigate to previous page
5. **User scrolls** → View all sections
6. **User reads reviews** → See ratings and comments

## Accessibility

- **Keyboard Navigation**: All interactive elements focusable
- **Screen Readers**: Proper ARIA labels on all sections
- **Color Contrast**: WCAG AA compliant
- **Focus Indicators**: Visible focus states
- **Semantic HTML**: Proper heading hierarchy

## Performance

- **Initial Load**: < 1s with skeleton
- **Data Fetch**: Parallel queries for profile and metrics
- **Images**: Lazy loaded with placeholder
- **Caching**: React Query automatic caching
- **Revalidation**: Stale-while-revalidate strategy
