/** One publication vocabulary for editorial guides across every level.
 *  Local review is an internal state. Only 'published' is a public article. */
export const GUIDE_PUBLICATION_STATUSES = ['local-review', 'published'] as const;
export type GuidePublicationStatus = (typeof GUIDE_PUBLICATION_STATUSES)[number];

export const GUIDE_REVIEW_DRAFT_LABEL = 'Local-review draft.';

/** Published guides carry no draft marker. A guide still in local review keeps its marker
 *  visible so an unapproved article is never presented as a published one. */
export function guideStatusNote(status: GuidePublicationStatus): string {
  return status === 'published' ? '' : ` ${GUIDE_REVIEW_DRAFT_LABEL}`;
}

export function isPublishedGuide(status: GuidePublicationStatus): boolean {
  return status === 'published';
}

/** The single publication filter used by every guide list. A guide still in local review is
 *  never published, whatever else is true about it. */
export function selectPublishedGuides<T extends { status: GuidePublicationStatus }>(
  guides: readonly T[],
): T[] {
  return guides.filter(guide => isPublishedGuide(guide.status));
}
