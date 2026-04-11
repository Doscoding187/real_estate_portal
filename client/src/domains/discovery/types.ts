export interface DiscoveryItem {
  id: number;
  type: 'property' | 'video' | 'neighbourhood' | 'insight';
  data: any;
  partnerId?: number | null;
}

export interface ContentBlock {
  id: string;
  title: string;
  type: 'for-you' | 'popular-near-you' | 'new-developments' | 'trending' | 'partner';
  items: DiscoveryItem[];
}
