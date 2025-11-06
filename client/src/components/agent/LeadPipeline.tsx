import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Droppable, Draggable, DragDropContext } from '@hello-pangea/dnd';
import {
  Users,
  Mail,
  Phone,
  Home,
  Calendar,
  Search,
  Filter,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  source: string | null;
  createdAt: string;
  property?: {
    id: number;
    title: string;
    city: string;
    price: number;
  } | null;
}

interface PipelineColumn {
  id: string;
  title: string;
  leads: Lead[];
  color: string;
}

const PIPELINE_STAGES = [
  { id: 'new', title: 'New Leads', color: 'bg-blue-500' },
  { id: 'contacted', title: 'Contacted', color: 'bg-yellow-500' },
  { id: 'viewing', title: 'Viewing', color: 'bg-purple-500' },
  { id: 'offer', title: 'Offer', color: 'bg-orange-500' },
  { id: 'closed', title: 'Closed', color: 'bg-green-500' },
];

interface LeadPipelineProps {
  className?: string;
}

export function LeadPipeline({ className }: LeadPipelineProps) {
  const [pipeline, setPipeline] = useState<Record<string, PipelineColumn>>({
    new: { id: 'new', title: 'New Leads', leads: [], color: 'bg-blue-500' },
    contacted: { id: 'contacted', title: 'Contacted', leads: [], color: 'bg-yellow-500' },
    viewing: { id: 'viewing', title: 'Viewing', leads: [], color: 'bg-purple-500' },
    offer: { id: 'offer', title: 'Offer', leads: [], color: 'bg-orange-500' },
    closed: { id: 'closed', title: 'Closed', leads: [], color: 'bg-green-500' },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const utils = trpc.useUtils();

  // Fetch leads pipeline
  const { data: pipelineData, isLoading } = trpc.agent.getLeadsPipeline.useQuery({
    filters: {
      source: selectedSource || undefined,
    },
  });

  // Update lead status mutation
  const updateLeadStatusMutation = trpc.agent.moveLeadToStage.useMutation({
    onSuccess: () => {
      toast.success('Lead moved successfully');
      utils.agent.getLeadsPipeline.invalidate();
      utils.agent.getDashboardStats.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to move lead');
    },
  });

  // Update pipeline when data changes
  React.useEffect(() => {
    if (pipelineData) {
      setPipeline({
        new: { id: 'new', title: 'New Leads', leads: pipelineData.new || [], color: 'bg-blue-500' },
        contacted: {
          id: 'contacted',
          title: 'Contacted',
          leads: pipelineData.contacted || [],
          color: 'bg-yellow-500',
        },
        viewing: {
          id: 'viewing',
          title: 'Viewing',
          leads: pipelineData.viewing || [],
          color: 'bg-purple-500',
        },
        offer: {
          id: 'offer',
          title: 'Offer',
          leads: pipelineData.offer || [],
          color: 'bg-orange-500',
        },
        closed: {
          id: 'closed',
          title: 'Closed',
          leads: pipelineData.closed || [],
          color: 'bg-green-500',
        },
      });
    }
  }, [pipelineData]);

  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const sourceColumn = pipeline[source.droppableId];
    const destColumn = pipeline[destination.droppableId];
    const draggedLead = sourceColumn.leads.find(lead => lead.id.toString() === draggableId);

    if (!draggedLead) return;

    // Create new arrays
    const sourceLeads = Array.from(sourceColumn.leads);
    sourceLeads.splice(source.index, 1);

    const destLeads = Array.from(destColumn.leads);
    destLeads.splice(destination.index, 0, draggedLead);

    // Update pipeline state
    setPipeline({
      ...pipeline,
      [source.droppableId]: {
        ...sourceColumn,
        leads: sourceLeads,
      },
      [destination.droppableId]: {
        ...destColumn,
        leads: destLeads,
      },
    });

    // Update lead status on the server
    updateLeadStatusMutation.mutate({
      leadId: draggedLead.id,
      targetStage: destination.droppableId as any,
      notes: `Moved from ${source.droppableId} to ${destination.droppableId}`,
    });
  };

  const filteredLeads = (leads: Lead[]) => {
    if (!searchQuery) return leads;
    return leads.filter(
      lead =>
        lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.property?.title?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Lead Pipeline</h2>
          <Badge variant="secondary">
            {Object.values(pipeline).reduce((sum, col) => sum + col.leads.length, 0)} leads
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm font-medium">Source</label>
                <select
                  value={selectedSource}
                  onChange={e => setSelectedSource(e.target.value)}
                  className="ml-2 px-3 py-1 border rounded text-sm"
                >
                  <option value="">All Sources</option>
                  <option value="website">Website</option>
                  <option value="explore_feed">Explore Feed</option>
                  <option value="agent_profile">Agent Profile</option>
                  <option value="referral">Referral</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-5 gap-4 overflow-x-auto">
          {PIPELINE_STAGES.map(stage => {
            const column = pipeline[stage.id];
            const leads = filteredLeads(column.leads);

            return (
              <div key={stage.id} className="flex flex-col min-w-80">
                <Card className="h-fit">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                      {stage.title}
                      <Badge variant="outline" className="ml-auto">
                        {leads.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-3 min-h-[200px] p-1 rounded transition-colors ${
                            snapshot.isDraggingOver ? 'bg-blue-50' : ''
                          }`}
                        >
                          {leads.map((lead, index) => (
                            <Draggable key={lead.id} draggableId={lead.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`transform transition-transform ${
                                    snapshot.isDragging ? 'rotate-5 scale-105' : ''
                                  }`}
                                >
                                  <LeadCard lead={lead} />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {leads.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No leads</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Lead Name & Contact */}
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-sm">{lead.name || 'Unnamed Lead'}</h4>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(lead.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Property Info */}
          {lead.property && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
              <Home className="h-3 w-3 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{lead.property.title}</p>
                <p className="text-muted-foreground">
                  {lead.property.city} • R{lead.property.price.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-1">
            {lead.email && (
              <div className="flex items-center gap-2 text-xs">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2 text-xs">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span>{lead.phone}</span>
              </div>
            )}
          </div>

          {/* Message Preview */}
          {lead.message && (
            <p className="text-xs text-muted-foreground line-clamp-2">"{lead.message}"</p>
          )}

          {/* Source */}
          {lead.source && (
            <Badge variant="outline" className="text-xs">
              {lead.source}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
