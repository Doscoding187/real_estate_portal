type LeadActivityLike = {
  type?: string | null;
  description?: string | null;
};

export function getLeadActivityPresentation(activity: LeadActivityLike) {
  const description = String(activity.description || '').trim();
  const isFollowUpCompletion =
    activity.type === 'note' && /^Follow-up completed(?:\.|\s|$)/i.test(description);

  if (!isFollowUpCompletion) {
    return {
      label: String(activity.type || 'activity').replace(/_/g, ' '),
      description: description || 'Activity recorded.',
      isFollowUpCompletion: false,
    };
  }

  const completionNote = description
    .replace(/^Follow-up completed\.?\s*/i, '')
    .trim();
  const details = /^from agency workspace\.?$/i.test(completionNote)
    ? 'Completed in the agency workspace.'
    : completionNote || 'Follow-up marked complete.';

  return {
    label: 'Followed up',
    description: details,
    isFollowUpCompletion: true,
  };
}

export function formatLeadActivityDate(value?: string | Date | null) {
  if (!value) return 'Recently';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
