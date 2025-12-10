/**
 * Agent Breakdown Table Component
 * Displays agent performance breakdown within an agency
 * Requirements: 3.2, 3.4
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Eye, Video, TrendingUp } from 'lucide-react';
import { AgentPerformance } from '@/hooks/useAgencyAnalytics';

interface AgentBreakdownTableProps {
  agents: AgentPerformance[];
}

export function AgentBreakdownTable({ agents }: AgentBreakdownTableProps) {
  if (agents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Agent Performance
          </CardTitle>
          <CardDescription>No agent data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No agents have created content yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Agent Performance
        </CardTitle>
        <CardDescription>
          Performance breakdown by agent within your agency
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {agents.map((agent, index) => (
            <div
              key={agent.agentId}
              className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <Badge
                  variant="secondary"
                  className="w-8 h-8 flex items-center justify-center"
                >
                  {index + 1}
                </Badge>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{agent.agentName}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Video className="h-3 w-3" />
                      <span>{agent.contentCount} content</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Eye className="h-3 w-3" />
                      <span>{agent.totalViews.toLocaleString()} views</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>Score: {agent.averagePerformanceScore.toFixed(0)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
