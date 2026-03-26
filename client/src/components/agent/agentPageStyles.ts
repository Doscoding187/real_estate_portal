export const agentPageStyles = {
  container: 'mx-auto flex w-full max-w-[1700px] flex-col gap-5 px-4 py-7 md:px-7 md:pb-10',
  header: 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between',
  headingBlock: 'space-y-1.5',
  title: 'text-[28px] font-semibold tracking-[-0.03em] text-slate-900',
  subtitle: 'text-[13px] text-slate-500',
  panel:
    'rounded-[15px] border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_0_0_1px_rgba(15,23,42,0.04)]',
  mutedPanel:
    'rounded-[15px] border border-slate-200/80 bg-[#fbfaf7] shadow-[0_1px_3px_rgba(15,23,42,0.06),0_0_0_1px_rgba(15,23,42,0.04)]',
  controls:
    'rounded-[15px] border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_0_0_1px_rgba(15,23,42,0.04)]',
  tabsList:
    'h-auto rounded-[15px] border border-slate-200/80 bg-white p-1 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_0_0_1px_rgba(15,23,42,0.04)]',
  tabTrigger:
    'rounded-[10px] px-3 py-2 text-[13px] font-medium text-slate-500 data-[state=active]:bg-[color:color-mix(in_oklab,var(--primary)_8%,white)] data-[state=active]:text-[var(--primary)]',
  primaryButton:
    'h-9 rounded-full bg-[var(--primary)] px-4 text-[12.5px] font-medium text-white shadow-[0_8px_28px_rgba(0,92,168,0.24)] hover:bg-[#0b4b81]',
  ghostButton:
    'h-9 rounded-full border border-slate-200 bg-white px-4 text-[12.5px] font-medium text-slate-600 hover:border-[color:color-mix(in_oklab,var(--primary)_24%,white)] hover:bg-[color:color-mix(in_oklab,var(--primary)_6%,white)] hover:text-[var(--primary)]',
  statCard:
    'rounded-[15px] border border-slate-200/80 bg-white p-[22px] shadow-[0_1px_3px_rgba(15,23,42,0.06),0_0_0_1px_rgba(15,23,42,0.04)]',
  statLabel: 'text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400',
  statValue: 'mt-2 text-[32px] tracking-[-0.04em] text-slate-900',
  statSub: 'mt-1 text-[11px] text-slate-500',
} as const;
