import { Badge } from '@/components/ui/badge';

interface ResponsiveHighlightsProps {
  items: string[];
}

export function ResponsiveHighlights({ items = [] }: ResponsiveHighlightsProps) {
  // Ensure items is an array before using it
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="flex flex-wrap gap-2 mt-1 w-full overflow-hidden h-[26px]">
      {safeItems.map((highlight, index) => (
        <Badge
          key={`${highlight}-${index}`}
          variant="outline"
          className="text-xs bg-slate-50 border-slate-200 text-slate-700 whitespace-nowrap h-[22px]"
        >
          {highlight}
        </Badge>
      ))}
    </div>
  );
}
