import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Calendar, FileText, Mail, MapPin, MessageSquare, Phone, User } from 'lucide-react';

type Lead = {
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
};

interface ClientProfileModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-[#fbfaf7] px-4 py-6 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function ClientProfileModal({ lead, isOpen, onClose }: ClientProfileModalProps) {
  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-lg font-bold">
              {lead.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{lead.name}</h2>
              <p className="text-sm text-gray-500 font-normal">Client Profile</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <User className="h-5 w-5 text-blue-600" />
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
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Source</p>
                    <p className="text-lg font-bold text-gray-900">{lead.source}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-lg font-bold text-gray-900">
                      {new Date(lead.createdAt).toLocaleDateString('en-ZA')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <MapPin className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Budget</p>
                    <p className="text-lg font-bold text-gray-900">{lead.budget}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview">
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

            <TabsContent value="overview" className="space-y-4">
              <Card className="shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        Email
                      </label>
                      <Input value={lead.email} readOnly className="rounded-lg" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        Phone
                      </label>
                      <Input value={lead.phone || 'Not provided'} readOnly className="rounded-lg" />
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
                          </Badge>
                        ))}
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
                          <MapPin className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{lead.property.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {lead.property.city} � {formatCurrency(lead.property.price)}
                          </p>
                          <Button variant="outline" size="sm" className="mt-3" disabled>
                            View Property Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <EmptyPanel
                title="Timeline sync not connected"
                description="Client interaction history will appear here once the CRM timeline is wired in."
              />
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card className="shadow-soft">
                <CardContent className="p-4">
                  <Textarea
                    placeholder="Add a note (coming soon)"
                    className="mb-3 rounded-lg"
                    rows={3}
                    disabled
                  />
                  <Button className="w-full" disabled>
                    <FileText className="h-4 w-4 mr-2" />
                    Save Note
                  </Button>
                </CardContent>
              </Card>
              <EmptyPanel
                title="No notes yet"
                description="Notes will show here once the CRM note stream is connected."
              />
            </TabsContent>

            <TabsContent value="properties">
              <EmptyPanel
                title="Property history not connected"
                description="We will show viewed listings, tours, and saved properties once the client profile sync is wired."
              />
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button className="flex-1" disabled={!lead.phone}>
              <Phone className="h-4 w-4 mr-2" />
              Call Client
            </Button>
            <Button variant="outline" className="flex-1" disabled={!lead.email}>
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            <Button variant="outline" className="flex-1" disabled>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
