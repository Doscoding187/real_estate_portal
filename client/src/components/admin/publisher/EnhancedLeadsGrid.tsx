import React, { useState, useMemo } from 'react';
import { useDeveloperContext } from '@/contexts/DeveloperContextProvider';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Mail,
  Phone,
  Calendar,
  User,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Home,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { publisherTheme, getStatusColor, animations, cardElevation } from '@/lib/publisherTheme';

interface EnhancedLead {
  id: number;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  developmentId?: number;
  brandLeadStatus: 'captured' | 'claimed' | 'new' | 'qualified' | 'contacted';
  leadSource?: string;
  propertyInterest?: string;
  budgetRange?: string;
  priority?: 'high' | 'medium' | 'low';
  contactAttempts?: number;
  lastContactDate?: string;
  notes?: string;
}

const EnhancedLeadCard: React.FC<{
  lead: EnhancedLead;
  onEdit: (lead: EnhancedLead) => void;
  onDelete: (lead: EnhancedLead) => void;
  onView: (lead: EnhancedLead) => void;
  index: number;
}> = ({ lead, onEdit, onDelete, onView, index }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getStatusInfo = (status: string) => {
    const statusMap = {
      captured: {
        color: 'bg-blue-500',
        bgLight: 'bg-blue-50',
        text: 'text-blue-700',
        label: 'Captured',
        icon: <CheckCircle className="w-3 h-3" />,
      },
      claimed: {
        color: 'bg-green-500',
        bgLight: 'bg-green-50',
        text: 'text-green-700',
        label: 'Claimed',
        icon: <CheckCircle className="w-3 h-3" />,
      },
      new: {
        color: 'bg-amber-500',
        bgLight: 'bg-amber-50',
        text: 'text-amber-700',
        label: 'New',
        icon: <Clock className="w-3 h-3" />,
      },
      qualified: {
        color: 'bg-purple-500',
        bgLight: 'bg-purple-50',
        text: 'text-purple-700',
        label: 'Qualified',
        icon: <CheckCircle className="w-3 h-3" />,
      },
      contacted: {
        color: 'bg-gray-500',
        bgLight: 'bg-gray-50',
        text: 'text-gray-700',
        label: 'Contacted',
        icon: <User className="w-3 h-3" />,
      },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.new;
  };

  const getPriorityColor = (priority: string) => {
    const priorityMap = {
      high: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
      medium: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
      low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    };
    return priorityMap[priority as keyof typeof priorityMap] || priorityMap.medium;
  };

  const statusInfo = getStatusInfo(lead.brandLeadStatus);
  const priorityInfo = lead.priority ? getPriorityColor(lead.priority) : null;

  return (
    <div
      className={cn(
        'group relative bg-white rounded-xl border-2 p-5 transition-all duration-300',
        'hover:shadow-xl hover:-translate-y-1 cursor-pointer',
        isHovered ? cardElevation.colored : 'border-gray-100 hover:border-blue-200',
        animations.fadeIn,
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Indicator Bar */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-1 transition-colors duration-300',
          statusInfo.color,
        )}
      />

      {/* Header with Actions */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-gray-800 leading-tight">{lead.name}</h3>
              {priorityInfo && (
                <Badge
                  className={cn(
                    'text-xs font-semibold px-2 py-0.5',
                    priorityInfo.bg,
                    priorityInfo.text,
                    priorityInfo.border,
                  )}
                >
                  {lead.priority.toUpperCase()} PRIORITY
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-mono text-xs">{lead.email}</span>
            </div>
            {lead.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-mono text-xs">{lead.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        <div
          className={cn(
            'flex items-center gap-2 transition-opacity duration-200',
            isHovered ? 'opacity-100' : 'opacity-0',
          )}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(lead)}
            className="h-8 w-8 hover:bg-blue-50"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 hover:bg-gray-50">
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(lead)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Lead
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(lead)}>
                <Trash2 className="w-4 h-4 mr-2 text-red-600" />
                Delete Lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Lead Details Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {format(new Date(lead.createdAt), 'MMM d, yyyy')}
            </span>
          </div>

          {lead.lastContactDate && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                Last: {format(new Date(lead.lastContactDate), 'MMM d')}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-700">
              {lead.propertyInterest || 'General Inquiry'}
            </span>
          </div>

          {lead.leadSource && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{lead.leadSource}</span>
            </div>
          )}
        </div>
      </div>

      {/* Status and Interest */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <Badge
            className={cn(
              'px-3 py-1.5 text-sm font-semibold border-0 flex items-center gap-1.5',
              statusInfo.bgLight,
              statusInfo.text,
            )}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>

          {/* Development Interest */}
          {lead.developmentId && (
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              <Building2 className="w-3 h-3 mr-1" />
              Development Interest
            </Badge>
          )}
        </div>

        {/* Contact Attempts */}
        {lead.contactAttempts && (
          <div className="text-right">
            <div className="text-xs text-gray-500">Contact Attempts</div>
            <div className="text-lg font-bold text-gray-700">{lead.contactAttempts}</div>
          </div>
        )}
      </div>

      {/* Notes Preview */}
      {lead.notes && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Notes</div>
          <p className="text-sm text-gray-700 line-clamp-2">{lead.notes}</p>
        </div>
      )}
    </div>
  );
};

const EnhancedLeadsGrid: React.FC = () => {
  const { selectedBrandId } = useDeveloperContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const { data: leads, isLoading } = trpc.superAdminPublisher.getBrandLeads.useQuery(
    { brandProfileId: selectedBrandId!, limit: 100 },
    { enabled: !!selectedBrandId },
  );

  // Enhanced leads with mock data for demo
  const enhancedLeads = useMemo(() => {
    return (leads || []).map((lead: any, index) => ({
      ...lead,
      priority: ['high', 'medium', 'low'][index % 3],
      propertyInterest: index % 2 === 0 ? 'Luxury Apartment' : 'Family Home',
      leadSource: index % 3 === 0 ? 'Website' : index % 3 === 1 ? 'Referral' : 'Direct',
      contactAttempts: Math.floor(Math.random() * 5) + 1,
      lastContactDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes:
        index % 3 === 0 ? 'Interested in 2-bedroom units, budget flexible' : 'Follow up required',
    })) as EnhancedLead[];
  }, [leads]);

  // Filter logic
  const filteredLeads = useMemo(() => {
    return enhancedLeads.filter(lead => {
      const matchesSearch =
        !searchTerm ||
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.phone && lead.phone.includes(searchTerm));

      const matchesStatus = selectedStatus === 'all' || lead.brandLeadStatus === selectedStatus;
      const matchesPriority = selectedPriority === 'all' || lead.priority === selectedPriority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [enhancedLeads, searchTerm, selectedStatus, selectedPriority]);

  const stats = useMemo(
    () => ({
      total: enhancedLeads.length,
      new: enhancedLeads.filter(l => l.brandLeadStatus === 'new').length,
      captured: enhancedLeads.filter(l => l.brandLeadStatus === 'captured').length,
      claimed: enhancedLeads.filter(l => l.brandLeadStatus === 'claimed').length,
      highPriority: filteredLeads.filter(l => l.priority === 'high').length,
    }),
    [enhancedLeads, filteredLeads],
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-16">
          <div className="text-center space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
            <h3 className="text-xl font-semibold text-gray-800">Loading Leads...</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Leads Management
          </h2>
          <p className="text-lg text-gray-600">
            Track and manage customer inquiries and conversion opportunities
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={cn(cardElevation.medium, 'border-0')}>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              <p className="text-sm text-gray-600">Total Leads</p>
            </CardContent>
          </Card>
          <Card className={cn(cardElevation.medium, 'border-0')}>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-amber-600">{stats.new}</div>
              <p className="text-sm text-gray-600">New</p>
            </CardContent>
          </Card>
          <Card className={cn(cardElevation.medium, 'border-0')}>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.captured}</div>
              <p className="text-sm text-gray-600">Captured</p>
            </CardContent>
          </Card>
          <Card className={cn(cardElevation.medium, 'border-0')}>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.claimed}</div>
              <p className="text-sm text-gray-600">Claimed</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className={cn(cardElevation.medium, 'border-0')}>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search by name, email, phone..."
                  className="pl-12 h-12 text-base border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="captured">Captured</option>
                  <option value="claimed">Claimed</option>
                  <option value="contacted">Contacted</option>
                </select>

                <select
                  value={selectedPriority}
                  onChange={e => setSelectedPriority(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
                >
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Export Button */}
              <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Active Filters */}
            {(searchTerm || selectedStatus !== 'all' || selectedPriority !== 'all') && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Filters: {filteredLeads.length} of {stats.total} leads
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leads Grid */}
      {filteredLeads.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredLeads.map((lead, index) => (
            <EnhancedLeadCard
              key={lead.id}
              lead={lead}
              index={index}
              onEdit={lead => console.log('Edit lead:', lead)}
              onDelete={lead => console.log('Delete lead:', lead)}
              onView={lead => console.log('View lead:', lead)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Card className="max-w-md mx-auto border-0 shadow-xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                <User className="w-10 h-10 text-gray-400" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-800">
                  {searchTerm ? 'No leads found' : 'No leads yet'}
                </h3>
                <p className="text-gray-600">
                  {searchTerm
                    ? `No leads match "${searchTerm}". Try different search terms.`
                    : 'Start generating leads through property listings and marketing campaigns.'}
                </p>
              </div>

              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                <User className="w-5 h-5 mr-2" />
                {searchTerm ? 'Clear Search' : 'Generate Leads'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EnhancedLeadsGrid;
