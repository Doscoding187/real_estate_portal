import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Phone, Mail, Send, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface PropertyContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: number;
  propertyTitle: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  agentId?: number;
  agencyId?: number;
  developerBrandProfileId?: number;
  developmentId?: number;
  initialMessage?: string;
  source?: string;
  submitLabel?: string;
  successMessage?: string;
  successAction?: {
    type: 'whatsapp';
    phone: string;
    message?: string;
  };
  affordabilityData?: {
    monthlyIncome?: number;
    monthlyExpenses?: number;
    monthlyDebts?: number;
    availableDeposit?: number;
    maxAffordable?: number;
    calculatedAt?: string;
  };
}

type InquiryType = 'general' | 'viewing' | 'offer' | 'financing';

interface ContactFormState {
  name: string;
  email: string;
  phone: string;
  inquiryType: InquiryType;
  message: string;
}

export function PropertyContactModal({
  isOpen,
  onClose,
  propertyId,
  propertyTitle,
  agentName = 'Listing Contact',
  agentPhone,
  agentEmail,
  agentId,
  agencyId,
  developerBrandProfileId,
  developmentId,
  initialMessage,
  source = 'property_search',
  submitLabel = 'Send Inquiry',
  successMessage = 'Your inquiry has been sent successfully!',
  successAction,
  affordabilityData,
}: PropertyContactModalProps) {
  const [formData, setFormData] = useState<ContactFormState>({
    name: '',
    email: '',
    phone: '',
    inquiryType: 'general',
    message: initialMessage || '',
  });

  const buildWhatsAppUrl = (phone: string, message?: string) => {
    const digits = phone.replace(/[^\d+]/g, '');
    if (!digits) return null;

    const params = new URLSearchParams();
    if (message?.trim()) {
      params.set('text', message.trim());
    }

    const query = params.toString();
    return `https://wa.me/${digits.replace(/^\+/, '')}${query ? `?${query}` : ''}`;
  };

  useEffect(() => {
    if (!isOpen) return;

    setFormData(prev => ({
      ...prev,
      message: initialMessage || '',
    }));
  }, [initialMessage, isOpen]);

  const createLeadMutation = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success(successMessage);

      if (successAction?.type === 'whatsapp') {
        const whatsappUrl = buildWhatsAppUrl(successAction.phone, successAction.message);
        if (whatsappUrl) {
          window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        }
      }

      setFormData({
        name: '',
        email: '',
        phone: '',
        inquiryType: 'general',
        message: '',
      });
      onClose();
    },
    onError: error => {
      toast.error('Failed to send inquiry. Please try again.');
      console.error('Lead creation error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    createLeadMutation.mutate({
      propertyId,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      message: `[${formData.inquiryType.toUpperCase()}] ${formData.message}`,
      source,
      agentId,
      agencyId,
      developerBrandProfileId,
      developmentId,
      affordabilityData,
    });
  };

  const handleChange = <K extends keyof ContactFormState>(field: K, value: ContactFormState[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Contact {agentName}</DialogTitle>
          <DialogDescription>
            Interested in {propertyTitle}? Send a message and we'll get back to you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inquiryType">Inquiry Type</Label>
            <Select
              value={formData.inquiryType}
              onValueChange={value => handleChange('inquiryType', value as InquiryType)}
            >
              <SelectTrigger id="inquiryType">
                <SelectValue placeholder="Select inquiry type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Inquiry</SelectItem>
                <SelectItem value="viewing">Schedule Viewing</SelectItem>
                <SelectItem value="offer">Make an Offer</SelectItem>
                <SelectItem value="financing">Financing Options</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Your Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+27 12 345 6789"
              value={formData.phone}
              onChange={e => handleChange('phone', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              placeholder="I'm interested in this property and would like to know more..."
              value={formData.message}
              onChange={e => handleChange('message', e.target.value)}
              rows={4}
              required
            />
          </div>

          {(agentPhone || agentEmail) && (
            <div className="space-y-2 rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Direct Contact</p>
              {agentPhone && (
                <a
                  href={`tel:${agentPhone}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {agentPhone}
                </a>
              )}
              {agentEmail && (
                <a
                  href={`mailto:${agentEmail}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {agentEmail}
                </a>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={createLeadMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={createLeadMutation.isPending}>
              {createLeadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {submitLabel}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
