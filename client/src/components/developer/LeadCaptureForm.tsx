/**
 * Lead Capture Form Component
 * 
 * Public-facing form for capturing leads with affordability integration
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 14.1, 14.2, 14.3
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Mail,
  Phone,
  User,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface LeadCaptureFormProps {
  developmentId: number;
  unitId?: number;
  unitPrice?: number;
  affordabilityData?: {
    monthlyIncome: number;
    monthlyExpenses?: number;
    monthlyDebts?: number;
    availableDeposit?: number;
    maxAffordable: number;
    calculatedAt: string;
  };
  onSuccess?: () => void;
}

export function LeadCaptureForm({
  developmentId,
  unitId,
  unitPrice,
  affordabilityData,
  onSuccess,
}: LeadCaptureFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Capture UTM parameters from URL
  const [utmParams, setUtmParams] = useState<{
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    referrerUrl?: string;
  }>({});

  useEffect(() => {
    // Capture UTM parameters on mount
    const params = new URLSearchParams(window.location.search);
    setUtmParams({
      utmSource: params.get('utm_source') || undefined,
      utmMedium: params.get('utm_medium') || undefined,
      utmCampaign: params.get('utm_campaign') || undefined,
      referrerUrl: document.referrer || undefined,
    });
  }, []);

  const createLeadMutation = trpc.developer.createLead.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      if (onSuccess) {
        onSuccess();
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createLeadMutation.mutate({
      developmentId,
      unitId,
      name,
      email,
      phone: phone || undefined,
      message: message || undefined,
      affordabilityData,
      ...utmParams,
    });
  };

  if (submitted) {
    return (
      <Card className="p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-green-100 rounded-full">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-2">Thank You!</h3>
        <p className="text-gray-600 mb-4">
          Your inquiry has been submitted successfully. A member of our team will contact you shortly.
        </p>
        {affordabilityData && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-900">
              Based on your affordability assessment, you're well-positioned for this property.
              We'll prioritize your inquiry!
            </p>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-xl font-bold mb-2">Express Your Interest</h3>
          <p className="text-sm text-gray-600">
            Fill in your details and we'll get back to you shortly
          </p>
        </div>

        {/* Affordability Badge */}
        {affordabilityData && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-900">Pre-Qualified Lead</span>
              <Badge className="bg-green-500 text-white">High Priority</Badge>
            </div>
            <p className="text-sm text-gray-700">
              Your affordability has been assessed. You'll receive priority attention from our sales team!
            </p>
          </div>
        )}

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Full Name <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="pl-10"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email Address <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="phone"
              type="tel"
              placeholder="+27 12 345 6789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message">Message (Optional)</Label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Textarea
              id="message"
              placeholder="Tell us about your requirements..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="pl-10"
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={createLeadMutation.isPending}
          className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
          size="lg"
        >
          {createLeadMutation.isPending ? 'Submitting...' : 'Submit Inquiry'}
        </Button>

        {/* Privacy Notice */}
        <p className="text-xs text-gray-500 text-center">
          By submitting this form, you agree to be contacted about this property.
          Your information will be kept confidential.
        </p>

        {/* Error Message */}
        {createLeadMutation.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              Failed to submit inquiry. Please try again.
            </p>
          </div>
        )}
      </form>
    </Card>
  );
}
