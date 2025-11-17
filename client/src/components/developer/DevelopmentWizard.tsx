import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const steps = [
  'Development Info',
  'Location',
  'Media Uploads',
  'Pricing Structure',
  'Floor Plans',
  'Documents',
  'Preview',
];

export default function DevelopmentWizard({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = React.useState(0);

  const next = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  return (
    <Card className="card">
      <CardHeader>
        <CardTitle className="typ-h3">Create New Development</CardTitle>
        <CardDescription>
          Step {step + 1} of {steps.length}: {steps[step]}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          {steps.map((label, idx) => (
            <div
              key={label}
              className={`flex-1 h-2 rounded-12 ${idx <= step ? 'bg-primary' : 'bg-secondary'}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm block mb-1">Name</label>
              <Input className="input" placeholder="Development name" />
            </div>
            <div>
              <label className="text-sm block mb-1">Type</label>
              <Input className="input" placeholder="Apartments, Estate, Houses" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm block mb-1">Description</label>
              <Textarea className="input" rows={4} placeholder="Brief description" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm block mb-1">Location</label>
              <Input className="input" placeholder="City, Province, Country" />
            </div>
            <div>
              <label className="text-sm block mb-1">Launch Date</label>
              <Input className="input" type="date" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Drag & drop images/videos/brochures here.
            </div>
            <div className="h-40 rounded-16 border-light flex items-center justify-center">
              Dropzone placeholder
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm block mb-1">Price From</label>
                <Input className="input" type="number" placeholder="0" />
              </div>
              <div>
                <label className="text-sm block mb-1">Currency</label>
                <Input className="input" placeholder="ZAR/ZMW" />
              </div>
              <div>
                <label className="text-sm block mb-1">Pricing Notes</label>
                <Input className="input" placeholder="Optional" />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Detailed tiered pricing UI placeholder.
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Add floor plans with images, sizes, and prices.
            </div>
            <div className="h-40 rounded-16 border-light flex items-center justify-center">
              Floor plan manager placeholder
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Upload PDFs, Excel, and other documents.
            </div>
            <div className="h-40 rounded-16 border-light flex items-center justify-center">
              Documents uploader placeholder
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Preview the landing page before publishing.
            </div>
            <div className="h-56 rounded-16 bg-secondary" />
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <div className="space-x-2">
            <Button className="btn btn-secondary" onClick={prev} disabled={step === 0}>
              Back
            </Button>
            <Button
              className="btn btn-primary"
              onClick={step === steps.length - 1 ? onClose : next}
            >
              {step === steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
