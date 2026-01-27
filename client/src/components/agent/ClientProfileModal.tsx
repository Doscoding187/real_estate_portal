import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  FileText,
  MessageSquare,
  Clock,
  Home,
  TrendingUp,
  Plus,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface Interaction {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'viewing' | 'note';
  title: string;
  description: string;
  date: string;
  outcome?: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
}

interface ClientProfileModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ClientProfileModal({ lead, isOpen, onClose }: ClientProfileModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState('');

  if (!lead) return null;

  // Mock data
  const interactions: Interaction[] = [
    {
      id: '1',
      type: 'call',
      title: 'Initial Contact Call',
      description: 'Discussed property requirements and budget',
      date: '2024-12-01T10:00:00Z',
      outcome: 'Interested in scheduling viewing',
    },
    {
      id: '2',
      type: 'email',
      title: 'Property Brochure Sent',
      description: 'Sent detailed brochure for Camps Bay villa',
      date: '2024-12-01T14:30:00Z',
    },
    {
      id: '3',
      type: 'viewing',
      title: 'Property Viewing',
      description: 'Showed Camps Bay villa, client very interested',
      date: '2024-12-02T11:00:00Z',
      outcome: 'Positive feedback, considering offer',
    },
  ];

  const notes: Note[] = [
    {
      id: '1',
      content: 'Client prefers waterfront properties. Looking to relocate from Johannesburg.',
      createdAt: '2024-12-01T10:30:00Z',
      createdBy: 'You',
    },
    {
      id: '2',
      content: 'Mentioned they have a property to sell first. Timeline: 2-3 months.',
      createdAt: '2024-12-01T15:00:00Z',
      createdBy: 'You',
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call':
        return Phone;
      case 'email':
        return Mail;
      case 'meeting':
        return Users;
      case 'viewing':
        return Home;
      case 'note':
        return FileText;
      default:
        return FileText;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'call':
        return 'bg-blue-100 text-blue-700';
      case 'email':
        return 'bg-purple-100 text-purple-700';
      case 'meeting':
        return 'bg-green-100 text-green-700';
      case 'viewing':
        return 'bg-orange-100 text-orange-700';
      case 'note':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      // Add note logic here
      setNewNote('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
              {lead.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{lead.name}</h2>
              <p className="text-sm text-gray-500 font-normal">Client Profile</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Lead Score</p>
                    <p className="text-lg font-bold text-gray-900">{lead.score}/100</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Interactions</p>
                    <p className="text-lg font-bold text-gray-900">{interactions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Days Active</p>
                    <p className="text-lg font-bold text-gray-900">
                      {Math.floor(
                        (new Date().getTime() - new Date(lead.createdAt).getTime()) /
                          (1000 * 60 * 60 * 24),
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <FileText className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Notes</p>
                    <p className="text-lg font-bold text-gray-900">{notes.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 p-1 bg-gray-100 rounded-xl">
              <TabsTrigger value="overview" className="rounded-lg">
                Overview
              </TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-lg">
                Timeline
              </TabsTrigger>
              <TabsTrigger value="notes" className="rounded-lg">
                Notes
              </TabsTrigger>
              <TabsTrigger value="properties" className="rounded-lg">
                Properties
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card className="shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                      {isEditing ? (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        Email
                      </label>
                      {isEditing ? (
                        <Input defaultValue={lead.email} className="rounded-lg" />
                      ) : (
                        <p className="text-sm text-gray-900 pl-6">{lead.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        Phone
                      </label>
                      {isEditing ? (
                        <Input defaultValue={lead.phone || ''} className="rounded-lg" />
                      ) : (
                        <p className="text-sm text-gray-900 pl-6">{lead.phone || 'Not provided'}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        Budget
                      </label>
                      {isEditing ? (
                        <Input defaultValue={lead.budget} className="rounded-lg" />
                      ) : (
                        <p className="text-sm text-gray-900 pl-6">{lead.budget}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        Source
                      </label>
                      <Badge className="ml-6 bg-blue-100 text-blue-700">{lead.source}</Badge>
                    </div>
                  </div>

                  {lead.message && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-gray-400" />
                        Initial Message
                      </label>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg italic">
                        "{lead.message}"
                      </p>
                    </div>
                  )}

                  {lead.tags && lead.tags.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {lead.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="bg-white">
                            {tag}
                            {isEditing && (
                              <button className="ml-1 hover:text-red-600">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </Badge>
                        ))}
                        {isEditing && (
                          <Button variant="outline" size="sm" className="h-6">
                            <Plus className="h-3 w-3 mr-1" />
                            Add Tag
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {lead.property && (
                <Card className="shadow-soft">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Interested Property
                    </h3>
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-white rounded-lg">
                          <Home className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{lead.property.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {lead.property.city} • R {(lead.property.price / 1000000).toFixed(1)}M
                          </p>
                          <Button variant="outline" size="sm" className="mt-3">
                            View Property Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-4">
              <div className="space-y-4">
                {interactions.map((interaction, index) => {
                  const Icon = getTypeIcon(interaction.type);
                  return (
                    <div key={interaction.id} className="relative">
                      {index !== interactions.length - 1 && (
                        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                      )}
                      <Card className="shadow-soft hover:shadow-hover transition-all">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <div
                              className={cn(
                                'p-3 rounded-full flex-shrink-0 h-12 w-12 flex items-center justify-center',
                                getTypeColor(interaction.type),
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold text-gray-900">
                                    {interaction.title}
                                  </h4>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(interaction.date).toLocaleString()}
                                  </p>
                                </div>
                                <Badge className={getTypeColor(interaction.type)}>
                                  {interaction.type}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {interaction.description}
                              </p>
                              {interaction.outcome && (
                                <div className="mt-2 p-2 bg-green-50 rounded-lg">
                                  <p className="text-xs font-medium text-green-700">
                                    Outcome: {interaction.outcome}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="space-y-4">
              <Card className="shadow-soft">
                <CardContent className="p-4">
                  <Textarea
                    placeholder="Add a new note..."
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    className="mb-3 rounded-lg"
                    rows={3}
                  />
                  <Button onClick={handleAddNote} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {notes.map(note => (
                  <Card key={note.id} className="shadow-soft">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500">
                          {new Date(note.createdAt).toLocaleString()} • {note.createdBy}
                        </p>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-700">{note.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Properties Tab */}
            <TabsContent value="properties">
              <Card className="shadow-soft">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-gray-500">
                    Property history and preferences will appear here
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button className="flex-1 bg-green-600 hover:bg-green-700">
              <Phone className="h-4 w-4 mr-2" />
              Call Client
            </Button>
            <Button variant="outline" className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            <Button variant="outline" className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
