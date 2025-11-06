import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Filter,
  Search,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Showing {
  id: number;
  propertyId: number;
  leadId: number | null;
  scheduledAt: string;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
  property?: {
    id: number;
    title: string;
    address: string;
    city: string;
  } | null;
  client?: {
    name: string;
    email: string;
    phone: string;
  } | null;
}

interface CalendarViewProps {
  className?: string;
}

const VIEW_MODES = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
] as const;

type ViewMode = (typeof VIEW_MODES)[number]['id'];

export function ShowingsCalendar({ className }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'cancelled' | 'completed' | 'requested' | 'confirmed' | ''
  >('');

  const utils = trpc.useUtils();

  // Get start and end dates for current view
  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    switch (viewMode) {
      case 'month':
        start.setDate(1);
        start.setDate(start.getDate() - start.getDay());
        end.setMonth(end.getMonth() + 1, 0);
        end.setDate(end.getDate() + (6 - end.getDay()));
        break;
      case 'week':
        start.setDate(start.getDate() - start.getDay());
        end.setDate(start.getDate() + 6);
        break;
      case 'day':
        // Single day view
        break;
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  // Fetch showings for the current date range
  const { data: showings, isLoading } = trpc.agent.getMyShowings.useQuery({
    startDate: getDateRange().start,
    endDate: getDateRange().end,
    status: statusFilter || undefined,
  });

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

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    switch (viewMode) {
      case 'month':
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
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getShowingsForDate = (date: Date) => {
    if (!showings) return [];

    const dateStr = date.toISOString().split('T')[0];
    return showings.filter((showing: any) => {
      const showingDate = new Date(showing.scheduledAt).toISOString().split('T')[0];
      return showingDate === dateStr;
    });
  };

  const filteredShowings =
    showings?.filter((showing: any) => {
      if (
        searchQuery &&
        !showing.property?.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !showing.client?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderMonthView = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startOfCalendar = new Date(startOfMonth);
    startOfCalendar.setDate(startOfCalendar.getDate() - startOfCalendar.getDay());

    const days = [];
    const today = new Date();

    for (let i = 0; i < 42; i++) {
      const date = new Date(startOfCalendar);
      date.setDate(startOfCalendar.getDate() + i);

      const dayShowings = getShowingsForDate(date);
      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      days.push(
        <div
          key={i}
          className={`min-h-32 p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
            !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
          } ${isToday ? 'bg-blue-50' : ''} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setSelectedDate(date)}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : ''}`}>
            {date.getDate()}
          </div>
          <div className="space-y-1">
            {dayShowings.slice(0, 3).map((showing: any) => (
              <div
                key={showing.id}
                className={`text-xs p-1 rounded truncate border ${getStatusColor(showing.status)}`}
                title={`${showing.property?.title || 'Property'} - ${new Date(showing.scheduledAt).toLocaleTimeString()}`}
              >
                <div className="font-medium">
                  {new Date(showing.scheduledAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="truncate">{showing.property?.title || 'Property'}</div>
              </div>
            ))}
            {dayShowings.length > 3 && (
              <div className="text-xs text-gray-500">+{dayShowings.length - 3} more</div>
            )}
          </div>
        </div>,
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-100 p-3 text-center text-sm font-medium">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  const renderShowingsList = () => {
    if (!selectedDate) return null;

    const dayShowings = getShowingsForDate(selectedDate);

    if (dayShowings.length === 0) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No showings scheduled for {selectedDate.toLocaleDateString()}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Showings for {selectedDate.toLocaleDateString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dayShowings.map((showing: any) => (
              <ShowingCard
                key={showing.id}
                showing={showing}
                onStatusUpdate={(showingId, status) =>
                  updateShowingStatusMutation.mutate({ showingId, status })
                }
                isUpdating={updateShowingStatusMutation.isPending}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Showings Calendar</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="">All Statuses</option>
            <option value="requested">Requested</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>

            <h3 className="text-lg font-semibold">
              {currentDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
                ...(viewMode === 'week' && { day: 'numeric' }),
              })}
            </h3>

            <div className="flex gap-1">
              {VIEW_MODES.map(mode => (
                <Button
                  key={mode.id}
                  variant={viewMode === mode.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode(mode.id)}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid or List View */}
      {viewMode === 'month' && renderMonthView()}

      {/* Selected Date Showings */}
      {selectedDate && renderShowingsList()}

      {/* All Showings List */}
      {!selectedDate && filteredShowings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Showings ({filteredShowings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredShowings.map((showing: any) => (
                <ShowingCard
                  key={showing.id}
                  showing={showing}
                  onStatusUpdate={(showingId, status) =>
                    updateShowingStatusMutation.mutate({ showingId, status })
                  }
                  isUpdating={updateShowingStatusMutation.isPending}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface ShowingCardProps {
  showing: any;
  onStatusUpdate: (showingId: number, status: string) => void;
  isUpdating: boolean;
}

function ShowingCard({ showing, onStatusUpdate, isUpdating }: ShowingCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold">{showing.property?.title || 'Property Showing'}</h4>
              <Badge className={`${getStatusColor(showing.status)}`}>{showing.status}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {new Date(showing.scheduledAt).toLocaleString()}
                </div>
                {showing.property && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {showing.property.address}, {showing.property.city}
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

          <div className="flex flex-col gap-2 ml-4">
            {showing.status === 'requested' && (
              <Button
                size="sm"
                onClick={() => onStatusUpdate(showing.id, 'confirmed')}
                disabled={isUpdating}
              >
                Confirm
              </Button>
            )}
            {showing.status === 'confirmed' && (
              <Button
                size="sm"
                onClick={() => onStatusUpdate(showing.id, 'completed')}
                disabled={isUpdating}
              >
                Complete
              </Button>
            )}
            {(showing.status === 'requested' || showing.status === 'confirmed') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusUpdate(showing.id, 'cancelled')}
                disabled={isUpdating}
              >
                Cancel
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
    case 'requested':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
