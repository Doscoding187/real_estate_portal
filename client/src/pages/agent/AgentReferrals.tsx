import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { ReferralQualificationWidget } from '@/components/agent/ReferralQualificationWidget';

export default function AgentReferrals() {
  return (
    <AgentAppShell>
      <main className="mx-auto max-w-[1400px] p-4 md:p-6">
        <ReferralQualificationWidget showFullList />
      </main>
    </AgentAppShell>
  );
}
