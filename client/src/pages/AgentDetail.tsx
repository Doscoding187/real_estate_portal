import { trpc } from '@/lib/trpc';
import { Navbar } from '@/components/Navbar';
import {
  Building2,
  MapPin,
  Star,
  Phone,
  Mail,
  MessageCircle,
  Award,
  Home as HomeIcon,
} from 'lucide-react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// PropertyCard import removed - not needed for agent detail page
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function AgentDetail() {
  const [, params] = useRoute('/agent/:id');
  const agentId = params?.id ? parseInt(params.id) : 0;

  const { data: agent, isLoading } = trpc.agents.getById.useQuery({ id: agentId });
  const { data: reviews } = trpc.reviews.getByTarget.useQuery({
    reviewType: 'agent',
    targetId: agentId,
  });

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const createLead = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success('Message sent successfully!');
      setContactDialogOpen(false);
      setContactForm({ name: '', email: '', phone: '', message: '' });
    },
    onError: () => {
      toast.error('Failed to send message. Please try again.');
    },
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLead.mutate({
      agentId,
      ...contactForm,
      leadType: 'callback',
      source: 'agent_profile',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F4C75]"></div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Agent not found</h2>
            <p className="text-muted-foreground">The agent you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Agent Header */}
        <div className="bg-gradient-to-r from-[#0A2540] to-[#0F4C75] text-white py-12">
          <div className="container">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Agent Avatar */}
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center text-white text-4xl font-bold flex-shrink-0 border-4 border-white/30">
                {agent.firstName.charAt(0)}
                {agent.lastName.charAt(0)}
              </div>

              {/* Agent Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold">
                    {agent.displayName || `${agent.firstName} ${agent.lastName}`}
                  </h1>
                  {agent.isVerified === 1 && <Badge className="bg-green-500">Verified</Badge>}
                </div>

                <div className="flex items-center gap-2 text-lg mb-4">
                  <Building2 className="h-5 w-5" />
                  <span className="capitalize">{agent.role.replace('_', ' ')}</span>
                </div>

                {agent.rating > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${i < Math.floor(agent.rating / 100) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-medium">{(agent.rating / 100).toFixed(1)}</span>
                    <span className="text-gray-200">({agent.reviewCount} reviews)</span>
                  </div>
                )}

                <p className="text-gray-200 max-w-3xl mb-6">
                  {agent.bio ||
                    'Experienced real estate professional ready to help you find your dream property.'}
                </p>

                {/* Contact Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => setContactDialogOpen(true)}
                    className="bg-white text-[#0F4C75] hover:bg-gray-100"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Agent
                  </Button>
                  {agent.phone && (
                    <Button variant="outline" className="border-white text-white hover:bg-white/10">
                      <Phone className="h-4 w-4 mr-2" />
                      {agent.phone}
                    </Button>
                  )}
                  {agent.whatsapp && (
                    <Button variant="outline" className="border-white text-white hover:bg-white/10">
                      WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-[#0F4C75] mb-1">
                      {agent.totalSales || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Properties Sold</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-[#0F4C75] mb-1">
                      {agent.yearsExperience || 0}+
                    </div>
                    <div className="text-sm text-muted-foreground">Years Experience</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-[#0F4C75] mb-1">
                      {agent.reviewCount || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Reviews</div>
                  </CardContent>
                </Card>
              </div>

              {/* Reviews */}
              {reviews && reviews.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Client Reviews</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {reviews.map((review: any) => (
                      <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          {review.isVerified === 1 && (
                            <Badge variant="secondary" className="text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                        {review.title && <h4 className="font-semibold mb-1">{review.title}</h4>}
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agent.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-[#0F4C75]" />
                      <span>{agent.phone}</span>
                    </div>
                  )}
                  {agent.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-[#0F4C75]" />
                      <span className="break-all">{agent.email}</span>
                    </div>
                  )}
                  {agent.licenseNumber && (
                    <div className="flex items-center gap-3">
                      <Award className="h-5 w-5 text-[#0F4C75]" />
                      <span>License: {agent.licenseNumber}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Specialization */}
              {agent.specialization && (
                <Card>
                  <CardHeader>
                    <CardTitle>Specialization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(agent.specialization).map((spec: string, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Areas Served */}
              {agent.areasServed && (
                <Card>
                  <CardHeader>
                    <CardTitle>Areas Served</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {JSON.parse(agent.areasServed).map((area: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#0F4C75]" />
                          <span className="text-sm">{area}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact {agent.firstName}</DialogTitle>
            <DialogDescription>
              Send a message and the agent will get back to you soon.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div>
              <Input
                placeholder="Your Name"
                value={contactForm.name}
                onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="Your Email"
                value={contactForm.email}
                onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Input
                type="tel"
                placeholder="Your Phone (optional)"
                value={contactForm.phone}
                onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Textarea
                placeholder="Your Message"
                value={contactForm.message}
                onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                rows={4}
              />
            </div>
            <Button type="submit" className="w-full" disabled={createLead.isPending}>
              {createLead.isPending ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-[#0A2540] text-white py-8 mt-auto">
        <div className="container text-center text-sm text-gray-400">
          © 2025 Real Estate Portal. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
