# Explore Feature - Comprehensive Codebase Documentation

## Executive Summary

The Explore Feature is a next-generation property discovery engine that transforms traditional property browsing into an engaging, personalized content experience. It combines:
- **Short-form video content** (TikTok/Reels style)
- **Intelligent data-driven recommendations** (Zillow-inspired)
- **Lifestyle-based discovery** (Airbnb-inspired)
- **Neighbourhood storytelling**

This document provides a complete technical overview for senior developers.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXPLORE FEATURE ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         FRONTEND (React + TypeScript)                │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │    │
│  │  │ ExploreHome │  │ ExploreFeed │  │ExploreShorts│  │ ExploreMap │  │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │    │
│  │         │                │                │               │          │    │
│  │  ┌──────┴────────────────┴────────────────┴───────────────┴──────┐  │    │
│  │  │                    SHARED COMPONENTS                           │  │    │
│  │  │  • TrendingVideosSection  • DiscoveryCardFeed                 │  │    │
│  │  │  • ExploreVideoFeed       • FilterPanel                       │  │    │
│  │  │  • PersonalizedContentBlock • LifestyleCategorySelector       │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  │                              │                                       │    │
│  │  ┌───────────────────────────┴───────────────────────────────────┐  │    │
│  │  │                    CUSTOM HOOKS                                │  │    │
│  │  │  • useTrendingVideos    • useDiscoveryFeed                    │  │    │
│  │  │  • useExploreVideoFeed  • usePersonalizedContent              │  │    │
│  │  │  • useExploreCommonState • useMapHybridView                   │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  │                              │                                       │    │
│  │  ┌───────────────────────────┴───────────────────────────────────┐  │    │
│  │  │                    STATE MANAGEMENT (Zustand)                  │  │    │
│  │  │  • exploreFiltersStore - Filter state persistence             │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                              tRPC API                                        │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         BACKEND (Node.js + Express)                  │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │                    tRPC ROUTERS                              │    │    │
│  │  │  • exploreRouter        • exploreApiRouter                  │    │    │
│  │  │  • exploreVideoUploadRouter • exploreAnalyticsRouter        │    │    │
│  │  │  • boostCampaignRouter  • similarPropertiesRouter           │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                              │                                       │    │
│  │  ┌───────────────────────────┴───────────────────────────────────┐  │    │
│  │  │                    SERVICES                                    │  │    │
│  │  │  • exploreFeedService       • recommendationEngineService     │  │    │
│  │  │  • exploreVideoService      • exploreAnalyticsService         │  │    │
│  │  │  • exploreInteractionService • boostCampaignService           │  │    │
│  │  │  • exploreAgencyService     • videoProcessingService          │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         DATABASE (MySQL/TiDB)                        │    │
│  │  • explore_shorts    • explore_content    • explore_engagements     │    │
│  │  • explore_categories • explore_topics    • explore_user_preferences│    │
│  │  • explore_boost_campaigns • explore_discovery_videos               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
User Action → Hook → tRPC Query → Router → Service → Database
     ↓                                          ↓
  UI Update ← State Update ← Response ← Cache ← Query Result
```

---
