import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, Star } from 'lucide-react';
import { useState, useRef } from 'react';

export function MediaUploadStep() {
  const { media, addMedia, removeMedia, setPrimaryImage } = useDevelopmentWizard();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        addMedia({
          file,
          url,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          isPrimary: media.length === 0, // First image is primary by default
        });
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Media Upload</h2>
        <p className="text-slate-600">Upload photos and videos of your development</p>
      </div>

      {/* Upload Area */}
      <Card className="border-2 border-dashed border-slate-300 bg-slate-50 p-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="text-center">
          <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Media Files</h3>
          <p className="text-sm text-slate-600 mb-4">
            Drag and drop or click to upload images and videos
          </p>
          <Button onClick={() => fileInputRef.current?.click()}>
            Choose Files
          </Button>
          <p className="text-xs text-slate-500 mt-3">
            Supported: JPG, PNG, GIF, MP4, MOV (Max 10MB per file)
          </p>
        </div>
      </Card>

      {/* Media Grid */}
      {media.length > 0 && (
        <div>
          <Label className="mb-3 block">Uploaded Media ({media.length})</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {media.map((item) => (
              <Card key={item.id} className="relative group overflow-hidden">
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt="Development"
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <video
                    src={item.url}
                    className="w-full h-40 object-cover"
                  />
                )}

                {/* Primary Badge */}
                {item.isPrimary && (
                  <div className="absolute top-2 left-2">
                    <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Star className="h-3 w-3 fill-white" />
                      Primary
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!item.isPrimary && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPrimaryImage(item.id)}
                    >
                      Set Primary
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeMedia(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <p className="text-sm text-slate-600 mt-3">
            Click "Set Primary" to choose the main image for your development card
          </p>
        </div>
      )}

      {media.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <p>No media uploaded yet. Upload at least one image to continue.</p>
        </div>
      )}
    </div>
  );
}
