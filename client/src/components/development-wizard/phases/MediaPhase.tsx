import React, { useRef, useState } from 'react';
import { useDevelopmentWizard, type MediaItem } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
    Upload, X, Star, Image as ImageIcon, Video, TreePine, Dumbbell, 
    FileText, MapPin, Layout, ShieldCheck, AlertCircle, CheckCircle2,
    ArrowRight, ArrowLeft
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

export function MediaPhase() {
  const { 
    developmentData, 
    addMedia, 
    removeMedia, 
    setPrimaryImage, 
    setPhase, 
    validatePhase 
  } = useDevelopmentWizard();

  const [activeTab, setActiveTab] = useState('gallery');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Statistics Calculation
  const heroImage = developmentData.media?.heroImage;
  const photos = developmentData.media?.photos || [];
  const videos = developmentData.media?.videos || [];
  const documents = developmentData.media?.documents || [];

  const featuredCount = photos.filter(p => p.category === 'featured').length;
  const galleryCount = photos.filter(p => p.category !== 'featured').length + featuredCount; // All photos count as gallery
  
  // Progress Calculation - Simplified: Hero + Gallery
  const hasHero = !!heroImage;
  const hasMinGallery = galleryCount >= 3;
  
  const progressPercent = [
      hasHero ? 50 : 0, 
      Math.min(galleryCount, 5) * 10   // Max 50 (5 items)
  ].reduce((a, b) => a + b, 0);


  const presignMutation = trpc.upload.presign.useMutation();

  const handleNext = () => {
    const { isValid, errors } = validatePhase(9); 
    if (isValid) {
      setPhase(10); // Go to Unit Types
    } else {
      errors.forEach(e => toast.error(e));
    }
  };

  const handleBack = () => {
    setPhase(8); // Back to Marketing Summary
  };

  const UploadSection = ({ 
    category, 
    title, 
    description, 
    icon: Icon,
    isHero = false,
    acceptedTypes = "image/*"
  }: { 
    category: MediaItem['category'], 
    title: string, 
    description: string, 
    icon: any,
    isHero?: boolean,
    acceptedTypes?: string
  }) => {
    // Filter items for this view
    let items: MediaItem[] = [];
    if (isHero) {
        items = heroImage ? [heroImage] : [];
    } else if (category === 'featured') {
        items = photos.filter(p => p.category === 'featured');
    } else if (category === 'videos') {
        items = videos;
    } else if (category === 'document') {
        items = documents;
    } else {
        items = photos.filter(p => p.category === category);
    }

    const [isDragging, setIsDragging] = useState(false);

    const processFiles = async (files: File[]) => {
        const uploads = files.map(async (file) => {
            const loadingToast = toast.loading(`Uploading ${file.name}...`);
            const optimisticUrl = URL.createObjectURL(file); 
            
            try {
                // Determine Type
                let type: MediaItem['type'] = 'image';
                if (file.type.startsWith('video')) type = 'video';
                if (file.type === 'application/pdf') type = 'pdf';

                const { url: uploadUrl, publicUrl } = await presignMutation.mutateAsync({
                    filename: file.name,
                    contentType: file.type,
                });

                await fetch(uploadUrl, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': file.type }
                });

                URL.revokeObjectURL(optimisticUrl);
                toast.dismiss(loadingToast);
                toast.success('Upload complete');
                
                addMedia({
                    url: publicUrl,
                    type,
                    category: isHero ? 'featured' : category, // Hero is stored as featured but flagged primary
                    isPrimary: isHero,
                    fileName: file.name
                });

            } catch (error) {
                console.error('Upload failed:', error);
                toast.error(`Failed to upload ${file.name}`, { id: loadingToast });
            }
        });
        
        await Promise.all(uploads);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-100 rounded-lg">
                <Icon className="w-5 h-5 text-slate-600" />
            </div>
            <div>
                <h3 className="font-semibold text-base text-slate-900">{title}</h3>
                <p className="text-sm text-slate-500">{description}</p>
            </div>
        </div>

        {/* Dropzone */}
        {(items.length === 0 || !isHero) && (
             <div 
                className={cn(
                    "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group min-h-[160px]",
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={async (e) => { 
                    e.preventDefault(); 
                    setIsDragging(false);
                    if(e.dataTransfer.files.length) await processFiles(Array.from(e.dataTransfer.files));
                }}
                onClick={(e) => {
                     // Find the input relative to this component instance
                     const input = e.currentTarget.querySelector('input');
                     input?.click();
                }}
            >
                <div className="mb-3 p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <Upload className={cn("w-5 h-5", isDragging ? 'text-blue-600' : 'text-slate-400')} />
                </div>
                <p className="text-sm font-medium text-slate-900">
                    {isDragging ? 'Drop files here' : `Click to upload ${isHero ? 'Hero Image' : 'files'}`}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                   {category === 'videos' ? 'MP4, WebM (Max 100MB)' : category === 'document' ? 'PDF (Max 10MB)' : 'JPG, PNG, WebP (Max 5MB)'}
                </p>
                <input 
                    type="file" 
                    className="hidden" 
                    multiple={!isHero}
                    accept={acceptedTypes}
                    onClick={(e) => e.stopPropagation()} // Stop bubbling to div
                    onChange={(e) => {
                        if (e.target.files) processFiles(Array.from(e.target.files));
                        e.target.value = '';
                    }}
                />
            </div>
        )}

        {/* File List / Grid */}
        {items.length > 0 && (
            <div className={cn(
                "grid gap-4", 
                category === 'document' ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
            )}>
            {items.map((item) => (
                <div key={item.id} className={cn(
                    "relative group rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm hover:shadow-md transition-all",
                    category === 'document' ? "flex items-center p-3 gap-3" : "aspect-[4/3]"
                )}>
                    {category === 'document' ? (
                        <>
                           <div className="p-2 bg-red-50 rounded text-red-600">
                              <FileText className="w-6 h-6" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{item.fileName || 'Document'}</p>
                              <p className="text-xs text-slate-500">PDF Document</p>
                           </div>
                        </>
                    ) : item.type === 'video' ? (
                        <video src={item.url} className="w-full h-full object-cover" controls={false} />
                    ) : (
                        <img src={item.url} alt="Media" className="w-full h-full object-cover" />
                    )}
                    
                    {/* Overlay Actions */}
                    <div className={cn(
                        "absolute right-2 flex gap-1",
                        category === 'document' ? "top-1/2 -translate-y-1/2" : "top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1 rounded-lg"
                    )}>
                        <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-7 w-7" 
                            onClick={(e) => { e.stopPropagation(); removeMedia(item.id); }}
                        >
                            <X className="w-3 h-3" />
                        </Button>
                    </div>

                    {category !== 'document' && (
                       <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isHero && <span className="text-[10px] text-yellow-300 font-bold uppercase tracking-wider">Primary Hero</span>}
                       </div>
                    )}
                </div>
            ))}
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between gap-6">
         <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Development Media</h2>
            <p className="text-slate-600">Visuals are critical for engagement. Start with a stunning hero image.</p>
         </div>

         <div className="w-full md:w-80 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
             <div className="flex justify-between text-sm font-medium mb-1">
                 <span className="text-slate-700">Media Quality Score</span>
                 <span className={cn(progressPercent >= 100 ? "text-green-600" : "text-blue-600")}>
                    {Math.round(progressPercent)}%
                 </span>
             </div>
             <Progress value={progressPercent} className="h-2" />
             <div className="space-y-1 pt-2">
                 <div className="flex items-center gap-2 text-xs">
                    {hasHero ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500"/> : <AlertCircle className="w-3.5 h-3.5 text-amber-500"/>}
                    <span className={hasHero ? "text-slate-600" : "text-slate-400"}>Hero Image (Required)</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs">
                    {hasMinGallery ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500"/> : <AlertCircle className="w-3.5 h-3.5 text-slate-300"/>}
                    <span className={hasMinGallery ? "text-slate-600" : "text-slate-400"}>Gallery Images ({galleryCount}/3+)</span>
                 </div>
             </div>
         </div>
      </div>

      <div className="space-y-6">
         {/* Hero Section */}
         <Card>
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
               <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> Hero Image
               </CardTitle>
               <CardDescription>The main face of your development. This appears at the top of your listing.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
               <UploadSection 
                  category="featured"
                  title="Hero Image"
                  description="Upload a high-quality image that best represents your development."
                  icon={Star}
                  isHero={true}
               />
            </CardContent>
         </Card>

         {/* Gallery Tabs */}
         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-semibold text-slate-900">Media Gallery</h3>
               <TabsList className="bg-slate-100">
                  <TabsTrigger value="gallery">Photos</TabsTrigger>
                  <TabsTrigger value="videos">Videos</TabsTrigger>
                  <TabsTrigger value="docs">
                     Documents 
                     {documents.length > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1">{documents.length}</Badge>}
                  </TabsTrigger>
               </TabsList>
            </div>

            <TabsContent value="gallery" className="mt-0 space-y-6">
                <Card>
                   <CardContent className="pt-6 grid gap-8">
                       <UploadSection category="outdoors" title="Exterior & Outdoors" description="Facades, gardens, and landscaping." icon={TreePine} />
                       <UploadSection category="general" title="Interior & Living" description="Living areas, bedrooms, and finishes." icon={ImageIcon} />
                       <UploadSection category="amenities" title="Amenities" description="Pool, gym, and shared spaces." icon={Dumbbell} />
                       <UploadSection category="location" title="Location & Views" description="Neighborhood and scenic views." icon={MapPin} />
                       <UploadSection category="general" title="Aerial & Drone" description="Site overview and scale." icon={Layout} />
                   </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="videos" className="mt-0">
               <Card>
                  <CardContent className="pt-6">
                     <UploadSection 
                        category="videos" 
                        title="Videos & Virtual Tours" 
                        description="Upload walkthroughs (MP4)." 
                        icon={Video}
                        acceptedTypes="video/*"
                     />
                     {/* Placeholder for Link Input if needed later */}
                  </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="docs" className="mt-0">
               <Card>
                  <CardContent className="pt-6">
                     <UploadSection 
                        category="document" 
                        title="Brochures & Floor Plans" 
                        description="Downloadable PDFs for buyers." 
                        icon={FileText}
                        acceptedTypes="application/pdf"
                     />
                  </CardContent>
               </Card>
            </TabsContent>
         </Tabs>
      </div>

      <div className="flex justify-between pt-8 border-t border-slate-200">
        <Button variant="outline" onClick={handleBack} className="px-6 h-11 border-slate-300">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button 
          onClick={handleNext} 
          size="lg" 
          disabled={!hasHero} // Only require Hero Image
          className={cn(
              "px-8 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300",
              !hasHero && "opacity-50 cursor-not-allowed"
          )}
        >
          Continue to Unit Types
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
