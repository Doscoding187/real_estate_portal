import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, X, Star, Image as ImageIcon, FileText, Box, Video } from 'lucide-react';
import type { UnitType } from '@/hooks/useDevelopmentWizard';

interface MediaTabProps {
  formData: Partial<UnitType>;
  updateFormData: (updates: Partial<UnitType>) => void;
}

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'pdf';
  category: 'floorplan' | 'interior' | 'exterior' | 'rendering';
  isPrimary: boolean;
}

export function MediaTab({ formData, updateFormData }: MediaTabProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(formData.unitMedia || []);
  const [virtualTourUrl, setVirtualTourUrl] = useState(formData.virtualTourLink || '');

  const handleFileUpload = (category: MediaItem['category'], files: FileList | null) => {
    if (!files) return;

    const newItems: MediaItem[] = Array.from(files).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      type: file.type.includes('pdf') ? 'pdf' : 'image',
      category,
      isPrimary: false,
    }));

    const updated = [...mediaItems, ...newItems];
    setMediaItems(updated);
    updateFormData({ unitMedia: updated });
  };

  const removeMedia = (id: string) => {
    const updated = mediaItems.filter(item => item.id !== id);
    setMediaItems(updated);
    updateFormData({ unitMedia: updated });
  };

  const setPrimaryImage = (id: string) => {
    const updated = mediaItems.map(item => ({
      ...item,
      isPrimary: item.id === id,
    }));
    setMediaItems(updated);
    updateFormData({ unitMedia: updated });
  };

  const reorderMedia = (fromIndex: number, toIndex: number) => {
    const updated = [...mediaItems];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setMediaItems(updated);
    updateFormData({ unitMedia: updated });
  };

  const getMediaByCategory = (category: MediaItem['category']) => {
    return mediaItems.filter(item => item.category === category);
  };

  const MediaUploadSection = ({
    category,
    title,
    icon: Icon,
    description,
  }: {
    category: MediaItem['category'];
    title: string;
    icon: any;
    description: string;
  }) => {
    const items = getMediaByCategory(category);

    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold text-slate-900">{title}</h4>
        </div>
        <p className="text-sm text-slate-600 mb-4">{description}</p>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
          <input
            type="file"
            multiple
            accept={category === 'floorplan' ? 'image/*,.pdf' : 'image/*'}
            onChange={e => handleFileUpload(category, e.target.files)}
            className="hidden"
            id={`upload-${category}`}
          />
          <label htmlFor={`upload-${category}`} className="cursor-pointer">
            <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
            <p className="text-xs text-slate-500 mt-1">
              {category === 'floorplan' ? 'PNG, JPG, PDF up to 10MB' : 'PNG, JPG up to 10MB'}
            </p>
          </label>
        </div>

        {/* Uploaded Items */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {items.map((item, index) => (
              <div key={item.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-100">
                  {item.type === 'pdf' ? (
                    <div className="flex items-center justify-center h-full">
                      <FileText className="h-12 w-12 text-slate-400" />
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt={`${category} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {category !== 'floorplan' && (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-white/90 hover:bg-white"
                      onClick={() => setPrimaryImage(item.id)}
                    >
                      <Star
                        className={`h-4 w-4 ${item.isPrimary ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`}
                      />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-white/90 hover:bg-white"
                    onClick={() => removeMedia(item.id)}
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>

                {item.isPrimary && (
                  <div className="absolute bottom-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-1 rounded">
                    Primary
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Tip:</strong> Upload unit-specific media to help buyers visualize this exact unit
          type. Set a primary image to be featured in listings.
        </p>
      </div>

      <MediaUploadSection
        category="floorplan"
        title="Floor Plans"
        icon={FileText}
        description="Upload floor plan images or PDFs for this unit type"
      />

      <MediaUploadSection
        category="interior"
        title="Interior Images"
        icon={ImageIcon}
        description="Photos of the interior spaces, finishes, and features"
      />

      <MediaUploadSection
        category="exterior"
        title="Exterior Images"
        icon={Box}
        description="Photos of the exterior, facade, and outdoor spaces"
      />

      <MediaUploadSection
        category="rendering"
        title="3D Renderings"
        icon={Box}
        description="Computer-generated 3D visualizations and renders"
      />

      {/* Virtual Tour Link */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-white border-purple-200">
        <div className="flex items-center gap-2 mb-2">
          <Video className="h-5 w-5 text-purple-600" />
          <h4 className="font-semibold text-slate-900">Virtual Tour / Video</h4>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Add a link to a virtual tour, video walkthrough, or 360° view
        </p>

        <div>
          <Label htmlFor="virtualTour" className="text-sm font-medium">
            Virtual Tour URL
          </Label>
          <Input
            id="virtualTour"
            type="url"
            placeholder="https://my.matterport.com/... or YouTube link"
            value={virtualTourUrl}
            onChange={e => {
              setVirtualTourUrl(e.target.value);
              updateFormData({ virtualTourLink: e.target.value });
            }}
            className="mt-1"
          />
          <p className="text-xs text-slate-500 mt-2">
            Supported: Matterport, YouTube, Vimeo, or any video URL
          </p>
        </div>
      </Card>

      {/* Media Summary */}
      <Card className="p-4 bg-slate-50 border-slate-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Total Media Items:</span>
          <span className="font-semibold text-slate-900">{mediaItems.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-slate-600">Primary Image Set:</span>
          <span className="font-semibold text-slate-900">
            {mediaItems.some(item => item.isPrimary) ? 'Yes' : 'No'}
          </span>
        </div>
      </Card>
    </div>
  );
}
