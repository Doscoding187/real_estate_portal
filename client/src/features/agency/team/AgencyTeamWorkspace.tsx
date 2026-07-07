import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import {
  AlertTriangle,
  BriefcaseBusiness,
  Calendar,
  ClipboardList,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { trpc } from '@/lib/trpc';
import { EmptyPanel, ErrorPanel, SectionTitle } from '../workspace/WorkspacePrimitives';
import type { WorkspaceContentProps } from '../workspace/types';
import { getInitials, numberLabel } from '../workspace/utils';

type TeamTab = 'members' | 'invitations' | 'workload';
type MemberStatusFilter = 'all' | 'active' | 'suspended' | 'inactive';

function tabFromLocation(location: string): TeamTab {
  if (location.includes('/invitations') || location.includes('/invite')) return 'invitations';
  if (location.includes('/workload') || location.includes('/performance')) return 'workload';
  return 'members';
}

function roleLabel(role?: string | null) {
  if (role === 'agency_admin') return 'Agency admin';
  if (role === 'visitor') return 'No workspace access';
  return String(role || 'agent').replace(/_/g, ' ');
}

function formatDate(value?: string | Date | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadgeClass(status?: string | null) {
  switch (status) {
    case 'active':
    case 'accepted':
      return 'bg-emerald-100 text-emerald-700';
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'suspended':
    case 'cancelled':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function workloadTotal(member: any) {
  const workload = member?.workload || {};
  return (
    Number(workload.assignedActiveLeads || 0) +
    Number(workload.overdueFollowUps || 0) +
    Number(workload.activeListings || 0) +
    Number(workload.pendingListingWork || 0) +
    Number(workload.upcomingViewings || 0)
  );
}

export function AgencyTeamWorkspace(props: WorkspaceContentProps) {
  const utils = trpc.useUtils();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TeamTab>(() => tabFromLocation(location));
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatus, setMemberStatus] = useState<MemberStatusFilter>('all');
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [deactivationMemberId, setDeactivationMemberId] = useState<number | null>(null);
  const [reassignToUserId, setReassignToUserId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'agent' | 'agency_admin'>('agent');

  useEffect(() => {
    setActiveTab(tabFromLocation(location));
  }, [location]);

  const agentsQuery = trpc.agency.listAgents.useQuery();
  const invitationsQuery = trpc.invitation.list.useQuery();
  const members = agentsQuery.data || [];
  const invitations = invitationsQuery.data || [];

  const selectedMember = useMemo(
    () => members.find((member: any) => member.id === selectedMemberId) || null,
    [members, selectedMemberId],
  );

  const assignableMembers = useMemo(
    () =>
      members.filter(
        (member: any) =>
          member.membership?.status === 'active' &&
          member.permissions?.canReceiveLeadAssignments &&
          member.id !== deactivationMemberId,
      ),
    [deactivationMemberId, members],
  );

  const refreshTeam = async () => {
    await Promise.all([
      utils.agency.listAgents.invalidate(),
      utils.agency.listAssignableAgents.invalidate(),
      utils.invitation.list.invalidate(),
      utils.agency.getOnboardingStatus.invalidate(),
      utils.agency.getAgentLeaderboard.invalidate(),
      utils.agency.getDashboardStats.invalidate(),
    ]);
  };

  const updateRole = trpc.agency.updateAgentRole.useMutation({
    onSuccess: async () => {
      await refreshTeam();
      toast.success('Member role updated');
    },
    onError: error => toast.error(error.message || 'Could not update role'),
  });

  const setMembershipStatus = trpc.agency.setAgentMembershipStatus.useMutation({
    onSuccess: async () => {
      await refreshTeam();
      setDeactivationMemberId(null);
      setReassignToUserId('');
      toast.success('Membership updated');
    },
    onError: error => toast.error(error.message || 'Could not update membership'),
  });

  const createInvite = trpc.invitation.create.useMutation({
    onSuccess: async () => {
      await refreshTeam();
      setInviteEmail('');
      setInviteRole('agent');
      toast.success('Invitation created');
    },
    onError: error => toast.error(error.message || 'Could not create invitation'),
  });

  const cancelInvite = trpc.invitation.cancel.useMutation({
    onSuccess: async () => {
      await refreshTeam();
      toast.success('Invitation revoked');
    },
    onError: error => toast.error(error.message || 'Could not revoke invitation'),
  });

  const resendInvite = trpc.invitation.resend.useMutation({
    onSuccess: async () => {
      await refreshTeam();
      toast.success('Invitation resent');
    },
    onError: error => toast.error(error.message || 'Could not resend invitation'),
  });

  const busy =
    updateRole.isPending ||
    setMembershipStatus.isPending ||
    createInvite.isPending ||
    cancelInvite.isPending ||
    resendInvite.isPending;

  const stats = useMemo(() => {
    const active = members.filter((member: any) => member.membership?.status === 'active').length;
    const suspended = members.filter(
      (member: any) => member.membership?.status === 'suspended',
    ).length;
    const admins = members.filter(
      (member: any) =>
        member.role === 'agency_admin' && member.membership?.status === 'active',
    ).length;
    const pendingInvites = invitations.filter((invite: any) => invite.status === 'pending').length;
    const activeLeadLoad = members.reduce(
      (sum: number, member: any) => sum + Number(member.workload?.assignedActiveLeads || 0),
      0,
    );
    return { active, suspended, admins, pendingInvites, activeLeadLoad };
  }, [invitations, members]);

  const filteredMembers = useMemo(() => {
    const search = memberSearch.trim().toLowerCase();
    return members.filter((member: any) => {
      const status = member.membership?.status || 'inactive';
      const matchesStatus = memberStatus === 'all' || status === memberStatus;
      const matchesSearch =
        !search ||
        [member.name, member.email, member.role, member.agentProfile?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [memberSearch, memberStatus, members]);

  const navigateTab = (tab: TeamTab) => {
    setActiveTab(tab);
    if (tab === 'invitations') {
      setLocation('/agency/team/invitations');
    } else if (tab === 'workload') {
      setLocation('/agency/team/workload');
    } else {
      setLocation('/agency/team');
    }
  };

  const requestDeactivate = (member: any) => {
    setSelectedMemberId(member.id);
    setDeactivationMemberId(member.id);
    setReassignToUserId('');
  };

  const confirmDeactivate = () => {
    if (!selectedMember || deactivationMemberId !== selectedMember.id) return;
    setMembershipStatus.mutate({
      userId: selectedMember.id,
      status: 'suspended',
      reassignToUserId: reassignToUserId ? Number(reassignToUserId) : undefined,
    });
  };

  const activeWorkRequiresReassignment =
    Boolean(selectedMember?.workload?.hasActiveWork) &&
    selectedMember?.id === deactivationMemberId;

  return (
    <section className="space-y-5">
      <div className="grid gap-3 md:grid-cols-5">
        <Metric label="Active members" value={stats.active} icon={Users} />
        <Metric label="Agency admins" value={stats.admins} icon={ShieldCheck} />
        <Metric label="Pending invites" value={stats.pendingInvites} icon={Mail} />
        <Metric label="Suspended" value={stats.suspended} icon={AlertTriangle} />
        <Metric label="Active lead load" value={stats.activeLeadLoad} icon={ClipboardList} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(['members', 'invitations', 'workload'] as const).map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => navigateTab(tab)}
            className="capitalize"
          >
            {tab}
          </Button>
        ))}
      </div>

      {activeTab === 'members' ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-3 pb-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionTitle icon={Users} title="Team Operations" eyebrow="Membership and access" />
              <Button onClick={() => navigateTab('invitations')}>
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={memberSearch}
                  onChange={event => setMemberSearch(event.target.value)}
                  placeholder="Search members"
                  className="pl-9"
                />
              </div>
              <select
                value={memberStatus}
                onChange={event => setMemberStatus(event.target.value as MemberStatusFilter)}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="all">All states</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {agentsQuery.error ? <ErrorPanel title="Team could not be loaded" /> : null}
            {agentsQuery.isLoading ? (
              <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
            ) : filteredMembers.length ? (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                {filteredMembers.map((member: any) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    busy={busy}
                    onSelect={() => setSelectedMemberId(member.id)}
                    onRoleChange={role =>
                      updateRole.mutate({ userId: member.id, role: role as 'agent' | 'agency_admin' })
                    }
                    onDeactivate={() => requestDeactivate(member)}
                    onActivate={() =>
                      setMembershipStatus.mutate({
                        userId: member.id,
                        status: 'active',
                        role: member.role === 'agency_admin' ? 'agency_admin' : 'agent',
                      })
                    }
                    onOpenLeads={() => props.setLocation(`/agency/leads?owner=${member.id}`)}
                    onOpenListings={() => props.setLocation(`/agency/listings?owner=${member.id}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyPanel
                icon={Users}
                title="No matching members"
                text="Adjust search or filters, or invite a new team member."
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === 'invitations' ? (
        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <SectionTitle icon={UserPlus} title="Invite Agent" eyebrow="Pending access" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="email"
                value={inviteEmail}
                onChange={event => setInviteEmail(event.target.value)}
                placeholder="agent@example.com"
              />
              <select
                value={inviteRole}
                onChange={event => setInviteRole(event.target.value as 'agent' | 'agency_admin')}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="agent">Agent</option>
                <option value="agency_admin">Agency admin</option>
              </select>
              <Button
                disabled={busy || !inviteEmail.trim()}
                onClick={() => createInvite.mutate({ email: inviteEmail.trim(), role: inviteRole })}
                className="w-full"
              >
                <Mail className="h-4 w-4" />
                Send invitation
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <SectionTitle icon={Mail} title="Invitations" eyebrow="Status and audit" />
            </CardHeader>
            <CardContent>
              {invitationsQuery.error ? <ErrorPanel title="Invitations could not be loaded" /> : null}
              {invitationsQuery.isLoading ? (
                <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
              ) : invitations.length ? (
                <div className="space-y-3">
                  {invitations.map((invite: any) => (
                    <div
                      key={invite.id}
                      className="grid gap-3 rounded-lg border border-slate-200 p-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-slate-950">{invite.email}</p>
                          <Badge variant="outline">{roleLabel(invite.role)}</Badge>
                          <Badge className={statusBadgeClass(invite.status)}>{invite.status}</Badge>
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                          <Calendar className="h-3.5 w-3.5" />
                          Sent {formatDate(invite.createdAt)} · Expires {formatDate(invite.expiresAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Audit: {(invite.history || []).map((item: any) => item.event).join(' -> ')}
                        </p>
                      </div>
                      {invite.status === 'pending' ? (
                        <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => resendInvite.mutate({ invitationId: invite.id })}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Resend
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => cancelInvite.mutate({ invitationId: invite.id })}
                          >
                            <X className="h-4 w-4" />
                            Revoke
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyPanel icon={UserPlus} title="No invitations yet" text="Send an invitation to add agents." />
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === 'workload' ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <SectionTitle icon={BriefcaseBusiness} title="Workload" eyebrow="Operational ownership" />
          </CardHeader>
          <CardContent>
            {agentsQuery.isLoading ? (
              <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
            ) : members.length ? (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                {members
                  .slice()
                  .sort((a: any, b: any) => workloadTotal(b) - workloadTotal(a))
                  .map((member: any) => (
                    <div
                      key={member.id}
                      className="grid gap-3 border-t border-slate-200 px-4 py-3 first:border-t-0 lg:grid-cols-[minmax(0,1fr)_repeat(5,105px)] lg:items-center"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedMemberId(member.id)}
                        className="min-w-0 text-left"
                      >
                        <p className="truncate font-semibold text-slate-950">{member.name}</p>
                        <p className="text-sm text-slate-500">{roleLabel(member.role)}</p>
                      </button>
                      <WorkloadCell label="Leads" value={member.workload?.assignedActiveLeads} />
                      <WorkloadCell label="Overdue" value={member.workload?.overdueFollowUps} />
                      <WorkloadCell label="Listings" value={member.workload?.activeListings} />
                      <WorkloadCell label="Pending" value={member.workload?.pendingListingWork} />
                      <WorkloadCell label="Viewings" value={member.workload?.upcomingViewings} />
                    </div>
                  ))}
              </div>
            ) : (
              <EmptyPanel icon={Users} title="No workload yet" text="Team workload appears after members own leads or listings." />
            )}
          </CardContent>
        </Card>
      ) : null}

      <Sheet open={Boolean(selectedMember)} onOpenChange={open => !open && setSelectedMemberId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selectedMember ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedMember.name}</SheetTitle>
                <SheetDescription>{selectedMember.email}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={statusBadgeClass(selectedMember.membership?.status)}>
                    {selectedMember.membership?.status || 'inactive'}
                  </Badge>
                  <Badge variant="outline">{roleLabel(selectedMember.role)}</Badge>
                  {selectedMember.agentProfile ? (
                    <Badge className="bg-teal-100 text-teal-700">Agent profile</Badge>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <WorkloadTile label="Active leads" value={selectedMember.workload?.assignedActiveLeads} />
                  <WorkloadTile label="Overdue follow-ups" value={selectedMember.workload?.overdueFollowUps} />
                  <WorkloadTile label="Active listings" value={selectedMember.workload?.activeListings} />
                  <WorkloadTile label="Pending listing work" value={selectedMember.workload?.pendingListingWork} />
                  <WorkloadTile label="Upcoming viewings" value={selectedMember.workload?.upcomingViewings} />
                  <WorkloadTile label="Joined" value={formatDate(selectedMember.createdAt)} text />
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="font-semibold text-slate-950">Access model</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Account, public agent profile, agency role, and subscription capability are managed
                    separately. This member's workspace access comes from server-owned agency membership
                    state, not hidden controls.
                  </p>
                </div>

                {selectedMember.id === deactivationMemberId ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      <div>
                        <p className="font-semibold text-amber-900">Deactivate member</p>
                        <p className="mt-1 text-sm leading-6 text-amber-800">
                          Active operational work must be reassigned before this member loses access.
                        </p>
                      </div>
                    </div>
                    {activeWorkRequiresReassignment ? (
                      <select
                        value={reassignToUserId}
                        onChange={event => setReassignToUserId(event.target.value)}
                        className="mt-3 h-10 w-full rounded-md border border-amber-200 bg-white px-3 text-sm"
                      >
                        <option value="">Select reassignment target</option>
                        {assignableMembers.map((member: any) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        disabled={busy || (activeWorkRequiresReassignment && !reassignToUserId)}
                        onClick={confirmDeactivate}
                      >
                        Confirm deactivation
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setDeactivationMemberId(null);
                          setReassignToUserId('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => props.setLocation(`/agency/leads?owner=${selectedMember.id}`)}>
                      Open leads
                    </Button>
                    <Button variant="outline" onClick={() => props.setLocation(`/agency/listings?owner=${selectedMember.id}`)}>
                      Open listings
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <Icon className="h-4 w-4 text-teal-700" />
        </div>
        <p className="mt-2 text-2xl font-semibold text-slate-950">{numberLabel(value)}</p>
      </CardContent>
    </Card>
  );
}

function MemberRow({
  member,
  busy,
  onSelect,
  onRoleChange,
  onDeactivate,
  onActivate,
  onOpenLeads,
  onOpenListings,
}: {
  member: any;
  busy: boolean;
  onSelect: () => void;
  onRoleChange: (role: string) => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onOpenLeads: () => void;
  onOpenListings: () => void;
}) {
  const status = member.membership?.status || 'inactive';
  const isSuspended = status === 'suspended';

  return (
    <div className="grid gap-3 border-t border-slate-200 px-4 py-3 first:border-t-0 xl:grid-cols-[minmax(0,1.4fr)_260px_210px_230px] xl:items-center">
      <button type="button" onClick={onSelect} className="flex min-w-0 items-center gap-3 text-left">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-teal-50 font-semibold text-teal-700">
            {getInitials(member.name || member.email)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-slate-950">{member.name}</p>
            <Badge className={statusBadgeClass(status)}>{status}</Badge>
          </div>
          <p className="mt-1 truncate text-sm text-slate-500">
            {member.email} · Joined {formatDate(member.createdAt)}
          </p>
        </div>
      </button>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <MiniCount label="Leads" value={member.workload?.assignedActiveLeads} />
        <MiniCount label="Listings" value={member.workload?.activeListings} />
        <MiniCount label="Due" value={member.workload?.overdueFollowUps} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onOpenLeads}>
          Leads
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenListings}>
          Listings
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
        <select
          value={member.role === 'agency_admin' ? 'agency_admin' : 'agent'}
          disabled={busy || isSuspended}
          onChange={event => onRoleChange(event.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
        >
          <option value="agent">Agent</option>
          <option value="agency_admin">Admin</option>
        </select>
        {isSuspended ? (
          <Button variant="outline" size="sm" disabled={busy} onClick={onActivate}>
            <RotateCcw className="h-4 w-4" />
            Activate
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={busy} onClick={onDeactivate}>
            <X className="h-4 w-4" />
            Deactivate
          </Button>
        )}
      </div>
    </div>
  );
}

function MiniCount({ label, value }: { label: string; value: number | string | null | undefined }) {
  return (
    <div className="rounded-md border border-slate-200 px-2 py-1.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-950">{numberLabel(Number(value || 0))}</p>
    </div>
  );
}

function WorkloadCell({ label, value }: { label: string; value: number | string | null | undefined }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2 text-sm lg:bg-transparent lg:px-0">
      <p className="text-xs text-slate-500 lg:hidden">{label}</p>
      <p className="font-semibold text-slate-950">{numberLabel(Number(value || 0))}</p>
    </div>
  );
}

function WorkloadTile({
  label,
  value,
  text,
}: {
  label: string;
  value: number | string | null | undefined;
  text?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">
        {text ? value || 'Not recorded' : numberLabel(Number(value || 0))}
      </p>
    </div>
  );
}
