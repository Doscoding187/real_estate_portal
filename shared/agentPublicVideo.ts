/** Anonymous media projection; publisher internals and metadata remain private. */
export interface PublicAgentVideo {
  id: number;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string;
}

export interface PublicAgentVideoPage {
  items: PublicAgentVideo[];
  nextCursor: number | null;
}
