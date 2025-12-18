import React, { useRef, useState } from 'react';
import { useDevelopmentWizard, type MediaItem } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload, X, Star, Image as ImageIcon, Video, TreePine, Dumbbell } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function MediaPhase() {
  const { 
    developmentData, 
    addMedia, 
    removeMedia, 
    updateMedia,
    setPrimaryImage, 
    setPhase, 
    validatePhase 
  } = useDevelopmentWizard();

  const [activeTab, setActiveTab] = useState('featured');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to filter media by category
  // Note: Hero image is always 'featured'
  const getMediaByCategory = (category: string) => {
    const all = [
      ...(developmentData.media.heroImage ? [{ ...developmentData.media.heroImage, isPrimary: true }] : []),
      ...(developmentData.media.photos || []).map(p => ({ ...p, isPrimary: false })),
      ...(developmentData.media.videos || []).map(v => ({ ...v, isPrimary: false }))
    ];

    if (category === 'featured') {
      return all.filter(item => item.isPrimary || item.category === 'featured'); 
    }
    if (category === 'videos') {
      return all.filter(item => item.type === 'video' || item.category === 'videos');
    }
    // General bucket often catches everything else, but here we want specific
    return all.filter(item => !item.isPrimary && item.type !== 'video' && (item.category === category || (category === 'general' && !['amenities', 'outdoors'].includes(item.category))));
  };

  const presignMutation = trpc.upload.presign.useMutation();

  const handleNext = () => {
    // Phase 6 = Media, next is Phase 7 = Unit Types
    const { isValid, errors } = validatePhase(6); 
    if (isValid) {
      setPhase(7); // Go to Unit Types
    } else {
      errors.forEach(e => toast.error(e));
    }
  };

  const handleBack = () => {
    setPhase(5); // Back to Amenities
  };

  const UploadSection = ({ 
    category, 
    title, 
    description, 
    icon: Icon 
  }: { 
    category: MediaItem['category'], 
    title: string, 
    description: string, 
    icon: any 
  }) => {
    const items = getMediaByCategory(category === 'featured' ? 'featured' : category);
    const [isDragging, setIsDragging] = useState(false);

    // DnD Handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await processFiles(files, category);
        }
    };

    // Shared File Processing Logic
    const processFiles = async (files: File[], targetCategory: MediaItem['category']) => {
        const uploads = files.map(async (file) => {
            const loadingToast = toast.loading(`Uploading ${file.name}...`);
            const optimisticUrl = URL.createObjectURL(file); // For preview during upload (not stored)
            const isVideo = file.type.startsWith('video');

            try {
                // 1. Get Presigned URL
                const { url: uploadUrl, publicUrl } = await presignMutation.mutateAsync({
                    filename: file.name,
                    contentType: file.type,
                });

                // 2. Upload to S3
                const uploadRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': file.type }
                });

                if (!uploadRes.ok) throw new Error('Upload to storage failed');

                // 3. Cleanup optimistic URL
                URL.revokeObjectURL(optimisticUrl);
                
                toast.dismiss(loadingToast);
                toast.success('Upload complete');
                
                // 4. Add media with real URL (only once, after successful upload)
                addMedia({
                    url: publicUrl,
                    type: isVideo ? 'video' : 'image',
                    category: isVideo ? 'videos' : targetCategory,
                    isPrimary: targetCategory === 'featured'
                });

            } catch (error) {
                console.error('Upload failed:', error);
                toast.error(`Failed to upload ${file.name}`, { id: loadingToast });
            }
        });
        
        await Promise.all(uploads);
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
                <Icon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
                <h3 className="font-semibold text-lg text-slate-900">{title}</h3>
                <p className="text-sm text-slate-500">{description}</p>
            </div>
        </div>

        <div 
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group
                ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50/50 hover:border-blue-400/50'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={(e) => {
                 // Prevent click if we just dropped? No, simple click handler.
                 fileInputRef.current?.click();
            }}
        >
            <div className="mb-4 p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300">
                <Upload className={`w-6 h-6 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
            <p className="text-sm font-medium text-slate-900">
                {isDragging ? 'Drop files here' : `Click or drag to upload ${title}`}
            </p>
            <p className="text-xs text-slate-500 mt-1">
                {category === 'videos' ? 'MP4, WebM' : 'JPG, PNG'}
            </p>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple 
                accept={category === 'videos' ? "video/*" : "image/*"}
                onChange={(e) => {
                    if (e.target.files) processFiles(Array.from(e.target.files), category);
                    // Reset input so same file can be selected again if needed
                    e.target.value = '';
                }}
            />
        </div>

        {items.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
                <div key={item.id} className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                {item.type === 'video' ? (
                    <video src={item.url} className="w-full h-full object-cover" controls={false} />
                ) : (
                    <img src={item.url} alt="Media" className="w-full h-full object-cover" />
                )}
                
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {item.type !== 'video' && (
                        <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8 bg-white/90 hover:bg-white transition-colors" 
                            onClick={(e) => {
                                e.stopPropagation();
                                setPrimaryImage(item.id);
                            }} 
                            title="Set as Hero"
                        >
                            <Star className={`w-4 h-4 ${item.isPrimary ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`} />
                        </Button>
                    )}
                    <Button 
                        variant="destructive" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={(e) => {
                            e.stopPropagation();
                            removeMedia(item.id);
                        }}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                {item.isPrimary && (
                    <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        HERO
                    </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white/90 font-medium truncate capitalize">
                        {item.category}
                    </p>
                </div>
                </div>
            ))}
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6 h-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col md:flex-row gap-6">
            
            {/* Sidebar Tabs for Desktop / horizontal for mobile */}
            <div className="w-full md:w-64 flex-shrink-0">
                <Card className="h-full border-slate-200/60 shadow-sm">
                    <CardContent className="p-4">
                        <TabsList className="flex flex-row md:flex-col h-auto bg-transparent p-0 gap-1 w-full justify-start overflow-x-auto md:overflow-visible">
                            <TabsTrigger 
                                value="featured" 
                                className="w-full justify-start px-4 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-slate-600 rounded-lg transition-all"
                            >
                                <Star className="w-4 h-4 mr-2" />
                                Featured & Hero
                            </TabsTrigger>
                            <TabsTrigger 
                                value="general" 
                                className="w-full justify-start px-4 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-slate-600 rounded-lg transition-all"
                            >
                                <ImageIcon className="w-4 h-4 mr-2" />
                                General Photos
                            </TabsTrigger>
                            <TabsTrigger 
                                value="outdoors" 
                                className="w-full justify-start px-4 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-slate-600 rounded-lg transition-all"
                            >
                                <TreePine className="w-4 h-4 mr-2" />
                                Outdoors
                            </TabsTrigger>
                            <TabsTrigger 
                                value="amenities" 
                                className="w-full justify-start px-4 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-slate-600 rounded-lg transition-all"
                            >
                                <Dumbbell className="w-4 h-4 mr-2" />
                                Amenities
                            </TabsTrigger>
                            <TabsTrigger 
                                value="videos" 
                                className="w-full justify-start px-4 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-slate-600 rounded-lg transition-all"
                            >
                                <Video className="w-4 h-4 mr-2" />
                                Videos
                            </TabsTrigger>
                        </TabsList>
                    </CardContent>
                </Card>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-[500px]">
                <Card className="h-full border-slate-200/60 shadow-sm">
                    <CardContent className="p-6 md:p-8">
                        <TabsContent value="featured" className="mt-0 focus-visible:ring-0">
                            <UploadSection 
                                category="featured" 
                                title="Hero & Featured Images" 
                                description="Select your best shot. The Hero image will be the main cover of your development listing."
                                icon={Star}
                            />
                        </TabsContent>
                        <TabsContent value="general" className="mt-0 focus-visible:ring-0">
                            <UploadSection 
                                category="general" 
                                title="General Interior" 
                                description="Upload general shots of the development, living areas, and communal spaces."
                                icon={ImageIcon}
                            />
                        </TabsContent>
                        <TabsContent value="outdoors" className="mt-0 focus-visible:ring-0">
                            <UploadSection 
                                category="outdoors" 
                                title="Outdoors & Exterior" 
                                description="Showcase the facade, gardens, balconies, and surrounding environment."
                                icon={TreePine}
                            />
                        </TabsContent>
                        <TabsContent value="amenities" className="mt-0 focus-visible:ring-0">
                            <UploadSection 
                                category="amenities" 
                                title="Amenities & Lifestyle" 
                                description="Gyms, pools, concierge desks, and other lifestyle features."
                                icon={Dumbbell}
                            />
                        </TabsContent>
                        <TabsContent value="videos" className="mt-0 focus-visible:ring-0">
                            <UploadSection 
                                category="videos" 
                                title="Videos & Virtual Tours" 
                                description="Upload promotional videos or walkthroughs."
                                icon={Video}
                            />
                        </TabsContent>
                    </CardContent>
                </Card>
            </div>
        </Tabs>
      </div>

      <div className="flex justify-between pt-8 mt-8 border-t border-slate-200">
        <Button variant="outline" onClick={handleBack} size="lg" className="px-8">Back</Button>
        <Button 
          onClick={handleNext} 
          size="lg" 
          className="px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
        >
          Continue to Unit Types
        </Button>
      </div>
    </div>
  );
}
