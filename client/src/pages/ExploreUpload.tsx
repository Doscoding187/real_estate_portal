import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Upload,
  Image as ImageIcon,
  Video,
  X,
  Plus,
  Sparkles,
  CheckCircle,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { canUploadToExploreRole } from '@/lib/exploreUploadAccess';
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

type UploadContentType = 'short' | 'walkthrough' | 'showcase';
type UploadOrientation = 'vertical' | 'horizontal' | 'square';
type UploadCategory = 'property' | 'renovation' | 'finance' | 'investment' | 'services';
type UploadLane = 'general' | 'investment' | 'home_improvements' | 'walkthroughs';

const UPLOAD_LANE_CONFIG: Record<
  UploadLane,
  {
    label: string;
    description: string;
    category: UploadCategory;
    contentTypeOverride?: UploadContentType;
  }
> = {
  general: {
    label: 'General Property',
    description: 'Standard property content and updates',
    category: 'property',
  },
  investment: {
    label: 'Investment & Finance',
    description: 'Investor-focused and finance context content',
    category: 'investment',
  },
  home_improvements: {
    label: 'Home Improvements',
    description: 'Renovation, upgrades, and before/after',
    category: 'renovation',
  },
  walkthroughs: {
    label: 'Walkthroughs',
    description: 'Video tours and guided property walkthroughs',
    category: 'property',
    contentTypeOverride: 'walkthrough',
  },
};

interface UploadDerivedMeta {
  contentType: UploadContentType;
  durationSec: number;
  width: number;
  height: number;
  orientation: UploadOrientation;
}

function deriveOrientation(width: number, height: number): UploadOrientation {
  if (height > width) return 'vertical';
  if (width > height) return 'horizontal';
  return 'square';
}

function pickContentType(meta: {
  mediaType: 'image' | 'video';
  durationSec: number;
  width: number;
  height: number;
  orientation: UploadOrientation;
}): UploadContentType {
  if (meta.mediaType === 'image') {
    return 'showcase';
  }

  const ratio = meta.width / Math.max(1, meta.height);
  const verticalNineSixteen = meta.orientation === 'vertical' && Math.abs(ratio - 9 / 16) <= 0.08;

  if (meta.durationSec <= 90 && verticalNineSixteen) {
    return 'short';
  }

  if (meta.durationSec <= 180) {
    return 'showcase';
  }

  return 'walkthrough';
}

async function readImageMeta(file: File): Promise<{ width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        resolve({
          width: Number(image.naturalWidth || image.width || 0),
          height: Number(image.naturalHeight || image.height || 0),
        });
      };
      image.onerror = () => reject(new Error('Failed to read image metadata'));
      image.src = objectUrl;
    });

    if (!dims.width || !dims.height) {
      throw new Error('Image dimensions are required');
    }

    return dims;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function readVideoMeta(
  file: File,
): Promise<{ width: number; height: number; durationSec: number }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const meta = await new Promise<{ width: number; height: number; durationSec: number }>(
      (resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          resolve({
            width: Number(video.videoWidth || 0),
            height: Number(video.videoHeight || 0),
            durationSec: Math.max(1, Math.round(Number(video.duration || 0))),
          });
        };
        video.onerror = () => reject(new Error('Failed to read video metadata'));
        video.src = objectUrl;
      },
    );

    if (!meta.width || !meta.height) {
      throw new Error('Video dimensions are required');
    }

    return meta;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function deriveUploadMeta(primaryMedia: UploadedMedia): Promise<UploadDerivedMeta> {
  if (primaryMedia.type === 'image') {
    const imageMeta = await readImageMeta(primaryMedia.file);
    const orientation = deriveOrientation(imageMeta.width, imageMeta.height);

    return {
      contentType: 'showcase',
      durationSec: 8,
      width: imageMeta.width,
      height: imageMeta.height,
      orientation,
    };
  }

  const videoMeta = await readVideoMeta(primaryMedia.file);
  const orientation = deriveOrientation(videoMeta.width, videoMeta.height);
  const contentType = pickContentType({
    mediaType: 'video',
    durationSec: videoMeta.durationSec,
    width: videoMeta.width,
    height: videoMeta.height,
    orientation,
  });

  return {
    contentType,
    durationSec: videoMeta.durationSec,
    width: videoMeta.width,
    height: videoMeta.height,
    orientation,
  };
}

