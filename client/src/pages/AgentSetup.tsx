import { AgentSetupWizard } from '../components/agent/AgentSetupWizard';
import { AgentStatusStrip } from '@/components/agent/AgentStatusStrip';

export default function AgentSetup() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
        <AgentStatusStrip />
        <AgentSetupWizard />
      </div>
    </div>
  );
}
