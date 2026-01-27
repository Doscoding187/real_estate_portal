import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  TrendingUp,
  DollarSign,
  Target,
  Plus,
  Mail,
  Phone,
  Calendar,
  Home,
  MessageSquare,
  Eye,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SortableLeadCard } from './SortableLeadCard';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  source: string;
  budget: string;
  property?: {
    title: string;
    city: string;
    price: number;
  };
  createdAt: string;
  lastContact?: string;
  nextFollowUp?: string;
  score: number;
  tags: string[];
}

interface PipelineStage {
  id: string;
  title: string;
  color: string;
  icon: React.ElementType;
  leads: Lead[];
}

const INITIAL_STAGES: PipelineStage[] = [
  {
    id: 'new',
    title: 'New Leads',
    color: 'from-blue-500 to-blue-600',
    icon: Users,
    leads: [],
  },
  {
    id: 'contacted',
    title: 'Contacted',
    color: 'from-yellow-500 to-yellow-600',
    icon: Phone,
    leads: [],
  },
  {
    id: 'viewing',
    title: 'Viewing Scheduled',
    color: 'from-purple-500 to-purple-600',
    icon: Calendar,
    leads: [],
  },
  {
    id: 'offer',
    title: 'Offer Stage',
    color: 'from-orange-500 to-orange-600',
    icon: DollarSign,
    leads: [],
  },
  {
    id: 'closed',
    title: 'Closed Won',
    color: 'from-green-500 to-green-600',
    icon: Target,
    leads: [],
  },
];

interface EnhancedLeadPipelineProps {
  onLeadClick?: (lead: Lead) => void;
  onAddLead?: () => void;
}

