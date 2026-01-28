import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { Image as ImageIcon, Upload, X } from 'lucide-react';

interface Step6Props {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
  campaignId: number;
}

const Step6Creative: React.FC<Step6Props> = ({ data, updateData, onNext, onBack, campaignId }) => {
  const [creative, setCreative] = useState({
    headline: data.headline || '',
    description: data.description || '',
    ctaType: data.ctaType || 'learn_more',
    ctaUrl: data.ctaUrl || '',
    images: data.images || [], // Array of image URLs/IDs
  });

  const updateCreativeMutation = trpc.marketing.updateCreative.useMutation();

  // Mock upload function - in real app would upload to S3
  const handleImageUpload = () => {
    // Simulate upload
    const mockImage = `https://source.unsplash.com/random/800x600?property&sig=${Math.random()}`;
    setCreative(prev => ({ ...prev, images: [...prev.images, mockImage] }));
  };

  const removeImage = (index: number) => {
    setCreative(prev => ({
      ...prev,
      images: prev.images.filter((_: any, i: number) => i !== index),
    }));
  };

  const handleNext = async () => {
    try {
      await updateCreativeMutation.mutateAsync({
        campaignId,
        creative: {
          headline: creative.headline,
          description: creative.description,
          ctaType: creative.ctaType,
          ctaUrl: creative.ctaUrl,
          images: creative.images,
          videos: [], // Video support can be added later
        },
      });
      updateData(creative);
      onNext();
    } catch (error) {
      console.error('Failed to update creative');
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Creative Assets</h2>
        <p className="text-slate-500">Design how your ad will look to users</p>
      </div>

      <div className="space-y-6">
        {/* Ad Copy */}
        <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-900">Ad Copy</h3>

          <div className="space-y-2">
            <Label>Headline</Label>
            <Input
              placeholder="e.g. Luxury Apartment in Cape Town"
              value={creative.headline}
              onChange={e => setCreative({ ...creative, headline: e.target.value })}
              maxLength={50}
            />
            <p className="text-xs text-slate-500 text-right">{creative.headline.length}/50</p>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Highlight key features and selling points..."
              value={creative.description}
              onChange={e => setCreative({ ...creative, description: e.target.value })}
              maxLength={150}
              rows={3}
            />
            <p className="text-xs text-slate-500 text-right">{creative.description.length}/150</p>
          </div>
        </div>

        {/* Media Upload */}
        <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Media</h3>
            <Button variant="outline" size="sm" onClick={handleImageUpload}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </Button>
          </div>

          {creative.images.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ImageIcon className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No images uploaded yet</p>
              <p className="text-xs text-slate-400 mt-1">Recommended size: 1200x628px</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {creative.images.map((img: string, index: number) => (
                <div
                  key={index}
                  className="relative group aspect-video bg-slate-100 rounded-lg overflow-hidden"
                >
                  <img
                    src={img}
                    alt={`Creative ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-900">Call to Action</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Select
                value={creative.ctaType}
                onValueChange={value => setCreative({ ...creative, ctaType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="learn_more">Learn More</SelectItem>
                  <SelectItem value="contact_us">Contact Us</SelectItem>
                  <SelectItem value="view_listing">View Listing</SelectItem>
                  <SelectItem value="book_viewing">Book Viewing</SelectItem>
                  <SelectItem value="sign_up">Sign Up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destination URL (Optional)</Label>
              <Input
                placeholder="https://..."
                value={creative.ctaUrl}
                onChange={e => setCreative({ ...creative, ctaUrl: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!creative.headline || updateCreativeMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
        >
          {updateCreativeMutation.isPending ? 'Saving...' : 'Next Step'}
        </Button>
      </div>
    </div>
  );
};

export default Step6Creative;