export default function ExploreUpload() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const canUploadToExplore = canUploadToExploreRole(user?.role);
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [mediaFiles, setMediaFiles] = useState<UploadedMedia[]>([]);
  const [highlights, setHighlights] = useState<string[]>(['']);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [returnPath, setReturnPath] = useState('/agent/dashboard');
  const [attributeToAgency, setAttributeToAgency] = useState(true);
  const [uploadLane, setUploadLane] = useState<UploadLane>('general');

  // Upload mutations - using presigned URL for S3 upload
  const getPresignedUrl = trpc.video.getPresignedUrl.useMutation();
  const uploadMutation = trpc.explore.uploadShort.useMutation();

  // Check if user is an agent (for agency attribution UI)
  // Requirements 10.3: Show agency attribution status
  const isAgent = user?.role === 'agent';

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12">
        <div className="container max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Log in to upload to Explore</CardTitle>
              <CardDescription>
                Explore viewing is open to everyone, but uploads require a verified platform account.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={() => setLocation('/login')}>Log in</Button>
              <Button variant="outline" onClick={() => setLocation('/explore/feed')}>
                Back to Explore
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!canUploadToExplore) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12">
        <div className="container max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Uploads are limited to verified roles</CardTitle>
              <CardDescription>
                Your current account can watch Explore, but only verified agents, agencies, developers, partners, and admins can upload.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={() => setLocation('/dashboard')}>Go to Dashboard</Button>
              <Button variant="outline" onClick={() => setLocation('/explore/feed')}>
                Back to Explore
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Determine return path based on user role
  const getReturnPath = () => {
    if (user?.role === 'super_admin') return '/admin/overview';
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
      reader.onload = event => {
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
      const primaryMedia = mediaFiles.find(media => media.type === 'video') || mediaFiles[0];
      if (!primaryMedia) {
        throw new Error('No media selected');
      }
      if (uploadLane === 'walkthroughs' && primaryMedia.type !== 'video') {
        throw new Error('Walkthrough uploads require a video file');
      }

      const derivedMeta = await deriveUploadMeta(primaryMedia);
      const laneConfig = UPLOAD_LANE_CONFIG[uploadLane];
      const resolvedCategory = laneConfig.category;
      const resolvedContentType = laneConfig.contentTypeOverride ?? derivedMeta.contentType;

      if (derivedMeta.durationSec > 600) {
        throw new Error('Videos longer than 10 minutes are not supported');
      }

      // Step 1: Upload all media files to S3
      const uploadedUrls: string[] = [];

      for (let i = 0; i < mediaFiles.length; i++) {
        const media = mediaFiles[i];

        toast({
          title: `Uploading ${media.type} ${i + 1}/${mediaFiles.length}`,
          description: 'Please wait...',
        });

        // Get presigned URL
        const presignedData = await getPresignedUrl.mutateAsync({
          fileName: media.file.name,
          fileType: media.file.type,
        });

        if (!presignedData?.uploadUrl || !presignedData?.videoUrl) {
          throw new Error(`Failed to get upload URL for ${media.file.name}`);
        }

        // Upload to S3
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.addEventListener('load', () => {
            if (xhr.status === 200 || xhr.status === 204) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
          });

          xhr.open('PUT', presignedData.uploadUrl);
          xhr.setRequestHeader('Content-Type', media.file.type);
          xhr.send(media.file);
        });

        // Store the S3 URL
        uploadedUrls.push(presignedData.videoUrl);
      }

      // Step 2: Save to database with S3 URLs
      await uploadMutation.mutateAsync({
        title: title.trim(),
        caption: caption.trim() || undefined,
        mediaUrls: uploadedUrls, // Now using S3 URLs instead of data URLs
        contentType: resolvedContentType,
        category: resolvedCategory,
        durationSec: derivedMeta.durationSec,
        width: derivedMeta.width,
        height: derivedMeta.height,
        orientation: derivedMeta.orientation,
        highlights:
          highlights.filter(h => h.trim()).length > 0
            ? highlights.filter(h => h.trim())
            : undefined,
        listingId: selectedListingId || undefined,
        attributeToAgency, // NEW: Pass agency attribution preference
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
        description:
          error instanceof Error
            ? error.message
            : 'There was an error uploading your content. Please try again.',
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
          <Button variant="ghost" onClick={() => setLocation('/explore')} className="mb-4">
            {'<- Back to Explore'}
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
                            <video src={media.url} className="w-full h-full object-cover" muted />
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
                <CardDescription>Add a compelling title and description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
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
                    onChange={e => setCaption(e.target.value)}
                    placeholder="Add a description to engage viewers..."
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {caption.length}/500 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="upload-lane">Explore Lane *</Label>
                  <select
                    id="upload-lane"
                    value={uploadLane}
                    onChange={e => setUploadLane(e.target.value as UploadLane)}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    required
                  >
                    {Object.entries(UPLOAD_LANE_CONFIG).map(([key, lane]) => (
                      <option key={key} value={key}>
                        {lane.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {UPLOAD_LANE_CONFIG[uploadLane].description}
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
                <CardDescription>Add up to 4 key features (optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {highlights.map((highlight, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={highlight}
                      onChange={e => updateHighlight(index, e.target.value)}
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

            {/* Agency Attribution - Only shown for agents */}
            {/* Requirements 10.3, 10.4: Show agency attribution status and opt-out option */}
            {isAgent && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    Agency Attribution
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    Your content will be attributed to your agency
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-blue-200">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                        {(
                          user?.firstName?.charAt(0) ||
                          (user as any)?.name?.charAt(0) ||
                          user?.email?.charAt(0) ||
                          'A'
                        ).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Your Agency</p>
                        <p className="text-sm text-gray-600">
                          This content will help build your agency's brand presence
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                      <input
                        type="checkbox"
                        id="attributeToAgency"
                        checked={attributeToAgency}
                        onChange={e => setAttributeToAgency(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="attributeToAgency"
                        className="text-sm text-gray-700 cursor-pointer"
                      >
                        Attribute this content to my agency
                      </label>
                    </div>

                    {!attributeToAgency && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> Content will be attributed to you individually, not
                          your agency.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

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
                window.open('/explore/feed', '_blank');
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
