import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface ResponsiveHighlightsProps {
  items: string[];
}

export function ResponsiveHighlights({ items = [] }: ResponsiveHighlightsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Ensure items is an array before using it
  const safeItems = Array.isArray(items) ? items : [];
  const [visibleItems, setVisibleItems] = useState<string[]>(safeItems);
  const [overflowCount, setOverflowCount] = useState(0);
  const [isCalculating, setIsCalculating] = useState(true);

  useLayoutEffect(() => {
    const calculateVisibleItems = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const children = Array.from(container.children) as HTMLElement[];
      
      if (children.length === 0) return;

      const firstItemTop = children[0].offsetTop;
      let lastVisibleIndex = -1;

      // Find the last item that fits on the first line
      for (let i = 0; i < children.length; i++) {
        if (children[i].offsetTop > firstItemTop) {
          break;
        }
        lastVisibleIndex = i;
      }

      // If all items fit, we're done
      if (lastVisibleIndex === safeItems.length - 1) {
        setVisibleItems(safeItems);
        setOverflowCount(0);
        setIsCalculating(false);
        return;
      }

      // If we have overflow, we need to make space for the "+N" badge
      // We'll tentatively try to fit (lastVisibleIndex) items.
      // But adding the badge might push the last one down.
      // So we might need to reduce by 1 or 2.
      
      // Heuristic: Reduce by 1 initially to make room for badge
      // In a perfect world we'd measure the badge too, but this is usually sufficient.
      const tentativeCount = lastVisibleIndex; 
      
      setVisibleItems(safeItems.slice(0, tentativeCount));
      setOverflowCount(safeItems.length - tentativeCount);
      setIsCalculating(false);
    };

    // Initial calculation
    calculateVisibleItems();

    // Recalculate on resize
    const observer = new ResizeObserver(() => {
      // Reset to full list to re-measure
      setIsCalculating(true);
      setVisibleItems(safeItems);
      setOverflowCount(0);
      // We need to wait for the render to happen before measuring again
      requestAnimationFrame(() => {
        calculateVisibleItems();
      });
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [safeItems]);

  return (
    <div 
      ref={containerRef} 
      className="flex flex-wrap gap-2 mt-1 w-full overflow-hidden h-[26px]"
    >
      {/* 
         We render visible items + badge.
         During calculation (isCalculating), we might render all items momentarily,
         but the overflow-hidden prevents visual layout shift.
      */}
      {(isCalculating ? safeItems : visibleItems).map((highlight, index) => (
        <Badge 
          key={`${highlight}-${index}`} 
          variant="outline" 
          className="text-xs bg-slate-50 border-slate-200 text-slate-700 whitespace-nowrap h-[22px]"
        >
          {highlight}
        </Badge>
      ))}

      {!isCalculating && overflowCount > 0 && (
        <Badge 
          variant="outline" 
          className="text-xs bg-slate-50 border-slate-200 text-slate-700 whitespace-nowrap h-[22px]"
        >
          +{overflowCount}
        </Badge>
      )}
    </div>
  );
}
