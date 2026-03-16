export type FeedItemKind = 'video' | 'listing' | 'agent' | 'partner' | 'module';

export type ExploreCtaType =
  | 'viewListing'
  | 'viewingRequest'
  | 'contactAgent'
  | 'agentCall'
  | 'agentWhatsApp'
  | 'agentEmail'
  | 'partnerRequestQuote'
  | 'partnerCall'
  | 'partnerWhatsApp'
  | 'partnerEmail';

export interface ContactProfile {
  name: string;
  organization?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
}

export interface ActorTrust {
  actorType?: 'agent' | 'developer' | 'contractor' | 'finance_partner' | 'user';
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  trustBand?: 'low' | 'standard' | 'high';
  momentumLabel?: 'rising' | 'stable' | 'cooling';
  lowReports?: boolean;
}

export interface FeedItemBase {
  id: string;
  kind: FeedItemKind;
  videoUrl: string;
  posterUrl?: string;
  caption: string;
  actorTrust?: ActorTrust;
  creatorName?: string;
  creatorHandle?: string;
  category?: string;
}

export interface ExploreVideoFeedItem extends FeedItemBase {
  kind: 'video';
}

export interface ModuleListingCard {
  id: string;
  contentId: string;
  listingId?: number;
  title: string;
  price: string;
  location: string;
  imageUrl: string;
  beds?: number;
  baths?: number;
  size?: string;
  badge?: string;
}

export interface ListingDetails {
  title: string;
  price: string;
  location: string;
  beds: number;
  baths: number;
  size: string;
  amenities: string[];
  listingUrl?: string;
  listingId?: number;
  category?: string;
  showQuoteCta?: boolean;
  agentContact: ContactProfile;
}

export interface AgentDetails extends ContactProfile {
  agency: string;
  areaServed: string;
  bio: string;
}

export interface PartnerDetails {
  projectTitle: string;
  areaServed: string;
  scope: string;
  priceRange: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  contact: ContactProfile;
}

export interface ListingFeedItem extends FeedItemBase {
  kind: 'listing';
  linkedListing: ListingDetails;
}

export interface AgentFeedItem extends FeedItemBase {
  kind: 'agent';
  agentProfile: AgentDetails;
}

export interface PartnerFeedItem extends FeedItemBase {
  kind: 'partner';
  partnerShowcase: PartnerDetails;
}

export interface DiscoveryModuleFeedItem extends FeedItemBase {
  kind: 'module';
  moduleType: 'listings_carousel';
  title: string;
  subtitle?: string;
  cards: ModuleListingCard[];
}

export type FeedItem =
  | ExploreVideoFeedItem
  | ListingFeedItem
  | AgentFeedItem
  | PartnerFeedItem
  | DiscoveryModuleFeedItem;

export interface VideoFeedEventHandlers {
  onImpression: (contentId: string) => void;
  onViewStart: (contentId: string) => void;
  onViewProgress: (contentId: string, pct: number) => void;
  onViewComplete: (contentId: string) => void;
  onLike: (contentId: string) => void;
  onSave: (contentId: string) => void;
  onShare: (contentId: string) => void;
  onNotInterested: (contentId: string) => void;
  onCtaClick: (contentId: string, ctaType: ExploreCtaType) => void;
  onModuleImpression?: (moduleId: string, moduleType: string, sourceContentIds: string[]) => void;
  onModuleListingClick?: (
    moduleId: string,
    moduleType: string,
    contentId: string,
    listingId?: number,
  ) => void;
}
