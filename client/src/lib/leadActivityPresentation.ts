type LeadActivityLike = {
  type?: string | null;
  description?: string | null;
  metadata?: string | Record<string, unknown> | null;
};

function activityMetadata(value: LeadActivityLike['metadata']): Record<string, unknown> | null {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function titleCase(value: unknown) {
  const text = String(value || '')
    .replace(/_/g, ' ')
    .trim();
  return text ? text[0].toUpperCase() + text.slice(1) : '';
}

export function getLeadActivityPresentation(activity: LeadActivityLike) {
  const description = String(activity.description || '').trim();
  const isFollowUpCompletion =
    activity.type === 'note' && /^Follow-up completed(?:\.|\s|$)/i.test(description);

  if (activity.type === 'contact_attempt') {
    const metadata = activityMetadata(activity.metadata);
    const channel = titleCase(metadata?.channel);
    const outcome = titleCase(metadata?.outcome);
    return {
      label: [channel, outcome].filter(Boolean).join(' · ') || 'Contact attempt',
      description: description || 'Contact attempt recorded.',
      isFollowUpCompletion: false,
      isViewingScheduled: false,
    };
  }

  if (!isFollowUpCompletion) {
    const agencyViewing =
      activity.type === 'meeting'
        ? description.match(/^Viewing (requested|awaiting_confirmation|confirmed) for (.+)$/i)
        : null;
    const agentViewing =
      activity.type === 'status_change' ? description.match(/^Showing booked for (.+)$/i) : null;

    if (agencyViewing) {
      const status = agencyViewing[1].replace(/_/g, ' ');
      const scheduledAt = agencyViewing[2].replace(/\.$/, '').trim();

      return {
        label: 'Viewing scheduled',
        description: `${status[0].toUpperCase()}${status.slice(1)} for ${scheduledAt}`,
        isFollowUpCompletion: false,
        isViewingScheduled: true,
      };
    }

    if (agentViewing) {
      const scheduledAt = agentViewing[1].replace(/\.$/, '').trim();

      return {
        label: 'Viewing scheduled',
        description: `Booked for ${scheduledAt}`,
        isFollowUpCompletion: false,
        isViewingScheduled: true,
      };
    }

    return {
      label: String(activity.type || 'activity').replace(/_/g, ' '),
      description: description || 'Activity recorded.',
      isFollowUpCompletion: false,
      isViewingScheduled: false,
    };
  }

  const completionNote = description.replace(/^Follow-up completed\.?\s*/i, '').trim();
  const details = /^from agency workspace\.?$/i.test(completionNote)
    ? 'Completed in the agency workspace.'
    : completionNote || 'Follow-up marked complete.';

  return {
    label: 'Followed up',
    description: details,
    isFollowUpCompletion: true,
    isViewingScheduled: false,
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
