import { z } from 'zod';
import {
  DEFAULT_DISCOVERY_PAGE_SIZE,
  DISCOVERY_CATEGORIES,
  DISCOVERY_CONTENT_TYPES,
  DISCOVERY_ENGAGEMENT_ACTIONS,
  DISCOVERY_FEED_MODES,
  DISCOVERY_INTENTS,
  DISCOVERY_ITEM_TYPES,
  DISCOVERY_LOCATION_TYPES,
} from './contracts';

export const discoveryFeedModeSchema = z.enum(DISCOVERY_FEED_MODES);
export const discoveryIntentSchema = z.enum(DISCOVERY_INTENTS);
export const discoveryLocationTypeSchema = z.enum(DISCOVERY_LOCATION_TYPES);
export const discoveryCategorySchema = z.enum(DISCOVERY_CATEGORIES);
export const discoveryContentTypeSchema = z.enum(DISCOVERY_CONTENT_TYPES);
export const discoveryItemTypeSchema = z.enum(DISCOVERY_ITEM_TYPES);
export const discoveryEngagementActionSchema = z.enum(DISCOVERY_ENGAGEMENT_ACTIONS);

export const discoveryLocationFilterSchema = z.object({
  type: discoveryLocationTypeSchema,
  id: z.number().int().positive(),
});

export const discoveryPriceRangeSchema = z
  .object({
    min: z.number().nonnegative().optional(),
    max: z.number().nonnegative().optional(),
  })
  .refine(
    value =>
      value.min === undefined || value.max === undefined || Number(value.min) <= Number(value.max),
    {
      message: 'priceRange.min must be less than or equal to priceRange.max',
      path: ['max'],
    },
  );

export const discoveryQuerySchema = z.object({
  mode: discoveryFeedModeSchema,
  intent: discoveryIntentSchema.optional(),
  location: discoveryLocationFilterSchema.optional(),
  category: discoveryCategorySchema.optional(),
  priceRange: discoveryPriceRangeSchema.optional(),
  creatorActorId: z.number().int().positive().optional(),
  contentType: discoveryContentTypeSchema.optional(),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).optional().default(DEFAULT_DISCOVERY_PAGE_SIZE),
});

export const discoveryMediaAssetSchema = z.object({
  coverUrl: z.string().min(1),
  videoUrl: z.string().min(1).optional(),
});

export const discoveryLocationSummarySchema = z.object({
  name: z.string().min(1),
  province: z.string().min(1).optional(),
});

export const discoveryItemEngagementSchema = z.object({
  likes: z.number().int().nonnegative(),
  saves: z.number().int().nonnegative(),
  views: z.number().int().nonnegative(),
});

export const discoveryFeedItemSchema = z.object({
  id: z.string().min(1),
  type: discoveryItemTypeSchema,
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  media: discoveryMediaAssetSchema,
  location: discoveryLocationSummarySchema.optional(),
  price: z.number().nonnegative().optional(),
  engagement: discoveryItemEngagementSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const discoveryFeedResponseSchema = z.object({
  items: z.array(discoveryFeedItemSchema),
  hasMore: z.boolean(),
  offset: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const discoveryEngagementContextSchema = z.object({
  mode: discoveryFeedModeSchema.optional(),
  position: z.number().int().nonnegative().optional(),
  query: z.lazy(() => discoveryQuerySchema.partial()).optional(),
});

export const discoveryEngagementSchema = z.object({
  itemId: z.string().min(1),
  action: discoveryEngagementActionSchema,
  context: discoveryEngagementContextSchema.optional(),
});

export type DiscoveryQueryInput = z.infer<typeof discoveryQuerySchema>;
export type DiscoveryFeedItemInput = z.infer<typeof discoveryFeedItemSchema>;
export type DiscoveryFeedResponseInput = z.infer<typeof discoveryFeedResponseSchema>;
export type DiscoveryEngagementInput = z.infer<typeof discoveryEngagementSchema>;
