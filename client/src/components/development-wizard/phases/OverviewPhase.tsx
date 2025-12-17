import React, { useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function OverviewPhase() {
  const { 
    overview, 
    setOverview, 
    setPhase, 
    validatePhase 
  } = useDevelopmentWizard();

  const [highlightInput, setHighlightInput] = useState('');
  const [amenityInput, setAmenityInput] = useState('');

  const addHighlight = () => {
    if (!highlightInput.trim()) return;
    if (overview.highlights.includes(highlightInput.trim())) {
      toast.error('Highlight already exists');
      return;
    }
    setOverview({ highlights: [...overview.highlights, highlightInput.trim()] });
    setHighlightInput('');
  };

  const removeHighlight = (index: number) => {
    const newHighlights = [...overview.highlights];
    newHighlights.splice(index, 1);
    setOverview({ highlights: newHighlights });
  };

  const addAmenity = () => {
    if (!amenityInput.trim()) return;
    if (overview.amenities.includes(amenityInput.trim())) {
      toast.error('Amenity already exists');
      return;
    }
    setOverview({ amenities: [...overview.amenities, amenityInput.trim()] });
    setAmenityInput('');
  };

  const removeAmenity = (index: number) => {
    const newAmenities = [...overview.amenities];
    newAmenities.splice(index, 1);
    setOverview({ amenities: newAmenities });
  };

  const handleNext = () => {
    const { isValid, errors } = validatePhase(3);
    if (isValid) {
      setPhase(4);
    } else {
      errors.forEach(e => toast.error(e));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Overview & Features</h2>
        <p className="text-slate-500">Highlight the key selling points and status of the development.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Development Status</Label>
                <Select 
                  value={overview.status} 
                  onValueChange={(val: any) => setOverview({ status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning Phase</SelectItem>
                    <SelectItem value="construction">Under Construction</SelectItem>
                    <SelectItem value="near-completion">Near Completion</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Marketing Description</Label>
              <Textarea 
                placeholder="Detailed description for marketing purposes..."
                className="min-h-[150px]"
                value={overview.description}
                onChange={(e) => setOverview({ description: e.target.value })}
              />
              <p className="text-xs text-slate-500 text-right">
                {overview.description.length} characters
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Highlights Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Key Highlights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g. No Transfer Duty" 
                  value={highlightInput}
                  onChange={(e) => setHighlightInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addHighlight()}
                />
                <Button onClick={addHighlight} size="icon" variant="secondary">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 min-h-[100px] content-start bg-slate-50 p-4 rounded-md border border-slate-100">
                {overview.highlights.length === 0 && (
                  <p className="text-sm text-slate-400 w-full text-center py-4">Add at least 3 highlights</p>
                )}
                {overview.highlights.map((item, idx) => (
                  <Badge key={idx} variant="secondary" className="pl-2 pr-1 py-1 bg-white border-slate-200 shadow-sm">
                    {item}
                    <button onClick={() => removeHighlight(idx)} className="ml-1 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Amenities Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Amenities & Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g. 24h Security" 
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addAmenity()}
                />
                <Button onClick={addAmenity} size="icon" variant="secondary">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[100px] content-start bg-slate-50 p-4 rounded-md border border-slate-100">
                {overview.amenities.length === 0 && (
                  <p className="text-sm text-slate-400 w-full text-center py-4">Add amenities</p>
                )}
                {overview.amenities.map((item, idx) => (
                  <Badge key={idx} variant="outline" className="pl-2 pr-1 py-1 bg-white">
                    {item}
                    <button onClick={() => removeAmenity(idx)} className="ml-1 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => setPhase(2)}>Back</Button>
        <Button onClick={handleNext} size="lg" className="px-8">Continue</Button>
      </div>
    </div>
  );
}