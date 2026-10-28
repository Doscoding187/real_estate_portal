export type LeadResponsePerformance = {
  windowDays: number;
  measuredLeads: number;
  medianResponseSeconds: number;
  sampleReady: boolean;
};

export function formatResponseLatency(seconds: number) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.max(1, Math.round(total / 60));
  const hours = Math.max(1, Math.round(total / 3600));
  const days = Math.max(1, Math.round(total / 86400));
  const unit = (count: number, label: string) => (count === 1 ? label : `${label}s`);
  if (total < 60) return 'under a minute';
  if (total < 7200) return `within ${minutes} ${unit(minutes, 'minute')}`;
  if (total < 172800) return `within ${hours} ${unit(hours, 'hour')}`;
  return `within ${days} ${unit(days, 'day')}`;
}
