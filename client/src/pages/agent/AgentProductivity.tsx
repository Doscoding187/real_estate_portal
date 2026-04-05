import { useMemo, useState } from 'react';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { ArrowRight, Bell, CalendarDays, CheckCircle, Clock, MapPin } from 'lucide-react';
import { ShowingsCalendar } from '@/components/agent/ShowingsCalendar';

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return 'Scheduling pending';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Scheduling pending';

  return date.toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(value: string | Date | null | undefined) {
  if (!value) return 'Recently';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour');
  }

  return formatter.format(Math.round(diffHours / 24), 'day');
}

function getShowingTone(status: string | null | undefined) {
  switch (String(status || '').toLowerCase()) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700';
    case 'cancelled':
    case 'no_show':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-blue-100 text-blue-700';
  }
}

function getNotificationTone(type: string | null | undefined, isRead: boolean) {
  if (isRead) {
    return 'bg-slate-100 text-slate-600';
  }

  switch (type) {
    case 'offer_received':
      return 'bg-amber-100 text-amber-700';
    case 'showing_scheduled':
      return 'bg-violet-100 text-violet-700';
    case 'lead_assigned':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-blue-100 text-blue-700';
  }
}

export default function AgentProductivity() {
  const [activeTab, setActiveTab] = useState('tasks');
  const { isLoading: statusLoading } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });

  const calendarRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, []);

  const { data: showingsData = [], isLoading: showingsLoading } = trpc.agent.getMyShowings.useQuery(
    {
      startDate: calendarRange.startDate,
      endDate: calendarRange.endDate,
      status: 'all',
    },
    {
      enabled: !statusLoading,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const { data: notificationsData = [], isLoading: notificationsLoading } =
    trpc.agent.getNotifications.useQuery(
      {
        limit: 12,
        unreadOnly: false,
      },
      {
        enabled: !statusLoading,
        retry: false,
        refetchOnWindowFocus: false,
      },
    );

  const { data: unreadCount } = trpc.agent.getUnreadNotificationCount.useQuery(undefined, {
    enabled: !statusLoading,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const upcomingShowings = useMemo(
    () =>
      [...showingsData]
        .filter(showing => {
          const scheduledAt = showing.scheduledTime || showing.scheduledAt;
          if (!scheduledAt) return false;
          const scheduledDate = new Date(scheduledAt);
          return !Number.isNaN(scheduledDate.getTime()) && scheduledDate.getTime() >= Date.now();
        })
        .sort((left, right) => {
          const leftTime = new Date(left.scheduledTime || left.scheduledAt || 0).getTime();
          const rightTime = new Date(right.scheduledTime || right.scheduledAt || 0).getTime();
          return leftTime - rightTime;
        }),
    [showingsData],
  );

  const showingsToday = useMemo(() => {
    const today = new Date();

    return upcomingShowings.filter(showing => {
      const scheduledAt = showing.scheduledTime || showing.scheduledAt;
      if (!scheduledAt) return false;
      const scheduledDate = new Date(scheduledAt);
      return !Number.isNaN(scheduledDate.getTime()) && sameDay(scheduledDate, today);
    });
  }, [upcomingShowings]);

  const daysWithAppointments = useMemo(
    () =>
      new Set(
        upcomingShowings.map(showing => {
          const scheduledAt = showing.scheduledTime || showing.scheduledAt;
          const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
          return scheduledDate && !Number.isNaN(scheduledDate.getTime())
            ? scheduledDate.toISOString().split('T')[0]
            : null;
        }),
      ).size,
    [upcomingShowings],
  );

  const actionQueue = useMemo(() => {
    const showingActions = upcomingShowings.slice(0, 4).map(showing => ({
      id: `showing-${showing.id}`,
      title: showing.property?.title || 'Scheduled showing',
      description:
        showing.client?.name && showing.client.name !== 'Prospective buyer'
          ? `Prepare for ${showing.client.name}`
          : 'Scheduled appointment ready for follow-up',
      meta: formatDateTime(showing.scheduledTime || showing.scheduledAt),
      tone: getShowingTone(showing.status),
      badge: String(showing.status || 'scheduled').replace(/_/g, ' '),
      actionLabel: 'Open calendar',
      onAction: () => setActiveTab('calendar'),
    }));

    const notificationActions = notificationsData
      .filter(notification => notification.isRead !== 1)
      .slice(0, 4)
      .map(notification => ({
        id: `notification-${notification.id}`,
        title: notification.title,
        description: notification.content,
        meta: formatRelativeTime(notification.createdAt),
        tone: getNotificationTone(notification.type, notification.isRead === 1),
        badge: 'Unread',
        actionLabel: 'Review alerts',
        onAction: () => setActiveTab('reminders'),
      }));

    return [...showingActions, ...notificationActions].slice(0, 6);
  }, [notificationsData, upcomingShowings]);

  const nextShowing = upcomingShowings[0] || null;
  const unreadAlerts =
    unreadCount?.count ?? notificationsData.filter(item => item.isRead !== 1).length;

  return (
    <AgentAppShell>
      <main className={agentPageStyles.container}>
        {statusLoading ? (
          <AgentFeatureLockedState
            title="Preparing your productivity workspace"
            description="We are confirming your onboarding access before loading live calendar and reminder data."
            actionLabel="Loading"
            onAction={() => {}}
            isLoading
          />
        ) : (
          <>
            <div className={agentPageStyles.header}>
              <div className={agentPageStyles.headingBlock}>
                <h1 className={agentPageStyles.title}>Productivity</h1>
                <p className={agentPageStyles.subtitle}>
                  Live operational view across showings, reminders, and the month calendar.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <Card className={agentPageStyles.statCard}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={agentPageStyles.statLabel}>Scheduled This Month</p>
                      <p className={agentPageStyles.statValue}>
                        {showingsLoading ? '...' : showingsData.length}
                      </p>
                      <p className={cn(agentPageStyles.statSub, 'text-blue-600')}>
                        {daysWithAppointments} active calendar days
                      </p>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-3">
                      <CalendarDays className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={agentPageStyles.statCard}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={agentPageStyles.statLabel}>Showings Today</p>
                      <p className={agentPageStyles.statValue}>
                        {showingsLoading ? '...' : showingsToday.length}
                      </p>
                      <p className={cn(agentPageStyles.statSub, 'text-violet-600')}>
                        {nextShowing
                          ? `Next: ${formatDateTime(nextShowing.scheduledTime)}`
                          : 'No more showings today'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-violet-50 p-3">
                      <MapPin className="h-6 w-6 text-violet-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={agentPageStyles.statCard}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={agentPageStyles.statLabel}>Unread Alerts</p>
                      <p className={agentPageStyles.statValue}>
                        {notificationsLoading ? '...' : unreadAlerts}
                      </p>
                      <p className={cn(agentPageStyles.statSub, 'text-amber-600')}>
                        Real reminders from your notification feed
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3">
                      <Bell className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={agentPageStyles.statCard}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={agentPageStyles.statLabel}>Next Appointment</p>
                      <p className={agentPageStyles.statValue}>
                        {nextShowing ? formatDateTime(nextShowing.scheduledTime) : 'None'}
                      </p>
                      <p className={cn(agentPageStyles.statSub, 'text-emerald-600')}>
                        {nextShowing?.property?.title || 'Calendar is clear for now'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-3">
                      <Clock className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList
                className={cn(agentPageStyles.tabsList, 'grid w-full max-w-2xl grid-cols-4')}
              >
                <TabsTrigger value="tasks" className={agentPageStyles.tabTrigger}>
                  Action Queue
                </TabsTrigger>
                <TabsTrigger value="calendar" className={agentPageStyles.tabTrigger}>
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="showings" className={agentPageStyles.tabTrigger}>
                  Showings
                </TabsTrigger>
                <TabsTrigger value="reminders" className={agentPageStyles.tabTrigger}>
                  Reminders
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="space-y-4">
                <Card className={agentPageStyles.panel}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Action queue</CardTitle>
                      <p className="mt-1 text-sm text-slate-500">
                        Live items from scheduled showings and unread notifications.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className={agentPageStyles.ghostButton}
                      onClick={() => setActiveTab('calendar')}
                    >
                      Open calendar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {actionQueue.length > 0 ? (
                      actionQueue.map(item => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-slate-900">{item.title}</p>
                              <Badge className={item.tone}>{item.badge}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                            <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                              {item.meta}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            className="w-full justify-center rounded-full text-[var(--primary)] hover:text-[var(--primary)] md:w-auto"
                            onClick={item.onAction}
                          >
                            {item.actionLabel}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-900">
                          No urgent actions right now
                        </h3>
                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                          Your action queue will populate from live showings and unread agent alerts
                          instead of placeholder tasks.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="calendar">
                <ShowingsCalendar />
              </TabsContent>

              <TabsContent value="showings" className="space-y-4">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle>Viewing schedule</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {upcomingShowings.length > 0 ? (
                      upcomingShowings.map(showing => (
                        <div
                          key={showing.id}
                          className="rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:bg-slate-50"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold text-slate-900">
                                {showing.property?.title || 'Scheduled showing'}
                              </h3>
                              <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                                <MapPin className="h-3 w-3" />
                                {showing.property?.address ||
                                  showing.property?.city ||
                                  'Location pending'}
                              </p>
                            </div>
                            <Badge className={getShowingTone(showing.status)}>
                              {String(showing.status || 'scheduled').replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                            <div>
                              <p className="text-slate-500">When</p>
                              <p className="font-semibold text-slate-900">
                                {formatDateTime(showing.scheduledTime || showing.scheduledAt)}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Client</p>
                              <p className="font-semibold text-slate-900">
                                {showing.client?.name || 'Prospective buyer'}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Contact</p>
                              <p className="font-semibold text-slate-900">
                                {showing.client?.email || showing.client?.phone || 'Pending'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center">
                        <h3 className="text-lg font-semibold text-slate-900">
                          No upcoming showings
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          New appointments booked through the live showing flow will appear here
                          automatically.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reminders" className="space-y-4">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-amber-600" />
                      Agent reminders
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {notificationsData.length > 0 ? (
                      notificationsData.map(notification => (
                        <div
                          key={notification.id}
                          className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-900">{notification.title}</p>
                                <Badge
                                  className={getNotificationTone(
                                    notification.type,
                                    notification.isRead === 1,
                                  )}
                                >
                                  {notification.isRead === 1 ? 'Read' : 'Unread'}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm text-slate-600">{notification.content}</p>
                              <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                                {formatRelativeTime(notification.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center">
                        <h3 className="text-lg font-semibold text-slate-900">No reminders yet</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Follow-up prompts, offer alerts, and showing updates will appear here as
                          soon as the live notification feed has items for this account.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </AgentAppShell>
  );
}