export function EnhancedLeadPipeline({ onLeadClick, onAddLead }: EnhancedLeadPipelineProps) {
  // Mock data - replace with real data from tRPC
  const mockLeads: Lead[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '+27 82 123 4567',
      message: 'Interested in luxury properties in Camps Bay',
      source: 'Website',
      budget: 'R 15M - R 20M',
      property: { title: 'Luxury Villa - Camps Bay', city: 'Cape Town', price: 25000000 },
      createdAt: '2024-12-01T10:30:00Z',
      lastContact: '2024-12-01T14:00:00Z',
      nextFollowUp: '2024-12-03T10:00:00Z',
      score: 92,
      tags: ['Hot Lead', 'High Budget'],
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'mchen@company.com',
      phone: '+27 83 456 7890',
      message: 'Looking for investment property',
      source: 'Explore Feed',
      budget: 'R 3M - R 5M',
      property: { title: 'Modern Apartment - Sandton', city: 'Johannesburg', price: 4500000 },
      createdAt: '2024-11-30T09:15:00Z',
      score: 78,
      tags: ['Investor'],
    },
    {
      id: '3',
      name: 'Alice Williams',
      email: 'alice.w@email.com',
      phone: null,
      message: 'First-time buyer looking for family home',
      source: 'Agent Profile',
      budget: 'R 2M - R 3M',
      createdAt: '2024-11-29T16:45:00Z',
      lastContact: '2024-11-30T11:00:00Z',
      score: 65,
      tags: ['First Time Buyer'],
    },
    {
      id: '4',
      name: 'Robert Smith',
      email: 'rob.smith@email.com',
      phone: '+27 84 789 0123',
      message: 'Interested in waterfront properties',
      source: 'Referral',
      budget: 'R 8M - R 12M',
      property: { title: 'Waterfront Penthouse', city: 'Cape Town', price: 12000000 },
      createdAt: '2024-11-28T13:20:00Z',
      nextFollowUp: '2024-12-02T15:00:00Z',
      score: 85,
      tags: ['Referral', 'Hot Lead'],
    },
    {
      id: '5',
      name: 'Emma Brown',
      email: 'emma.brown@email.com',
      phone: '+27 82 234 5678',
      message: 'Ready to make an offer',
      source: 'Website',
      budget: 'R 6M - R 8M',
      property: { title: 'Family Home - Constantia', city: 'Cape Town', price: 7500000 },
      createdAt: '2024-11-27T11:00:00Z',
      lastContact: '2024-12-01T09:00:00Z',
      score: 95,
      tags: ['Hot Lead', 'Ready to Buy'],
    },
  ];

  const [stages, setStages] = useState<PipelineStage[]>(() => {
    // Distribute mock leads across stages
    const distributedStages = [...INITIAL_STAGES];
    distributedStages[0].leads = [mockLeads[0], mockLeads[2]]; // New
    distributedStages[1].leads = [mockLeads[1]]; // Contacted
    distributedStages[2].leads = [mockLeads[3]]; // Viewing
    distributedStages[3].leads = [mockLeads[4]]; // Offer
    distributedStages[4].leads = []; // Closed
    return distributedStages;
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeStageId = findStageByLeadId(active.id as string);
    const overStageId = over.id as string;

    if (activeStageId && activeStageId !== overStageId) {
      setStages(prevStages => {
        const newStages = [...prevStages];
        const activeStageIndex = newStages.findIndex(s => s.id === activeStageId);
        const overStageIndex = newStages.findIndex(s => s.id === overStageId);

        const leadToMove = newStages[activeStageIndex].leads.find(l => l.id === active.id);

        if (leadToMove) {
          // Remove from old stage
          newStages[activeStageIndex].leads = newStages[activeStageIndex].leads.filter(
            l => l.id !== active.id,
          );

          // Add to new stage
          newStages[overStageIndex].leads = [...newStages[overStageIndex].leads, leadToMove];
        }

        return newStages;
      });
    }

    setActiveId(null);
  };

  const findStageByLeadId = (leadId: string): string | null => {
    for (const stage of stages) {
      if (stage.leads.some(lead => lead.id === leadId)) {
        return stage.id;
      }
    }
    return null;
  };

  const getActiveLead = () => {
    if (!activeId) return null;
    for (const stage of stages) {
      const lead = stage.leads.find(l => l.id === activeId);
      if (lead) return lead;
    }
    return null;
  };

  const totalLeads = stages.reduce((sum, stage) => sum + stage.leads.length, 0);
  const totalValue = stages.reduce((sum, stage) => {
    return (
      sum +
      stage.leads.reduce((stageSum, lead) => {
        if (lead.property) {
          return stageSum + lead.property.price;
        }
        return stageSum;
      }, 0)
    );
  }, 0);

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-soft border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{totalLeads}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Pipeline Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  R {(totalValue / 1000000).toFixed(1)}M
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">23%</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Hot Leads</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockLeads.filter(l => l.score >= 80).length}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl">
                <Target className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {stages.map(stage => (
            <div key={stage.id} className="flex flex-col">
              <Card className="shadow-soft hover:shadow-hover transition-all duration-300 flex-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'p-2 rounded-lg bg-gradient-to-br',
                          stage.color,
                          'text-white',
                        )}
                      >
                        <stage.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold text-gray-900">
                          {stage.title}
                        </CardTitle>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {stage.leads.length} lead{stage.leads.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <SortableContext
                    items={stage.leads.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                    id={stage.id}
                  >
                    <div className="space-y-3 min-h-[400px] p-2 bg-gray-50/50 rounded-xl">
                      {stage.leads.map(lead => (
                        <SortableLeadCard
                          key={lead.id}
                          lead={lead}
                          onClick={() => onLeadClick?.(lead)}
                        />
                      ))}
                      {stage.leads.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                          <div className="p-4 bg-gray-100 rounded-full mb-3">
                            <stage.icon className="h-8 w-8" />
                          </div>
                          <p className="text-sm font-medium">No leads yet</p>
                          <p className="text-xs mt-1">Drag leads here</p>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="cursor-grabbing rotate-3">
              <LeadCardContent lead={getActiveLead()!} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function LeadCardContent({ lead, isDragging }: { lead: Lead; isDragging?: boolean }) {
  return (
    <Card
      className={cn(
        'transition-all duration-200',
        isDragging ? 'shadow-hover scale-105' : 'shadow-soft hover:shadow-hover',
      )}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-gray-900">{lead.name}</h4>
              {lead.score >= 80 && (
                <Badge className="bg-red-100 text-red-700 text-xs mt-1">
                  🔥 Hot Lead ({lead.score})
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1">
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </Button>
          </div>

          {/* Property */}
          {lead.property && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Home className="h-3.5 w-3.5 text-blue-600" />
                <p className="font-semibold text-xs text-gray-900">{lead.property.title}</p>
              </div>
              <p className="text-xs text-gray-600">
                {lead.property.city} • R {(lead.property.price / 1000000).toFixed(1)}M
              </p>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Mail className="h-3 w-3 text-gray-400" />
              <span className="truncate">{lead.email}</span>
            </div>
            {lead.phone && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Phone className="h-3 w-3 text-gray-400" />
                <span>{lead.phone}</span>
              </div>
            )}
          </div>

          {/* Budget */}
          <div className="flex items-center gap-2 text-xs">
            <DollarSign className="h-3 w-3 text-green-600" />
            <span className="font-medium text-gray-700">Budget: {lead.budget}</span>
          </div>

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {lead.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs bg-white">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {lead.source}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
