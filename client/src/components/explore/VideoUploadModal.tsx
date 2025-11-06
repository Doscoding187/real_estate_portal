import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import { Loader2, Upload, X, Play } from 'lucide-react';

interface VideoUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function VideoUploadModal({ open, onClose, onSuccess }: VideoUploadModalProps) {
  const [step, setStep] = useState<'type' | 'details' | 'upload'>('type');
  const [videoType, setVideoType] = useState<'listing' | 'content'>('content');
  const [form, setForm] = useState({
    propertyId: '',
    developmentId: '',
    caption: '',
    duration: 0,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // tRPC hooks
  const getPresignedUrl = trpc.video.getPresignedUrl.useMutation();
  const uploadVideo = trpc.video.uploadVideo.useMutation();
  const getAgentProperties = trpc.agent.getMyListings.useQuery(
    { status: 'available', limit: 100 },
    { enabled: videoType === 'listing' },
  );

  const resetModal = () => {
    setStep('type');
    setVideoType('content');
    setForm({ propertyId: '', developmentId: '', caption: '', duration: 0 });
    setSelectedFile(null);
    setUploadProgress(0);
    setErrors({});
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const validateStep = (currentStep: string) => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 'details') {
      if (videoType === 'listing') {
        if (!form.propertyId && !form.developmentId) {
          newErrors.propertyId = 'Please select a property or development';
        }
      }
    }

    if (currentStep === 'upload') {
      if (!selectedFile) {
        newErrors.file = 'Please select a video file';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;

    if (step === 'type') {
      setStep('details');
    } else if (step === 'details') {
      setStep('upload');
    }
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('type');
    } else if (step === 'upload') {
      setStep('details');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setErrors({ file: 'Please select a valid video file' });
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setErrors({ file: 'Video file must be less than 100MB' });
      return;
    }

    setSelectedFile(file);
    setErrors({ ...errors, file: '' });

    // Get video duration
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      setForm({ ...form, duration: Math.round(video.duration) });
      URL.revokeObjectURL(video.src);
    };

    video.src = URL.createObjectURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !validateStep('upload')) return;

    try {
      // Step 1: Get presigned URL
      const { uploadUrl, videoUrl } = await getPresignedUrl.mutateAsync({
        fileName: selectedFile.name,
        fileType: selectedFile.type,
      });

      // Step 2: Upload to S3
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(progress);
        }
      });

      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', selectedFile.type);
      xhr.send(selectedFile);

      await uploadPromise;

      // Step 3: Save video record
      await uploadVideo.mutateAsync({
        propertyId: form.propertyId ? parseInt(form.propertyId) : undefined,
        developmentId: form.developmentId ? parseInt(form.developmentId) : undefined,
        videoUrl,
        caption: form.caption || undefined,
        type: videoType,
        duration: form.duration,
      });

      // Success
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error('Upload failed:', error);
      setErrors({ upload: 'Upload failed. Please try again.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {['type', 'details', 'upload'].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === stepName
                      ? 'bg-primary text-primary-foreground'
                      : index < ['type', 'details', 'upload'].indexOf(step)
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </div>
                <span
                  className={`ml-2 text-sm capitalize ${
                    step === stepName ? 'font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {stepName}
                </span>
                {index < 2 && <div className="w-8 h-px bg-muted mx-4" />}
              </div>
            ))}
          </div>

          {/* Step Content */}
          {step === 'type' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Choose Video Type</h3>
              <div className="grid gap-4">
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    videoType === 'listing'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => setVideoType('listing')}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      checked={videoType === 'listing'}
                      onChange={() => setVideoType('listing')}
                      className="text-primary"
                    />
                    <div>
                      <h4 className="font-medium">Listing Video</h4>
                      <p className="text-sm text-muted-foreground">
                        Showcase a specific property that's for sale or rent
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    videoType === 'content'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => setVideoType('content')}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      checked={videoType === 'content'}
                      onChange={() => setVideoType('content')}
                      className="text-primary"
                    />
                    <div>
                      <h4 className="font-medium">Content Video</h4>
                      <p className="text-sm text-muted-foreground">
                        Informative or promotional content (no active listing)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Video Details</h3>

              {videoType === 'listing' && (
                <div>
                  <label className="text-sm font-medium">Select Property</label>
                  <Select
                    value={form.propertyId}
                    onValueChange={value => setForm({ ...form, propertyId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a property" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAgentProperties.data?.map(property => (
                        <SelectItem key={property.id} value={property.id.toString()}>
                          {property.title} - {property.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.propertyId && (
                    <p className="text-sm text-red-500 mt-1">{errors.propertyId}</p>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Caption (Optional)</label>
                <Textarea
                  placeholder="Add a caption to your video..."
                  value={form.caption}
                  onChange={e => setForm({ ...form, caption: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Upload Video</h3>

              {!selectedFile ? (
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Choose video file</p>
                  <p className="text-sm text-muted-foreground">
                    Supports MP4, MOV, AVI. Max size: 100MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Play className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                          {form.duration > 0 &&
                            ` • ${Math.floor(form.duration / 60)}:${(form.duration % 60).toString().padStart(2, '0')}`}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {getPresignedUrl.isLoading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {errors.upload && <p className="text-sm text-red-500">{errors.upload}</p>}
                </div>
              )}

              {errors.file && <p className="text-sm text-red-500">{errors.file}</p>}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <div>
              {step !== 'type' && (
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>

              {step === 'upload' ? (
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || getPresignedUrl.isLoading || uploadVideo.isLoading}
                >
                  {getPresignedUrl.isLoading || uploadVideo.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Video'
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext}>Next</Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
