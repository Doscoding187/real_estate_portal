import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  SERVICE_CATEGORIES,
  type IntentStage,
  type ServiceCategory,
  type SourceSurface,
} from '@/features/services/catalog';

export type LeadWizardSubmit = {
  category: ServiceCategory;
  intentStage: IntentStage;
  sourceSurface: SourceSurface;
  notes: string;
  province?: string;
  city?: string;
  suburb?: string;
  propertyId?: number;
  listingId?: number;
  developmentId?: number;
};

type LeadRequestWizardProps = {
  defaultCategory: ServiceCategory;
  defaultLocation?: string;
  submitting?: boolean;
  onSubmit: (payload: LeadWizardSubmit) => void;
};

const STAGE_OPTIONS: Array<{ value: IntentStage; label: string }> = [
  { value: 'seller_valuation', label: 'Seller valuation' },
  { value: 'seller_listing_prep', label: 'Seller listing prep' },
  { value: 'buyer_saved_property', label: 'Buyer saved property' },
  { value: 'buyer_offer_intent', label: 'Buyer offer intent' },
  { value: 'buyer_move_ready', label: 'Buyer move ready' },
  { value: 'developer_listing_wizard', label: 'Developer listing wizard' },
  { value: 'agent_dashboard', label: 'Agent dashboard' },
  { value: 'general', label: 'General service request' },
];

export function LeadRequestWizard({
  defaultCategory,
  defaultLocation = '',
  submitting = false,
  onSubmit,
}: LeadRequestWizardProps) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<ServiceCategory>(defaultCategory);
  const [location, setLocation] = useState(defaultLocation);
  const [intentStage, setIntentStage] = useState<IntentStage>('general');
  const [sourceSurface, setSourceSurface] = useState<SourceSurface>('journey_injection');
  const [notes, setNotes] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [listingId, setListingId] = useState('');
  const [developmentId, setDevelopmentId] = useState('');

  const parts = useMemo(() => {
    const [suburb, city, province] = location
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
    return { suburb, city, province };
  }, [location]);

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-xl">Request Matching</CardTitle>
        <p className="text-sm text-slate-600">Step {step} of 3</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 1 && (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</span>
              <select
                value={category}
                onChange={event => setCategory(event.target.value as ServiceCategory)}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                {SERVICE_CATEGORIES.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</span>
              <Input
                value={location}
                onChange={event => setLocation(event.target.value)}
                placeholder="Suburb, City, Province"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Journey stage
              </span>
              <select
                value={intentStage}
                onChange={event => setIntentStage(event.target.value as IntentStage)}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                {STAGE_OPTIONS.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Source surface
              </span>
              <select
                value={sourceSurface}
                onChange={event => setSourceSurface(event.target.value as SourceSurface)}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="journey_injection">Journey injection</option>
                <option value="directory">Directory</option>
                <option value="explore">Explore</option>
                <option value="agent_dashboard">Agent dashboard</option>
              </select>
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Request details
              </span>
              <Textarea
                value={notes}
                onChange={event => setNotes(event.target.value)}
                placeholder="What work do you need done, and by when?"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                value={propertyId}
                onChange={event => setPropertyId(event.target.value)}
                placeholder="Property ID (optional)"
              />
              <Input
                value={listingId}
                onChange={event => setListingId(event.target.value)}
                placeholder="Listing ID (optional)"
              />
              <Input
                value={developmentId}
                onChange={event => setDevelopmentId(event.target.value)}
                placeholder="Development ID (optional)"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={step === 1 || submitting} onClick={() => setStep(step - 1)}>
            Back
          </Button>
          {step < 3 ? (
            <Button disabled={submitting} onClick={() => setStep(step + 1)}>
              Continue
            </Button>
          ) : (
            <Button
              disabled={submitting}
              onClick={() =>
                onSubmit({
                  category,
                  intentStage,
                  sourceSurface,
                  notes: notes.trim(),
                  suburb: parts.suburb,
                  city: parts.city,
                  province: parts.province,
                  propertyId: propertyId ? Number(propertyId) : undefined,
                  listingId: listingId ? Number(listingId) : undefined,
                  developmentId: developmentId ? Number(developmentId) : undefined,
                })
              }
            >
              {submitting ? 'Submitting...' : 'Submit request'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
