import { useLocation } from 'wouter';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { CanvassingWorkspace } from '@/features/canvassing/CanvassingWorkspace';

export default function AgentCanvassing() {
  const [, setLocation] = useLocation();

  return (
    <AgentAppShell>
      <main className={agentPageStyles.container}>
        <CanvassingWorkspace mode="agent" onNavigate={setLocation} />
      </main>
    </AgentAppShell>
  );
}
