/**
 * Visual tokens for the development wizard, in one place so every step looks
 * the same. Values follow the approved mock-up.
 *
 * Radii: cards 8px (rounded-lg), inputs / chips / buttons 6px (rounded-md).
 * Spacing: label to options 12px (mb-3), sections 28px apart (pt-7) with a
 * light divider. Font: the app already loads Inter globally.
 */
export const wizardTokens = {
  card: 'rounded-lg border border-slate-200 bg-white p-4 sm:p-6',
  pageBackground: 'bg-slate-100',
  sectionLabel: 'mb-3 block text-sm font-semibold text-slate-800',
  hint: 'mt-2 text-xs leading-relaxed text-slate-600',
  section: 'flex flex-col border-t border-slate-100 pt-7 first:border-t-0 first:pt-0',
  input:
    'h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200',
  chip: 'inline-flex min-h-10 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-800 transition-colors hover:border-blue-300',
  chipOn: 'border-blue-700 bg-blue-50 font-semibold text-blue-900',
  highlightChip: 'border-orange-300 bg-orange-50 text-orange-800',
  highlightChipOn: 'border-orange-500 bg-orange-500 text-white',
  optionCard:
    'relative flex min-h-11 flex-col gap-1 rounded-lg border border-slate-300 bg-white p-4 text-left transition-all duration-150 hover:-translate-y-px hover:border-blue-300 hover:shadow-sm',
  optionCardOn: 'border-blue-700 bg-blue-50 shadow-[inset_0_0_0_1px_#1d4ed8]',
  iconTile:
    'flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition-colors',
  iconTileOn: 'bg-blue-700 text-white',
  headIconTile:
    'flex h-[52px] w-[52px] flex-none items-center justify-center rounded-lg bg-gradient-to-br from-blue-700 to-blue-500 text-white',
  progressTrack: 'h-1.5 overflow-hidden rounded-full bg-slate-200',
  progressFill: 'h-full rounded-full bg-gradient-to-r from-blue-700 to-orange-500 transition-[width] duration-300',
  button:
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
  buttonPrimary: 'border-blue-700 bg-blue-700 text-white hover:bg-blue-800',
  buttonGhost: 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100',
} as const;
