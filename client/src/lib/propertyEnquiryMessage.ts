export type PropertyEnquiryType = 'general' | 'viewing';

export function defaultPropertyEnquiryMessage(
  propertyTitle: string,
  type: PropertyEnquiryType,
): string {
  const property = propertyTitle.trim() || 'this property';
  return type === 'viewing'
    ? `Hi, I'd like to arrange a viewing of ${property}. Please let me know a suitable time.`
    : `Hi, I'm interested in ${property}. Is it still available?`;
}

/** Hide the old system-added category prefix without changing stored enquiry history. */
export function propertyEnquiryMessageText(message: string | null | undefined): string {
  return (message || '').replace(/^\s*\[(?:GENERAL ENQUIRY|VIEWING REQUEST)\]\s*/i, '').trim();
}
