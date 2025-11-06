import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';

interface ContactAgentModalProps {
  video: any;
  onClose: () => void;
}

export function ContactAgentModal({ video, onClose }: ContactAgentModalProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const contactAgent = trpc.video.contactAgent.useMutation({
    onSuccess: data => {
      console.log('Success:', data);
      onClose();
      // You could show a success toast here
    },
    onError: error => {
      console.error('Error:', error);
      // You could show an error toast here
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!form.message.trim()) {
      newErrors.message = 'Message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateMessage = () => {
    if (video.type === 'listing') {
      const propertyTitle = video.propertyTitle || 'the property';
      return `Hi ${video.agentName || 'there'}, I saw your video about ${propertyTitle} and would like to know more. Please contact me with more information.`;
    } else {
      return `Hi ${video.agentName || 'there'}, I saw your video on the Explore feed and would like to connect. Please get in touch with me.`;
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const message = form.message.trim() || generateMessage();

    contactAgent.mutate({
      agentId: video.agentId,
      videoId: video.id,
      propertyId: video.propertyId,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      message,
    });
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="bg-background text-foreground max-w-md mx-4"
        onClick={handleOverlayClick}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Contact Agent</span>
            {video.type === 'listing' && (
              <span className="text-sm text-muted-foreground">(Property Video)</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Agent Info */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {video.agentName ? video.agentName.charAt(0).toUpperCase() : 'A'}
                </span>
              </div>
              <div>
                <p className="font-medium">{video.agentName || 'Agent'}</p>
                {video.type === 'listing' && video.propertyTitle && (
                  <p className="text-sm text-muted-foreground">Regarding: {video.propertyTitle}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="space-y-3">
            <div>
              <Input
                placeholder="Your Name *"
                value={form.name}
                onChange={e => {
                  setForm({ ...form, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <Input
                type="email"
                placeholder="Your Email *"
                value={form.email}
                onChange={e => {
                  setForm({ ...form, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <Input
                type="tel"
                placeholder="Your Phone (optional)"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <Textarea
                placeholder="Your message *"
                value={form.message}
                onChange={e => {
                  setForm({ ...form, message: e.target.value });
                  if (errors.message) setErrors({ ...errors, message: '' });
                }}
                className={`min-h-[80px] ${errors.message ? 'border-red-500' : ''}`}
              />
              {errors.message && <p className="text-sm text-red-500 mt-1">{errors.message}</p>}
            </div>
          </div>

          {/* Suggested Message */}
          {!form.message && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Suggested message:</p>
              <p className="text-sm">{generateMessage()}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setForm({ ...form, message: generateMessage() })}
              >
                Use This Message
              </Button>
            </div>
          )}

          {/* Submit Button */}
          <Button className="w-full" onClick={handleSubmit} disabled={contactAgent.isLoading}>
            {contactAgent.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Message'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            The agent will receive your inquiry and can respond directly.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
