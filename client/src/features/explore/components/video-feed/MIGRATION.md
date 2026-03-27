# Explore Video Feed Migration

## Goal
Switch from sandbox mock data to production data/events without changing UI components.

## 1) Keep UI components unchanged
Continue using:

- `VideoFeed`
- `VideoCard`
- `ContextBar`
- `ContextSheet`
- `ActionStack`
- `ContactSheet`

All are in `client/src/features/explore/components/video-feed`.

## 2) Replace provider only
Current sandbox source:

- `mockFeedProvider.getFeed(): Promise<FeedItem[]>`

Production should provide:

- `TrpcFeedProvider.getFeed(): Promise<FeedItem[]>`

Map `trpc.explore.getFeed` response into the shared `FeedItem` model from `types.ts`.

## 3) Replace event handlers only
`VideoFeed` expects this callback contract:

- `onImpression(contentId)`
- `onViewStart(contentId)`
- `onViewProgress(contentId, pct)`
- `onViewComplete(contentId)`
- `onLike(contentId)`
- `onSave(contentId)`
- `onShare(contentId)`
- `onNotInterested(contentId)`
- `onCtaClick(contentId, ctaType)`

Sandbox wires these to `console.log`.
Production should wire these to `recordInteraction` / `recordOutcome`.

## 4) Integration sketch

1. Query `trpc.explore.getFeed`.
2. Convert to `FeedItem[]`.
3. Pass items + production handlers into `VideoFeed`.
4. Remove sandbox telemetry calls.

