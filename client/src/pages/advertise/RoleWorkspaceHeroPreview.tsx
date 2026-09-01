import { AnimatePresence, motion } from 'framer-motion';
import { Building2, BriefcaseBusiness, UserRound } from 'lucide-react';
import { useState } from 'react';
import { AgencyWorkspacePreview } from './AgencyWorkspacePreview';
import { AgentWorkspacePreview } from './AgentWorkspacePreview';
import { DeveloperWorkspacePreview } from './DeveloperWorkspacePreview';

type WorkspaceRole = 'agent' | 'agency' | 'developer';

type WorkspaceOption = {
  id: WorkspaceRole;
  label: string;
  icon: typeof UserRound;
};

const WORKSPACE_OPTIONS: WorkspaceOption[] = [
  {
    id: 'agent',
    label: 'Agent',
    icon: UserRound,
  },
  {
    id: 'agency',
    label: 'Agency',
    icon: BriefcaseBusiness,
  },
  {
    id: 'developer',
    label: 'Developer',
    icon: Building2,
  },
];

function WorkspacePreview({ role }: { role: WorkspaceRole }) {
  switch (role) {
    case 'agency':
      return <AgencyWorkspacePreview compact />;
    case 'developer':
      return <DeveloperWorkspacePreview compact />;
    default:
      return <AgentWorkspacePreview compact />;
  }
}

/**
 * Lets the shared Advertise page show one real role-specific product preview
 * at a time, without turning the hero into three competing dashboard cards.
 */
export function RoleWorkspaceHeroPreview() {
  const [activeRole, setActiveRole] = useState<WorkspaceRole>('agent');

  return (
    <div data-testid="role-workspace-hero-preview" className="relative">
      <div
        role="tablist"
        aria-label="Choose a workspace preview"
        className="relative z-10 mb-4 grid w-full max-w-md grid-cols-3 gap-1 rounded-2xl border border-white/15 bg-slate-950/85 p-1.5 shadow-[0_16px_40px_rgba(2,6,23,0.28)] backdrop-blur-md"
      >
        {WORKSPACE_OPTIONS.map(option => {
          const Icon = option.icon;
          const isActive = option.id === activeRole;

          return (
            <button
              key={option.id}
              id={`${option.id}-workspace-tab`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${option.id}-workspace-panel`}
              onClick={() => setActiveRole(option.id)}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:text-xs ${
                isActive
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`${activeRole}-workspace-panel`}
        role="tabpanel"
        aria-labelledby={`${activeRole}-workspace-tab`}
        className="relative overflow-hidden rounded-[24px]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeRole}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <WorkspacePreview role={activeRole} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
