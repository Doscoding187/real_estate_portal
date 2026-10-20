import { useState } from 'react';
import {
  calendarTimestamp,
  calendarDayKey,
  calendarDateTimeInput,
  calendarDays,
  calendarDateRange,
} from '@/lib/agentCalendar';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Phone,
  Mail,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface ShowingProperty {
  id?: number | null;
  title?: string | null;
  address?: string | null;
  city?: string | null;
}

interface Showing {
  id: number;
  listingId: number | null;
  leadId?: number | null;
  scheduledAt: string | Date | null;
  durationMinutes?: number | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  property?: ShowingProperty | null;
  client?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

interface CalendarViewProps {
  className?: string;
  initialDate?: Date | null;
  initialBookingOpen?: boolean;
}

const VIEW_MODES = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
] as const;

type ViewMode = (typeof VIEW_MODES)[number]['id'];

function getShowingScheduledDate(showing: Showing): Date | null {
  const value = showing.scheduledAt;
  if (!value) return null;

  return calendarTimestamp(value);
}

function formatShowingTime(showing: Showing) {
  const date = getShowingScheduledDate(showing);
  if (!date) return 'Scheduling pending';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShowingDateTime(showing: Showing) {
  const date = getShowingScheduledDate(showing);
  return date ? date.toLocaleString() : 'Scheduling pending';
}

export function ShowingsCalendar({
  className,
  initialDate,
  initialBookingOpen = false,
}: CalendarViewProps) {
  const [, setLocation] = useLocation();
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    initialBookingOpen ? null : initialDate || null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'cancelled' | 'completed' | 'scheduled' | 'no_show' | ''
  >('');
  const [isBookingOpen, setIsBookingOpen] = useState(initialBookingOpen);
  const bookingDate = new Date(initialDate || currentDate);
  bookingDate.setHours(9, 0, 0, 0);
  const [bookingForm, setBookingForm] = useState({
    listingId: '',
    visitorName: '',
    scheduledAt: initialBookingOpen ? calendarDateTimeInput(bookingDate) : '',
    durationMinutes: '30',
    notes: '',
  });

  const utils = trpc.useUtils();

  const dateRange = calendarDateRange(currentDate, viewMode);

  // Fetch showings for the current date range
  const {
    data: showings = [],
    isLoading,
    error: showingsError,
  } = trpc.agent.getMyShowings.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    status: statusFilter || undefined,
  });
  const { data: availableListings = [] } = trpc.agent.getShowingListingOptions.useQuery();
  const resolvedListings = availableListings;
  const { data: pipeline } = trpc.agent.getLeadsPipeline.useQuery({ filters: {} });
  const leads = pipeline ? Object.values(pipeline).flat() : [];

  // Update showing status mutation
  const updateShowingStatusMutation = trpc.agent.updateShowingStatus.useMutation({
    onSuccess: () => {
      toast.success('Showing status updated');
      utils.agent.getMyShowings.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to update showing status');
    },
  });
  const bookShowingMutation = trpc.agent.bookShowing.useMutation({
    onSuccess: () => {
      toast.success('Showing booked');
      utils.agent.getMyShowings.invalidate();
      setIsBookingOpen(false);
      setBookingForm({
        listingId: '',
        visitorName: '',
        scheduledAt: '',
        durationMinutes: '30',
        notes: '',
      });
    },
    onError: error => {
      toast.error(error.message || 'Failed to book showing');
    },
  });

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    switch (viewMode) {
      case 'month':
        newDate.setDate(1);
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }

    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const openBookingDialog = () => {
    const nextDate = selectedDate || currentDate;
    const defaultDateTime = new Date(nextDate);
    defaultDateTime.setHours(9, 0, 0, 0);

    setBookingForm(prev => ({
      ...prev,
      scheduledAt: prev.scheduledAt || calendarDateTimeInput(defaultDateTime),
    }));
    setIsBookingOpen(true);
  };

  // Resolve display context through existing owned inventory and lead identities.
  const resolvedShowings: Showing[] = showings
    .filter(showing => Boolean(getShowingScheduledDate(showing)))
    .map(showing => {
      const listing = resolvedListings.find(listing => listing.id === showing.listingId);
      const lead = leads.find(lead => lead.id === showing.leadId);
      return {
        ...showing,
        property: showing.property ?? listing ?? null,
        client:
          showing.client ??
          (lead ? { name: lead.name, email: lead.email, phone: lead.phone } : null),
      };
    });

  const filteredShowings = resolvedShowings.filter(showing => {
    const query = searchQuery.trim().toLowerCase();
    return (
      !query ||
      showing.property?.title?.toLowerCase().includes(query) ||
      showing.client?.name?.toLowerCase().includes(query)
    );
  });

  const getShowingsForDate = (date: Date) =>
    filteredShowings.filter(showing => {
      const scheduledDate = getShowingScheduledDate(showing);
      return scheduledDate && calendarDayKey(scheduledDate) === calendarDayKey(date);
    });

  const showingTitle = (showing: Showing) =>
    showing.property?.title ||
    (showing.listingId ? `Listing #${showing.listingId}` : 'Property viewing');
  const updateStatus = (showingId: number, status: Showing['status']) =>
    updateShowingStatusMutation.mutate({ showingId, status });

  const renderCalendar = () => (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {calendarDays(currentDate, viewMode).map(date => {
          const dayShowings = getShowingsForDate(date);
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = calendarDayKey(date) === calendarDayKey(new Date());
          const fullDate = date.toLocaleDateString('en-ZA', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
          return (
            <button
              type="button"
              key={calendarDayKey(date)}
              aria-label={`${fullDate}, ${dayShowings.length} ${dayShowings.length === 1 ? 'viewing' : 'viewings'}`}
              className={`flex min-w-0 min-h-24 flex-col items-stretch border-b border-r border-slate-200 p-1.5 text-left align-top transition hover:bg-blue-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-h-36 sm:p-2 ${!isCurrentMonth ? 'bg-slate-50 text-slate-400' : ''} ${isToday ? 'bg-blue-50/60' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <span
                className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? 'bg-primary text-white' : ''}`}
              >
                {date.getDate()}
              </span>
              <span className="block space-y-1">
                {dayShowings.slice(0, 2).map(showing => (
                  <span
                    key={showing.id}
                    title={`${formatShowingTime(showing)} · ${showingTitle(showing)}`}
                    className={`block min-w-0 rounded-md border p-1 text-[10px] leading-tight sm:text-xs ${getStatusColor(showing.status)}`}
                  >
                    <span className="block font-semibold">{formatShowingTime(showing)}</span>
                    <span className="hidden sm:line-clamp-2">{showingTitle(showing)}</span>
                    <span className="hidden truncate opacity-80 lg:block">
                      {showing.client?.name}
                    </span>
                    <span className="sm:hidden">Viewing</span>
                  </span>
                ))}
                {dayShowings.length > 2 && (
                  <span className="block text-[10px] font-medium text-primary sm:text-xs">
                    +{dayShowings.length - 2} more
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Showings Calendar</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openBookingDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Book Showing
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search properties or visitors..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-56"
            />
          </div>
          <select
            aria-label="Filter showing status"
            value={statusFilter}
            onChange={e =>
              setStatusFilter(
                e.target.value as '' | 'cancelled' | 'completed' | 'scheduled' | 'no_show',
              )
            }
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                aria-label="Previous period"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label="Next period"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>

            <h3 className="text-base font-semibold sm:text-lg">
              {currentDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
                ...(viewMode !== 'month' && { day: 'numeric' }),
              })}
            </h3>

            <div className="flex gap-1">
              {VIEW_MODES.map(mode => (
                <Button
                  key={mode.id}
                  variant={viewMode === mode.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewMode(mode.id);
                    setSelectedDate(null);
                  }}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid or List View */}
      {showingsError ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <div className="space-y-3">
              <p>
                {showingsError.message?.includes('Agent profile not found')
                  ? 'Complete your agent profile to unlock the calendar.'
                  : 'Unable to load showings right now.'}
              </p>
              {showingsError.message?.includes('Agent profile not found') ? (
                <Button onClick={() => setLocation('/agent/setup')}>Finish setup</Button>
              ) : (
                <Button variant="outline" onClick={() => utils.agent.getMyShowings.invalidate()}>
                  Retry
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Loading showings...
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode !== 'day' ? (
            renderCalendar()
          ) : (
            <div className="space-y-3">
              {getShowingsForDate(currentDate).map(showing => (
                <ShowingCard
                  key={showing.id}
                  showing={showing}
                  onStatusUpdate={updateStatus}
                  isUpdating={updateShowingStatusMutation.isPending}
                />
              ))}
              {getShowingsForDate(currentDate).length === 0 && (
                <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                  No viewings for this date.
                </p>
              )}
            </div>
          )}
          {viewMode !== 'day' && (
            <p className="text-sm text-muted-foreground">
              Select a date to see its viewings and record an outcome.
            </p>
          )}
        </>
      )}

      <Dialog
        open={Boolean(selectedDate)}
        onOpenChange={open => {
          if (!open) setSelectedDate(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDate?.toLocaleDateString('en-ZA', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </DialogTitle>
            <DialogDescription>
              Viewings scheduled for this date. Record an outcome after the appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {isLoading && <p className="text-muted-foreground">Loading viewings...</p>}
            {showingsError && (
              <p className="text-muted-foreground">
                Unable to load viewings. Close this window and retry.
              </p>
            )}
            {!isLoading &&
              !showingsError &&
              selectedDate &&
              getShowingsForDate(selectedDate).map(showing => (
                <ShowingCard
                  key={showing.id}
                  showing={showing}
                  onStatusUpdate={updateStatus}
                  isUpdating={updateShowingStatusMutation.isPending}
                />
              ))}
            {!isLoading &&
              !showingsError &&
              selectedDate &&
              getShowingsForDate(selectedDate).length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                  No viewings for this date.
                </p>
              )}
            <Button
              variant="outline"
              onClick={() => {
                openBookingDialog();
                setSelectedDate(null);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Book a viewing on this date
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Book Showing</DialogTitle>
            <DialogDescription>
              Choose a property, visitor and time for the viewing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Listing</label>
              {availableListings.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  No published properties are available for booking. Publish a listing first.
                </div>
              ) : null}
              <select
                value={bookingForm.listingId}
                onChange={e =>
                  setBookingForm(prev => ({
                    ...prev,
                    listingId: e.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Select listing</option>
                {resolvedListings.map((listing: ShowingProperty, index: number) => (
                  <option key={listing.id ?? `listing-${index}`} value={String(listing.id ?? '')}>
                    {listing.title} {listing.city ? `- ${listing.city}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Visitor name</label>
                <Input
                  value={bookingForm.visitorName}
                  onChange={e => setBookingForm(prev => ({ ...prev, visitorName: e.target.value }))}
                  placeholder="Prospective buyer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (minutes)</label>
                <Input
                  type="number"
                  min={15}
                  max={240}
                  step={15}
                  value={bookingForm.durationMinutes}
                  onChange={e =>
                    setBookingForm(prev => ({ ...prev, durationMinutes: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Scheduled for</label>
              <Input
                type="datetime-local"
                value={bookingForm.scheduledAt}
                onChange={e => setBookingForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={bookingForm.notes}
                onChange={e => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Access notes, visitor context, or follow-up details"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsBookingOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  bookShowingMutation.mutate({
                    listingId: Number(bookingForm.listingId),
                    visitorName: bookingForm.visitorName.trim(),
                    scheduledAt: new Date(bookingForm.scheduledAt).toISOString(),
                    durationMinutes: Number(bookingForm.durationMinutes || 30),
                    notes: bookingForm.notes.trim() || undefined,
                  })
                }
                disabled={
                  bookShowingMutation.isPending ||
                  availableListings.length === 0 ||
                  !bookingForm.listingId ||
                  !bookingForm.visitorName.trim() ||
                  !bookingForm.scheduledAt
                }
              >
                {bookShowingMutation.isPending ? 'Booking...' : 'Save Showing'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ShowingCardProps {
  showing: Showing;
  onStatusUpdate: (showingId: number, status: Showing['status']) => void;
  isUpdating: boolean;
}

function ShowingCard({ showing, onStatusUpdate, isUpdating }: ShowingCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h4 className="font-semibold">
                {showing.property?.title ||
                  (showing.listingId ? `Listing #${showing.listingId}` : 'Property viewing')}
              </h4>
              <Badge className={`${getStatusColor(showing.status)}`}>{showing.status}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatShowingDateTime(showing)}
                </div>
                {(showing.property?.address || showing.property?.city) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {[showing.property?.address, showing.property?.city].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>

              {showing.client && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {showing.client.name}
                  </div>
                  {showing.client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {showing.client.email}
                    </div>
                  )}
                  {showing.client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {showing.client.phone}
                    </div>
                  )}
                </div>
              )}
            </div>

            {showing.notes && (
              <div className="mt-2 text-sm">
                <strong>Notes:</strong> {showing.notes}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-col sm:shrink-0">
            {showing.status === 'scheduled' && (
              <Button
                size="sm"
                onClick={() => onStatusUpdate(showing.id, 'completed')}
                disabled={isUpdating}
              >
                Complete
              </Button>
            )}
            {showing.status === 'scheduled' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusUpdate(showing.id, 'cancelled')}
                disabled={isUpdating}
              >
                Cancel
              </Button>
            )}
            {showing.status === 'scheduled' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusUpdate(showing.id, 'no_show')}
                disabled={isUpdating}
              >
                No Show
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'no_show':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
