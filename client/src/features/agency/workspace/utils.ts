import { formatCurrency } from '@/lib/utils';
import type { Tone } from './types';

export function numberLabel(value?: number | null) {
  return Number(value || 0).toLocaleString('en-ZA');
}

export function compactCurrency(value?: number | null) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 'R0';
  if (amount >= 1_000_000) {
    return `R${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`;
  }
  if (amount >= 1_000) return `R${Math.round(amount / 1_000)}k`;
  return formatCurrency(amount);
}

export function formatDate(value?: string | Date | null) {
  if (!value) return 'Recently';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function formatAge(value?: string | Date | null) {
  if (!value) return 'recently';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  const diffDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
}

export function sourceLabel(value?: string | null) {
  const normalized = String(value || 'web').replace(/[_-]/g, ' ').trim();
  return normalized
    .split(' ')
    .filter(Boolean)
    .map(part => `${part[0]?.toUpperCase() || ''}${part.slice(1)}`)
    .join(' ');
}

export function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

export function getInitials(value?: string | null) {
  return (value || 'Agency')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function toneClasses(tone: Tone) {
  const map: Record<
    Tone,
    { icon: string; soft: string; border: string; text: string; progress: string; dot: string }
  > = {
    emerald: {
      icon: 'bg-emerald-50 text-emerald-700',
      soft: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      progress: 'bg-emerald-600',
      dot: 'bg-emerald-500',
    },
    teal: {
      icon: 'bg-teal-50 text-teal-700',
      soft: 'bg-teal-50',
      border: 'border-teal-200',
      text: 'text-teal-700',
      progress: 'bg-teal-600',
      dot: 'bg-teal-500',
    },
    sky: {
      icon: 'bg-sky-50 text-sky-700',
      soft: 'bg-sky-50',
      border: 'border-sky-200',
      text: 'text-sky-700',
      progress: 'bg-sky-600',
      dot: 'bg-sky-500',
    },
    amber: {
      icon: 'bg-amber-50 text-amber-700',
      soft: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      progress: 'bg-amber-500',
      dot: 'bg-amber-500',
    },
    rose: {
      icon: 'bg-rose-50 text-rose-700',
      soft: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      progress: 'bg-rose-600',
      dot: 'bg-rose-500',
    },
    slate: {
      icon: 'bg-slate-100 text-slate-700',
      soft: 'bg-slate-50',
      border: 'border-slate-200',
      text: 'text-slate-700',
      progress: 'bg-slate-700',
      dot: 'bg-slate-500',
    },
  };
  return map[tone];
}
