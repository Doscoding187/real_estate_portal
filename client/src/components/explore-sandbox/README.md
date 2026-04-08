# Explore Sandbox Data Provider

How to swap mock provider to tRPC:

1. Keep using the `FeedProvider` interface in `providers.ts`.
2. Replace `mockFeedProvider.getFeed()` with a provider that calls `trpc.explore.getFeed`.
3. Map the tRPC response into the `FeedItem` model in `model.ts`.
4. Leave `ExploreSandboxFeed` and UI components unchanged.
