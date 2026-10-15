import { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PIPELINE_STAGES } from '../workspace/constants';
import type { AgencyLead } from '../workspace/types';
import { numberLabel, sourceLabel, toneClasses } from '../workspace/utils';

export function AgencyLeadBoard({
  leads,
  onOpen,
}: {
  leads: AgencyLead[];
  onOpen: (lead: AgencyLead) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const [canScroll, setCanScroll] = useState({ previous: false, next: false });
  const updateScroll = () => {
    const board = boardRef.current;
    if (!board) return;
    const previous = board.scrollLeft > 1;
    const next = board.scrollLeft + board.clientWidth < board.scrollWidth - 1;
    setCanScroll(current =>
      current.previous === previous && current.next === next ? current : { previous, next },
    );
  };
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    updateScroll();
    const observer = new ResizeObserver(updateScroll);
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  const scrollStages = (direction: number) => {
    const board = boardRef.current;
    if (!board) return;
    const columnWidth = board.firstElementChild?.getBoundingClientRect().width || board.clientWidth;
    const gap = Number.parseFloat(getComputedStyle(board).columnGap) || 0;
    board.scrollBy({ left: direction * (columnWidth + gap), behavior: 'auto' });
  };

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p id={`${id}-help`} className="text-xs text-slate-500">
          Swipe or scroll sideways to browse stages.
        </p>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous lead stages"
            aria-controls={`${id}-board`}
            disabled={!canScroll.previous}
            onClick={() => scrollStages(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next lead stages"
            aria-controls={`${id}-board`}
            disabled={!canScroll.next}
            onClick={() => scrollStages(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={boardRef}
        id={`${id}-board`}
        role="region"
        aria-label="Lead pipeline board"
        aria-describedby={`${id}-help`}
        tabIndex={0}
        onScroll={updateScroll}
        className="flex min-w-0 snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-3 motion-reduce:scroll-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {PIPELINE_STAGES.map(stage => {
          const stageLeads = leads.filter(lead => (lead.status || 'new') === stage.key);
          const classes = toneClasses(stage.tone);
          return (
            <section
              key={stage.key}
              aria-labelledby={`${id}-${stage.key}`}
              data-testid="agency-lead-stage"
              data-stage={stage.key}
              className="w-72 max-w-full shrink-0 snap-start self-start rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3
                  id={`${id}-${stage.key}`}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                >
                  <span className={cn('h-2 w-2 rounded-full', classes.dot)} />
                  {stage.label}
                </h3>
                <Badge variant="outline" className="bg-white">
                  {numberLabel(stageLeads.length)}
                </Badge>
              </div>
              <div className="max-h-[min(60vh,36rem)] space-y-2 overflow-y-auto overscroll-y-contain p-0.5">
                {stageLeads.map(lead => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => onOpen(lead)}
                    className="block w-full min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/40"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold text-slate-950">
                        {lead.name || 'Unnamed lead'}
                      </p>
                      {lead.overdueFollowUp && (
                        <Clock3
                          aria-label="Follow-up overdue"
                          className="h-4 w-4 shrink-0 text-rose-500"
                        />
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {lead.email || lead.phone || 'No contact'}
                    </p>
                    {lead.commercial ? (
                      <p className="mt-2 truncate text-xs font-medium text-emerald-700">
                        Commercial · {lead.commercial.listingTitle} ·{' '}
                        {lead.commercial.spaceIdentifier}
                      </p>
                    ) : null}
                    <p className="mt-2 truncate text-xs text-slate-500">
                      {lead.agent?.name || 'Unassigned'} ·{' '}
                      {sourceLabel(lead.leadSource || lead.source)}
                    </p>
                  </button>
                ))}
                {!stageLeads.length && (
                  <p className="py-6 text-center text-sm text-slate-400">No leads</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
