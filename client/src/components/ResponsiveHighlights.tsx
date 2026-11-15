import { Badge } from '@/components/ui/badge';

interface ResponsiveHighlightsProps {
  items: string[];
  maxVisible?: number;
  singleLine?: boolean;
  onClick?: () => void;
  actionLabel?: string;
}

export function ResponsiveHighlights({
  items = [],
  maxVisible,
  singleLine = false,
  onClick,
  actionLabel = 'Open development details from highlights',
}: ResponsiveHighlightsProps) {
  // Ensure items is an array before using it
  const safeItems = Array.isArray(items) ? items : [];

  if (typeof maxVisible === 'number') {
    const visibleItems = safeItems.slice(0, Math.max(0, maxVisible));
    const remainingCount = Math.max(0, safeItems.length - visibleItems.length);

    if (singleLine) {
      const highlightItems = (
        <>
          {visibleItems.map((highlight, index) => (
            <Badge
              key={`${highlight}-${index}`}
              variant="outline"
              title={highlight}
              className="h-[26px] w-0 min-w-0 flex-1 justify-start truncate border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] leading-4 text-slate-700"
            >
              <span className="block min-w-0 flex-1 truncate">{highlight}</span>
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Badge
              variant="outline"
              title={safeItems.slice(visibleItems.length).join(', ')}
              className="h-[26px] shrink-0 border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] leading-4 text-blue-800"
            >
              +{remainingCount} more
            </Badge>
          )}
        </>
      );

      if (onClick) {
        return (
          <button
            type="button"
            onClick={onClick}
            aria-label={actionLabel}
            className="flex w-full min-w-0 items-center gap-1.5 rounded-md text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {highlightItems}
          </button>
        );
      }

      return (
        <div aria-label="Development highlights" className="flex min-w-0 items-center gap-1.5">
          {highlightItems}
        </div>
      );
    }

    return (
      <div className="mt-1 flex w-full flex-wrap gap-1.5">
        {visibleItems.map((highlight, index) => (
          <Badge
            key={`${highlight}-${index}`}
            variant="outline"
            className="h-auto whitespace-nowrap border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] leading-4 text-slate-700"
          >
            {highlight}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge
            variant="outline"
            title={safeItems.slice(visibleItems.length).join(', ')}
            className="h-auto whitespace-nowrap border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] leading-4 text-blue-800"
          >
            +{remainingCount} more
          </Badge>
        )}
      </div>
    );
  }

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
