/**
 * LogoUploadZone Component
 * Drag-and-drop logo upload with gradient styling and preview
 * Part of the Soft UI design system
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import * as React from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LogoUploadZoneProps {
  /**
   * Current logo URL (if any)
   */
  value?: string | null;
  /**
   * Callback when file is selected
   */
  onChange?: (file: File | null) => void;
  /**
   * Callback for upload progress (0-100)
   */
  onUploadProgress?: (progress: number) => void;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Whether upload is in progress
   */
  uploading?: boolean;
  /**
   * Upload progress percentage (0-100)
   */
  uploadProgress?: number;
  /**
   * Maximum file size in MB
   */
  maxSizeMB?: number;
  /**
   * Accepted file types
   */
  acceptedTypes?: string[];
  /**
   * Additional className
   */
  className?: string;
}

const DEFAULT_ACCEPTED_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/gif'];
const DEFAULT_MAX_SIZE_MB = 2;

export const LogoUploadZone = React.forwardRef<HTMLDivElement, LogoUploadZoneProps>(
  (
    {
      value,
      onChange,
      onUploadProgress,
      error,
      uploading = false,
      uploadProgress = 0,
      maxSizeMB = DEFAULT_MAX_SIZE_MB,
      acceptedTypes = DEFAULT_ACCEPTED_TYPES,
      className,
    },
    ref,
  ) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const [preview, setPreview] = React.useState<string | null>(value || null);
    const [localError, setLocalError] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const displayError = error || localError;

    // Update preview when value changes
    React.useEffect(() => {
      setPreview(value || null);
    }, [value]);

    const validateFile = (file: File): string | null => {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        return `Invalid file type. Accepted types: ${acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`;
      }

      // Check file size
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        return `File size exceeds ${maxSizeMB}MB limit`;
      }

      return null;
    };

    const handleFile = (file: File) => {
      setLocalError(null);

      const validationError = validateFile(file);
      if (validationError) {
        setLocalError(validationError);
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Call onChange
      onChange?.(file);
    };

    const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    };

    const handleClick = () => {
      fileInputRef.current?.click();
    };

    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      setPreview(null);
      setLocalError(null);
      onChange?.(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        {/* Upload Zone */}
        <div
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            'relative flex flex-col items-center justify-center',
            'min-h-[200px] p-6 rounded-xl',
            'border-2 border-dashed',
            'transition-all duration-300 ease-in-out',
            'cursor-pointer',
            // Default state
            !isDragging &&
              !displayError && [
                'border-gray-300 bg-gray-50',
                'hover:border-blue-400 hover:bg-blue-50/50',
              ],
            // Dragging state
            isDragging && [
              'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50',
              'scale-[1.02]',
            ],
            // Error state
            displayError && ['border-red-300 bg-red-50/50', 'hover:border-red-400'],
            // Disabled when uploading
            uploading && 'pointer-events-none opacity-75',
          )}
          role="button"
          tabIndex={0}
          aria-label="Upload logo"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            aria-label="File input"
          />

          {/* Preview or Upload UI */}
          {preview ? (
            <div className="relative">
              <div
                className={cn(
                  'w-32 h-32 rounded-full overflow-hidden',
                  'border-4 border-white shadow-lg',
                  'bg-gradient-to-br from-blue-100 to-indigo-100',
                )}
              >
                <img
                  src={preview}
                  alt="Logo preview"
                  className="w-full h-full object-contain p-2"
                />
              </div>
              {!uploading && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className={cn(
                    'absolute -top-2 -right-2',
                    'flex items-center justify-center',
                    'w-8 h-8 rounded-full',
                    'bg-red-500 text-white',
                    'hover:bg-red-600',
                    'transition-colors duration-200',
                    'shadow-md hover:shadow-lg',
                    'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
                  )}
                  aria-label="Remove logo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <div
                className={cn(
                  'flex items-center justify-center',
                  'w-16 h-16 rounded-full',
                  'bg-gradient-to-br from-blue-500 to-indigo-600',
                  'transition-transform duration-300',
                  isDragging && 'scale-110',
                )}
              >
                {uploading ? (
                  <ImageIcon className="w-8 h-8 text-white animate-pulse" />
                ) : (
                  <Upload className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {isDragging ? 'Drop your logo here' : 'Upload company logo'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Drag & drop or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">
                  {acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')} • Max{' '}
                  {maxSizeMB}MB
                </p>
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploading && uploadProgress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200 rounded-b-xl overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          )}
        </div>

        {/* Error Message */}
        {displayError && (
          <div
            className={cn(
              'flex items-start gap-2 p-3 rounded-lg',
              'bg-red-50 border border-red-200',
              'text-sm text-red-700',
              'animate-in fade-in slide-in-from-top-2',
            )}
            role="alert"
          >
            <span className="font-medium">Error:</span>
            <span>{displayError}</span>
          </div>
        )}
      </div>
    );
  },
);

LogoUploadZone.displayName = 'LogoUploadZone';
