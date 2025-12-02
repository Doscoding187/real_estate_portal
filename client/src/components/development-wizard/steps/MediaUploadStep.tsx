import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MediaUploadZone } from '@/components/media/MediaUploadZone';
import { SortableMediaGrid } from '@/components/media/SortableMediaGrid';
import {
  Star,
  Image as ImageIcon,
  Home,
  Sparkles,
  Trees,
  Video,
  Lightbulb,
  FileText,
  Layout,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import type { MediaItem as GridMediaItem } from '@/components/media/SortableMediaGrid';

type MediaCategory = 'featured' | 'general' | 'floorplans' | 'amenities' | 'outdoors' | 'videos';

export function MediaUploadStep() {
  const { media, addMedia, removeMedia, setPrimaryImage, reorderMedia } = useDevelopmentWizard();
  const [activeCategory, setActiveCategory] = useState<MediaCategory>('featured');

  // Handle file upload for specific category
  const handleUpload = useCallback(
    (files: File[], category: MediaCategory) => {
      const isVideoCategory = category === 'videos';

      files.forEach(file => {
        const isCorrectType = isVideoCategory
          ? file.type.startsWith('video/')
          : file.type.startsWith('image/');

        if (isCorrectType) {
          const url = URL.createObjectURL(file);
          const categoryMedia = media.filter(item => item.category === category);

          addMedia({
            file,
            url,
            type:
              category === 'floorplans'
                ? 'floorplan'
                : file.type.startsWith('image/')
                  ? 'image'
                  : 'video',
            category,
            isPrimary: category === 'featured' && categoryMedia.length === 0,
          });
        }
      });
    },
    [media, addMedia],
  );

  // Get media for specific category
  const getCategoryMedia = useCallback(
    (category: MediaCategory): GridMediaItem[] => {
      return media
        .filter(item => item.category === category)
        .map(item => ({
          id: item.id,
          url: item.url,
          type: item.type as 'image' | 'video' | 'floorplan' | 'pdf',
          fileName: item.file?.name,
          isPrimary: item.isPrimary,
          displayOrder: item.displayOrder,
        }));
    },
    [media],
  );

  // Handle media reorder within category
  const handleReorder = useCallback(
    (reorderedMedia: GridMediaItem[], category: MediaCategory) => {
      // Get all media items for this category
      const categoryMediaIds = media
        .filter(item => item.category === category)
        .map(item => item.id);

      // Update display order for reordered items
      reorderedMedia.forEach((item, newIndex) => {
        const oldIndex = categoryMediaIds.indexOf(item.id);
        if (oldIndex !== -1 && oldIndex !== newIndex) {
          // Find the actual index in the full media array
          const fullArrayIndex = media.findIndex(m => m.id === item.id);
          if (fullArrayIndex !== -1) {
            // Calculate the new position in the full array
            const categoryStartIndex = media.findIndex(m => m.category === category);
            const newFullArrayIndex = categoryStartIndex + newIndex;

            // Reorder in the full array
            const updatedMedia = [...media];
            const [movedItem] = updatedMedia.splice(fullArrayIndex, 1);
            updatedMedia.splice(newFullArrayIndex, 0, movedItem);

            // Update display orders
            reorderMedia(updatedMedia.map((m, i) => ({ ...m, displayOrder: i })));
          }
        }
      });
    },
    [media, reorderMedia],
  );

  // Handle media remove
  const handleRemove = useCallback(
    (id: string) => {
      removeMedia(id);
    },
    [removeMedia],
  );

  // Handle set as primary (featured)
  const handleSetPrimary = useCallback(
    (id: string) => {
      setPrimaryImage(id);
    },
    [setPrimaryImage],
  );

  // Render upload section for each category
  const renderCategorySection = (
    category: MediaCategory,
    title: string,
    description: string,
    icon: React.ReactNode,
    maxFiles?: number,
    acceptVideo: boolean = false,
  ) => {
    const categoryMedia = getCategoryMedia(category);
    const canUploadMore = maxFiles ? categoryMedia.length < maxFiles : true;

    return (
      <div className="space-y-6">
        {/* Category Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h4 className="font-semibold text-slate-800">{title}</h4>
              <p className="text-sm text-slate-600">{description}</p>
            </div>
          </div>
          {maxFiles && (
            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
              {categoryMedia.length}/{maxFiles}
            </span>
          )}
        </div>

        {/* Upload Zone */}
        {canUploadMore && (
          <MediaUploadZone
            onUpload={files => handleUpload(files, category)}
            maxFiles={maxFiles || 30}
            maxSizeMB={5}
            maxVideoSizeMB={50}
            acceptedTypes={acceptVideo ? ['image/*', 'video/*'] : ['image/*']}
            existingMediaCount={categoryMedia.length}
          />
        )}

        {/* Media Grid */}
        {categoryMedia.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">
                {categoryMedia.length} {categoryMedia.length === 1 ? 'item' : 'items'}
              </p>
              <p className="text-xs text-slate-500">Drag to reorder</p>
            </div>

            <SortableMediaGrid
              media={categoryMedia}
              onReorder={reordered => handleReorder(reordered, category)}
              onRemove={handleRemove}
              onSetPrimary={category === 'featured' ? handleSetPrimary : undefined}
            />
          </div>
        )}

        {/* Category-specific tips */}
        {category === 'featured' && categoryMedia.length === 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-800">
              <strong>Required:</strong> Upload at least one featured image or video for your
              development.
            </p>
          </div>
        )}
        {category === 'floorplans' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Upload floor plans for each unit type. Clear, labeled floor
              plans increase buyer interest by 40%.
            </p>
          </div>
        )}
        {category === 'general' && categoryMedia.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Recommended:</strong> Upload 10-20 high-quality photos showing interiors,
              exteriors, and common areas.
            </p>
          </div>
        )}
      </div>
    );
  };

  // Count media by category
  const featuredCount = media.filter(m => m.category === 'featured').length;
  const generalCount = media.filter(m => m.category === 'general').length;
  const floorplansCount = media.filter(m => m.category === 'floorplans').length;
  const amenitiesCount = media.filter(m => m.category === 'amenities').length;
  const outdoorsCount = media.filter(m => m.category === 'outdoors').length;
  const videosCount = media.filter(m => m.category === 'videos').length;

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-800">Development Media</h3>
          </div>
          <p className="text-slate-600">
            Organize your media by category for better presentation. Upload high-quality images and
            videos.
          </p>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={v => setActiveCategory(v as MediaCategory)}>
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="featured" className="text-xs">
              <Star className="w-3 h-3 mr-1" />
              Featured {featuredCount > 0 && `(${featuredCount})`}
            </TabsTrigger>
            <TabsTrigger value="general" className="text-xs">
              <Home className="w-3 h-3 mr-1" />
              Photos {generalCount > 0 && `(${generalCount})`}
            </TabsTrigger>
            <TabsTrigger value="floorplans" className="text-xs">
              <Layout className="w-3 h-3 mr-1" />
              Floor Plans {floorplansCount > 0 && `(${floorplansCount})`}
            </TabsTrigger>
            <TabsTrigger value="amenities" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Amenities {amenitiesCount > 0 && `(${amenitiesCount})`}
            </TabsTrigger>
            <TabsTrigger value="outdoors" className="text-xs">
              <Trees className="w-3 h-3 mr-1" />
              Outdoors {outdoorsCount > 0 && `(${outdoorsCount})`}
            </TabsTrigger>
            <TabsTrigger value="videos" className="text-xs">
              <Video className="w-3 h-3 mr-1" />
              Videos {videosCount > 0 && `(${videosCount})`}
            </TabsTrigger>
          </TabsList>

          {/* Featured Tab */}
          <TabsContent value="featured" className="mt-0">
            {renderCategorySection(
              'featured',
              'Featured Media',
              'Main image or video shown on the development page (1 required)',
              <Star className="w-5 h-5 text-orange-500" />,
              1,
              true,
            )}
          </TabsContent>

          {/* General Photos Tab */}
          <TabsContent value="general" className="mt-0">
            {renderCategorySection(
              'general',
              'General Photos',
              'Interior, exterior, unit photos, and lobby/entrance areas',
              <Home className="w-5 h-5 text-blue-500" />,
            )}
          </TabsContent>

          {/* Floor Plans Tab */}
          <TabsContent value="floorplans" className="mt-0">
            {renderCategorySection(
              'floorplans',
              'Floor Plans',
              'Upload floor plans for each unit type configured in Step 2',
              <Layout className="w-5 h-5 text-indigo-500" />,
            )}
          </TabsContent>

          {/* Amenities Tab */}
          <TabsContent value="amenities" className="mt-0">
            {renderCategorySection(
              'amenities',
              'Amenities',
              'Pool, gym, clubhouse, and other amenities',
              <Sparkles className="w-5 h-5 text-purple-500" />,
            )}
          </TabsContent>

          {/* Outdoors Tab */}
          <TabsContent value="outdoors" className="mt-0">
            {renderCategorySection(
              'outdoors',
              'Outdoor Spaces',
              'Gardens, courtyards, terraces, and outdoor areas',
              <Trees className="w-5 h-5 text-green-500" />,
            )}
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="mt-0">
            {renderCategorySection(
              'videos',
              'Videos',
              'Virtual tours, walkthroughs, and promotional videos',
              <Video className="w-5 h-5 text-red-500" />,
              undefined,
              true,
            )}
          </TabsContent>
        </Tabs>

        {/* Upload Tips */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Professional Media Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1.5">
                <li className="flex items-start gap-2">
                  <Star className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-orange-600" />
                  <span>
                    <strong>Featured:</strong> Choose your best hero image or video (required)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Home className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span>
                    <strong>Photos:</strong> Upload 15-25 high-quality images with natural lighting
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Layout className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-indigo-600" />
                  <span>
                    <strong>Floor Plans:</strong> Upload one per unit type (increases inquiries by
                    40%)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-purple-600" />
                  <span>
                    <strong>Amenities:</strong> Show pool, gym, clubhouse, security features
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Trees className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-600" />
                  <span>
                    <strong>Outdoors:</strong> Gardens, terraces, play areas, parking
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Video className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-600" />
                  <span>
                    <strong>Videos:</strong> Keep under 2 minutes, show walkthroughs and lifestyle
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{media.length}</p>
            <p className="text-xs text-slate-600">Total Media</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {media.filter(m => m.type === 'image').length}
            </p>
            <p className="text-xs text-slate-600">Images</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-indigo-600">{floorplansCount}</p>
            <p className="text-xs text-slate-600">Floor Plans</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
