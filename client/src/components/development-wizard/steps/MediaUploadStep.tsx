import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, X, Star, Image as ImageIcon, Video, Home, Sparkles, Trees } from 'lucide-react';
import { useState, useRef } from 'react';

type MediaCategory = 'featured' | 'general' | 'amenities' | 'outdoors' | 'videos';

export function MediaUploadStep() {
  const { media, addMedia, removeMedia, setPrimaryImage } = useDevelopmentWizard();
  const [activeCategory, setActiveCategory] = useState<MediaCategory>('featured');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, category: MediaCategory) => {
    const files = e.target.files;
    if (!files) return;

    const isVideoCategory = category === 'videos';
    const acceptedTypes = isVideoCategory ? 'video/*' : 'image/*';

    Array.from(files).forEach((file) => {
      const isCorrectType = isVideoCategory 
        ? file.type.startsWith('video/')
        : file.type.startsWith('image/');

      if (isCorrectType) {
        const url = URL.createObjectURL(file);
        addMedia({
          file,
          url,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          category,
          isPrimary: category === 'featured' && getCategoryMedia('featured').length === 0,
        });
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getCategoryMedia = (category: MediaCategory) => {
    return media.filter(item => item.category === category);
  };

  const renderUploadSection = (
    category: MediaCategory,
    title: string,
    description: string,
    icon: React.ReactNode,
    maxFiles?: number,
    acceptVideo: boolean = false
  ) => {
    const categoryMedia = getCategoryMedia(category);
    const canUploadMore = maxFiles ? categoryMedia.length < maxFiles : true;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <h4 className="font-semibold text-slate-800">{title}</h4>
              <p className="text-sm text-slate-600">{description}</p>
            </div>
          </div>
          {maxFiles && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              {categoryMedia.length}/{maxFiles}
            </span>
          )}
        </div>

        {/* Upload Area */}
        {canUploadMore && (
          <div className="border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-xl p-6 transition-colors hover:bg-slate-50 hover:border-blue-400">
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptVideo ? 'image/*,video/*' : 'image/*'}
              multiple={!maxFiles || maxFiles > 1}
              onChange={(e) => handleFileSelect(e, category)}
              className="hidden"
            />
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Upload className="h-6 w-6" />
              </div>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="mb-2"
              >
                Choose {acceptVideo ? 'Files' : 'Images'}
              </Button>
              <p className="text-xs text-slate-500">
                {acceptVideo ? 'Images or videos' : 'Images only'} • Max 10MB
              </p>
            </div>
          </div>
        )}

        {/* Media Grid */}
        {categoryMedia.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categoryMedia.map((item) => (
              <div key={item.id} className="relative group rounded-lg overflow-hidden shadow-sm border border-slate-200 aspect-[4/3]">
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={category}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
                    <video
                      src={item.url}
                      className="w-full h-full object-cover opacity-80"
                    />
                    <Video className="absolute w-8 h-8 text-white/80" />
                  </div>
                )}

                {/* Primary/Featured Badge */}
                {item.isPrimary && (
                  <div className="absolute top-2 left-2 z-10">
                    <div className="bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                      <Star className="h-3 w-3 fill-white" />
                      Featured
                    </div>
                  </div>
                )}

                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-2 p-2">
                  {!item.isPrimary && category === 'featured' && item.type === 'image' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full bg-white/90 hover:bg-white text-xs"
                      onClick={() => setPrimaryImage(item.id)}
                    >
                      Set Featured
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full bg-red-500/90 hover:bg-red-600 text-xs"
                    onClick={() => removeMedia(item.id)}
                  >
                    <X className="h-3 w-3 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const featuredCount = getCategoryMedia('featured').length;
  const generalCount = getCategoryMedia('general').length;
  const amenitiesCount = getCategoryMedia('amenities').length;
  const outdoorsCount = getCategoryMedia('outdoors').length;
  const videosCount = getCategoryMedia('videos').length;

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Development Media</h3>
        </div>
        <p className="text-slate-600 mb-6">Organize your media by category for better presentation</p>

        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as MediaCategory)}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="featured" className="text-xs">
              Featured {featuredCount > 0 && `(${featuredCount})`}
            </TabsTrigger>
            <TabsTrigger value="general" className="text-xs">
              Photos {generalCount > 0 && `(${generalCount})`}
            </TabsTrigger>
            <TabsTrigger value="amenities" className="text-xs">
              Amenities {amenitiesCount > 0 && `(${amenitiesCount})`}
            </TabsTrigger>
            <TabsTrigger value="outdoors" className="text-xs">
              Outdoors {outdoorsCount > 0 && `(${outdoorsCount})`}
            </TabsTrigger>
            <TabsTrigger value="videos" className="text-xs">
              Videos {videosCount > 0 && `(${videosCount})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="featured" className="mt-0">
            {renderUploadSection(
              'featured',
              'Featured Media',
              'Main image or video shown on the development page (1 required)',
              <Star className="w-5 h-5 text-orange-500" />,
              1,
              true
            )}
          </TabsContent>

          <TabsContent value="general" className="mt-0">
            {renderUploadSection(
              'general',
              'General Photos',
              'Interior, exterior, and unit photos',
              <Home className="w-5 h-5 text-blue-500" />
            )}
          </TabsContent>

          <TabsContent value="amenities" className="mt-0">
            {renderUploadSection(
              'amenities',
              'Amenities',
              'Pool, gym, clubhouse, and other amenities',
              <Sparkles className="w-5 h-5 text-purple-500" />
            )}
          </TabsContent>

          <TabsContent value="outdoors" className="mt-0">
            {renderUploadSection(
              'outdoors',
              'Outdoor Spaces',
              'Gardens, courtyards, terraces, and outdoor areas',
              <Trees className="w-5 h-5 text-green-500" />
            )}
          </TabsContent>

          <TabsContent value="videos" className="mt-0">
            {renderUploadSection(
              'videos',
              'Videos',
              'Virtual tours, walkthroughs, and promotional videos',
              <Video className="w-5 h-5 text-red-500" />,
              undefined,
              true
            )}
          </TabsContent>
        </Tabs>

        {media.length === 0 && (
          <div className="mt-6 p-4 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            <p>Please upload at least one featured image to continue.</p>
          </div>
        )}

        {media.length > 0 && featuredCount === 0 && (
          <div className="mt-6 p-4 bg-orange-50 text-orange-700 rounded-lg text-sm flex items-center gap-2">
            <Star className="w-4 h-4" />
            <p>Please upload a featured image or video for your development.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
