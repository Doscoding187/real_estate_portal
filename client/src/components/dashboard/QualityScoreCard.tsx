import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gauge, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { getQualityTier } from '@/lib/quality';

interface QualityScoreCardProps {
  qualityScore: number; // 0-100
  qualityBreakdown?: {
    imageCount: number;
    hasVideo: boolean;
    descriptionLength: number;
    featureCount: number;
    hasVirtualTour: boolean;
    trustSignals: string[];
    priceClarity: boolean;
    locationAccuracy: boolean;
    floorSizePresent: boolean;
  } | null;
  tips?: string[];
  className?: string;
}

export function QualityScoreCard({
  qualityScore,
  qualityBreakdown,
  tips = [],
  className,
}: QualityScoreCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { label, color } = getQualityTier(qualityScore);

  // Map simple color to tailwind classes
  const colorMap: Record<string, { text: string; bg: string; border: string }> = {
    green: { text: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' },
    blue: { text: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
    yellow: { text: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-200' },
    red: { text: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200' },
  };

  const styles = colorMap[color] || colorMap.red;

  // Fallback tips generation if backend didn't send them (Frontend mirroring logic)
  const derivedTips = [...tips];
  if (derivedTips.length === 0 && qualityBreakdown) {
    if (qualityBreakdown.imageCount < 10)
      derivedTips.push(`Add ${10 - qualityBreakdown.imageCount} more photos.`);
    if (qualityBreakdown.descriptionLength < 500)
      derivedTips.push('Expand description to 500+ characters.');
    if (!qualityBreakdown.hasVideo && !qualityBreakdown.hasVirtualTour)
      derivedTips.push('Add a video or virtual tour.');
    if (qualityBreakdown.featureCount < 5) derivedTips.push('Add more key features.');
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-3 bg-slate-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Gauge className="w-4 h-4" /> Listing Quality
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className={`${styles.bg} ${styles.text} border ${styles.border}`}
          >
            {label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="flex items-end gap-2 mb-4">
          <span className="text-4xl font-bold font-heading">{qualityScore}</span>
          <span className="text-sm text-slate-400 mb-1">/ 100</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-slate-100 rounded-full mb-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${styles.text.replace('text', 'bg')}`}
            style={{ width: `${qualityScore}%` }}
          />
        </div>

        {/* Actionable Tips */}
        {derivedTips.length > 0 && (
          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-slate-600 hover:text-slate-900 px-0 hover:bg-transparent"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="font-medium text-sm">
                  Optimization Tips ({derivedTips.length})
                </span>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {isExpanded && (
              <ul className="mt-3 space-y-2 animate-in slide-in-from-top-2">
                {derivedTips.map((tip, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
