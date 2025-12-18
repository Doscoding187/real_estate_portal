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
    <div className="space-y-6 md:space-y-8">
      <div className="text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Overview & Features</h2>
        <p className="text-slate-600">Highlight the key selling points and status of the development.</p>
      </div>

      <div className="space-y-6">
        <Card className="border-slate-200/60 shadow-sm">
          <CardContent className="pt-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Development Status</Label>
                <Select 
                  value={overview.status} 
                  onValueChange={(val: any) => setOverview({ status: val })}
                >
                  <SelectTrigger className="h-11 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20">
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
              <Label className="text-sm font-medium text-slate-700">Marketing Description</Label>
              <Textarea 
                placeholder="Detailed description for marketing purposes..."
                className="min-h-[150px] border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none"
                value={overview.description}
                onChange={(e) => setOverview({ description: e.target.value })}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">Minimum 50 characters required</p>
                <p className={cn(
                  "text-xs font-medium",
                  overview.description.length >= 50 ? "text-green-600" : "text-slate-500"
                )}>
                  {overview.description.length} / 50
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Highlights Section */}
          <Card className="border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <Sparkles className="w-5 h-5 text-yellow-600" />
                </div>
                <span className="text-slate-900">Key Highlights</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g. No Transfer Duty" 
                  value={highlightInput}
                  onChange={(e) => setHighlightInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addHighlight()}
                  className="h-11 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
                />
                <Button 
                  onClick={addHighlight} 
                  size="icon" 
                  className="h-11 w-11 bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 min-h-[120px] content-start bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 rounded-xl border-2 border-dashed border-slate-200">
                {overview.highlights.length === 0 && (
                  <div className="w-full text-center py-6">
                    <p className="text-sm text-slate-500 font-medium">Add at least 3 highlights</p>
                    <p className="text-xs text-slate-400 mt-1">Press Enter or click + to add</p>
                  </div>
                )}
                {overview.highlights.map((item, idx) => (
                  <Badge 
                    key={idx} 
                    className="pl-3 pr-2 py-2 bg-white border-slate-300 shadow-sm hover:shadow-md transition-all text-slate-700 font-medium"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1.5 text-green-600" />
                    {item}
                    <button 
                      onClick={() => removeHighlight(idx)} 
                      className="ml-2 hover:text-red-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Amenities Section */}
          <Card className="border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-slate-900">Amenities & Services</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g. 24h Security" 
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addAmenity()}
                  className="h-11 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
                />
                <Button 
                  onClick={addAmenity} 
                  size="icon" 
                  className="h-11 w-11 bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[120px] content-start bg-gradient-to-br from-slate-50 to-green-50/30 p-4 rounded-xl border-2 border-dashed border-slate-200">
                {overview.amenities.length === 0 && (
                  <div className="w-full text-center py-6">
                    <p className="text-sm text-slate-500 font-medium">Add amenities and services</p>
                    <p className="text-xs text-slate-400 mt-1">Press Enter or click + to add</p>
                  </div>
                )}
                {overview.amenities.map((item, idx) => (
                  <Badge 
                    key={idx} 
                    className="pl-3 pr-2 py-2 bg-white border-slate-300 shadow-sm hover:shadow-md transition-all text-slate-700 font-medium"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1.5 text-green-600" />
                    {item}
                    <button 
                      onClick={() => removeAmenity(idx)} 
                      className="ml-2 hover:text-red-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-between pt-8 mt-8 border-t border-slate-200">
        <Button 
          variant="outline" 
          onClick={() => setPhase(2)}
          className="px-6 h-11 border-slate-300"
        >
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          size="lg" 
          className="px-8 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
        >
          Continue to Unit Types
        </Button>
      </div>
    </div>
  );
}