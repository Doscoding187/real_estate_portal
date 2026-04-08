import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type AgentFeatureLockedStateProps = {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  isLoading?: boolean;
};

export function AgentFeatureLockedState({
  title,
  description,
  actionLabel,
  onAction,
  isLoading = false,
}: AgentFeatureLockedStateProps) {
  return (
    <Card className={cn(agentPageStyles.panel, 'max-w-3xl mx-auto')}>
      <CardHeader className="pb-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
        </div>
        <CardTitle className="pt-4 text-2xl tracking-[-0.03em]">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        {!isLoading ? (
          <Button className="mt-5 rounded-full px-5" onClick={onAction}>
            {actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
