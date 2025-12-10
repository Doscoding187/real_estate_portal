/**
 * Top Content List Component
 * Displays top performing content for an agency
 * Requirements: 3.3
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Heart, Share2, TrendingUp } from 'lucide-react';
import { TopContent } from '@/hooks/useAgencyAnalytics';

interface TopContentListProps {
  content: TopContent[];
}

export function TopContentList({ content }: TopContentListProps) {
  if (content.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Performing Content
          </CardTitle>
          <CardDescription>No content data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No content has been published yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Top Performing Content
        </CardTitle>
        <CardDescription>
          Your best content ranked by performance score
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {content.map((item, index) => (
            <div
              key={item.id}
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
                  <p className="font-medium text-slate-800">{item.title}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Eye className="h-3 w-3" />
                      <span>{item.viewCount.toLocaleString()} views</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Heart className="h-3 w-3" />
                      <span>{item.saveCount} saves</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Share2 className="h-3 w-3" />
                      <span>{item.shareCount} shares</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-emerald-600">
                  Score: {item.performanceScore.toFixed(0)}
                </p>
                <p className="text-xs text-slate-500 capitalize">{item.contentType}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
