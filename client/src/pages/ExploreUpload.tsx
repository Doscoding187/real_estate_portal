import { useState } from 'react';
import { useLocation } from 'wouter';
import { Upload, Image as ImageIcon, Video, X, Plus, Sparkles, CheckCircle, Eye, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UploadedMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  file: File;
}

export default function ExploreUpload() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [mediaFiles, setMediaFiles] = useState<UploadedMedia[]>([]);
  const [highlights, setHighlights] = useState<string[]>(['']);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [returnPath, setReturnPath] = useState('/agent/dashboard');

  // Upload mutation
  const uploadMutation = trpc.explore.uploadShort.useMutation();

  // Redirect if not authenticated
  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  // Determine return path based on user role
  const getReturnPath = () => {
    if (user?.role === 'agent') return '/agent/dashboard';
    if (user?.role === 'property_developer') return '/developer/dashboard';
    if (user?.role === 'agency_admin') return '/agency/dashboard';
    return '/dashboard';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload only images or videos',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const newMedia: UploadedMedia = {
          id: Math.random().toString(36).substr(2, 9),
          url: event.target?.result as string,
          type: isImage ? 'image' : 'video',
          file,
        };
        setMediaFiles(prev => [...prev, newMedia]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (id: string) => {
    setMediaFiles(prev => prev.filter(m => m.id !== id));
  };

  const addHighlight = () => {
    if (highlights.length < 4) {
      setHighlights([...highlights, '']);
    }
  };

  const updateHighlight = (index: number, value: string) => {
    const newHighlights = [...highlights];
    newHighlights[index] = value;
    setHighlights(newHighlights);
  };

  const removeHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your content',
        variant: 'destructive',
      });
      return;
    }

    if (mediaFiles.length === 0) {
      toast({
        title: 'Media required',
        description: 'Please upload at least one image or video',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload to backend
      const result = await uploadMutation.mutateAsync({
        title: title.trim(),
        caption: caption.trim() || undefined,
        mediaUrls: mediaFiles.map(m => m.url), // Using data URLs for now
        highlights: highlights.filter(h => h.trim()).length > 0 
          ? highlights.filter(h => h.trim()) 
          : undefined,
        listingId: selectedListingId || undefined,
      });

      // Reset form
      setTitle('');
      setCaption('');
      setMediaFiles([]);
      setHighlights(['']);
      
      // Set return path and show success modal
      setReturnPath(getReturnPath());
      setShowSuccessModal(true);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'There was an error uploading your content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/explore')}
            className="mb-4"
          >
            ← Back to Explore
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Upload to Explore
          </h1>
          <p className="text-muted-foreground text-lg">
            Share your property content with thousands of potential buyers
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Media Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Media
                </CardTitle>
                <CardDescription>
                  Add photos or videos of your property (max 10 files)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Upload Button */}
                <div className="mb-4">
                  <label htmlFor="media-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        Images (JPG, PNG) or Videos (MP4, MOV) up to 50MB
                      </p>
                    </div>
                    <input
                      id="media-upload"
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={mediaFiles.length >= 10}
                    />
                  </label>
                </div>

                {/* Media Preview Grid */}
                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {mediaFiles.map((media, index) => (
                      <div key={media.id} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                          {media.type === 'image' ? (
                            <img
                              src={media.url}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={media.url}
                              className="w-full h-full object-cover"
                              muted
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMedia(media.id)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Primary
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Content Details */}
            <Card>
              <CardHeader>
                <CardTitle>Content Details</CardTitle>
                <CardDescription>
                  Add a compelling title and description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Stunning 3BR Apartment in Sandton"
                    maxLength={255}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="caption">Caption</Label>
                  <Textarea
                    id="caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a description to engage viewers..."
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {caption.length}/500 characters
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Highlights
                </CardTitle>
                <CardDescription>
                  Add up to 4 key features (optional)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {highlights.map((highlight, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={highlight}
                      onChange={(e) => updateHighlight(index, e.target.value)}
                      placeholder={`Highlight ${index + 1}`}
                      maxLength={50}
                    />
                    {highlights.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHighlight(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {highlights.length < 4 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addHighlight}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Highlight
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/explore')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploading || mediaFiles.length === 0 || !title.trim()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isUploading ? 'Uploading...' : 'Publish to Explore'}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-green-100 to-emerald-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-center text-2xl">Upload Successful!</DialogTitle>
            <DialogDescription className="text-center text-base">
              Your content has been published to Explore and is now live for everyone to see.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                window.open('/explore', '_blank');
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Eye className="mr-2 h-4 w-4" />
              View on Explore
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessModal(false);
                setLocation(returnPath);
              }}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => {
                setShowSuccessModal(false);
              }}
              className="w-full"
            >
              Upload Another
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
