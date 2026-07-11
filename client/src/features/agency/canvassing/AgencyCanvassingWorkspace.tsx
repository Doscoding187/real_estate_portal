import { CanvassingWorkspace } from '@/features/canvassing/CanvassingWorkspace';
import type { WorkspaceContentProps } from '../workspace/types';

export function AgencyCanvassingWorkspace(props: WorkspaceContentProps) {
  return <CanvassingWorkspace mode="agency" onNavigate={props.setLocation} />;
}
