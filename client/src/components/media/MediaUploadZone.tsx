/**
 * Media Upload Zone Component
 *
 * Drag-and-drop file upload zone with validation and visual feedback
 */

import React, { useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, AlertCircle, FileImage, FileVideo, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface MediaUploadZoneProps {
  /**
   * Callback when files are uploaded
   */
  onUpload: (files: File[]) => void;

  /**
   * Maximum number of files allowed
   * @default 30
   */
  maxFiles?: number;

  /**
   * Maximum file size in MB
   * @default 5
   */
  maxSizeMB?: number;

  /**
   * Maximum video size in MB
   * @default 50
   */
  maxVideoSizeMB?: number;

  /**
   * Accepted file types
   * @default ['image/*', 'video/*']
   */
  acceptedTypes?: string[];

  /**
   * Number of existing media files
   * @default 0
   */
  existingMediaCount?: number;

  /**
   * Whether upload is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

interface ValidationError {
  file: string;
  reason: string;
}

export const MediaUploadZone: React.FC<MediaUploadZoneProps> = ({
  onUpload,
  maxFiles = 30,
  maxSizeMB = 5,
  maxVideoSizeMB = 50,
  acceptedTypes = ['image/*', 'video/*'],
  existingMediaCount = 0,
  disabled = false,
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file type
  const isValidFileType = (file: File): boolean => {
    return acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType + '/');
      }
      return file.type === type;
    });
  };

  // Validate file size
  const isValidFileSize = (file: File): boolean => {
    const sizeMB = file.size / (1024 * 1024);
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? maxVideoSizeMB : maxSizeMB;
    return sizeMB <= maxSize;
  };

  // Validate files
  const validateFiles = (files: File[]): { valid: File[]; errors: ValidationError[] } => {
    const valid: File[] = [];
    const errors: ValidationError[] = [];

    // Check total count
    if (existingMediaCount + files.length > maxFiles) {
      errors.push({
        file: 'Multiple files',
        reason: `Maximum ${maxFiles} files allowed. You can upload ${maxFiles - existingMediaCount} more.`,
      });
      return { valid, errors };
    }

    files.forEach(file => {
      // Check file type
      if (!isValidFileType(file)) {
        errors.push({
          file: file.name,
          reason: 'Invalid file type. Only images and videos are allowed.',
        });
        return;
      }

      // Check file size
      if (!isValidFileSize(file)) {
        const isVideo = file.type.startsWith('video/');
        const maxSize = isVideo ? maxVideoSizeMB : maxSizeMB;
        errors.push({
          file: file.name,
          reason: `File too large. Maximum size is ${maxSize}MB.`,
        });
        return;
      }

      valid.push(file);
    });

    return { valid, errors };
  };

  // Handle file selection
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const { valid, errors } = validateFiles(fileArray);

      setValidationErrors(errors);

      if (errors.length > 0) {
        // Show first error as toast
        toast.error(errors[0].reason);
      }

      if (valid.length > 0) {
        onUpload(valid);
        // Clear validation errors after successful upload
        setTimeout(() => setValidationErrors([]), 3000);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onUpload, existingMediaCount, maxFiles, maxSizeMB, maxVideoSizeMB],
  );

  // Handle drag events
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone itself
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      handleFiles(files);
    },
    [disabled, handleFiles],
  );

  // Handle click to browse
  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  // Get file type icon
  const getFileTypeIcon = (type: string) => {
    if (type.includes('image')) return FileImage;
    if (type.includes('video')) return FileVideo;
    return File;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Zone */}
      <motion.div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        whileHover={!disabled ? { scale: 1.01 } : {}}
        whileTap={!disabled ? { scale: 0.99 } : {}}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
          'hover:border-blue-400 hover:bg-blue-50/50',
          isDragging && 'border-blue-500 bg-blue-50 scale-[1.02]',
          !isDragging && 'border-gray-300 bg-white',
          disabled && 'opacity-50 cursor-not-allowed hover:border-gray-300 hover:bg-white',
          className,
        )}
      >
        {/* Upload Icon */}
        <motion.div
          animate={isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Upload
            className={cn(
              'w-12 h-12 mx-auto mb-4 transition-colors',
              isDragging ? 'text-blue-600' : 'text-gray-400',
            )}
          />
        </motion.div>

        {/* Text */}
        <div className="space-y-2">
          <p
            className={cn(
              'text-lg font-medium transition-colors',
              isDragging ? 'text-blue-600' : 'text-gray-700',
            )}
          >
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-gray-500">or click to browse</p>
          <p className="text-xs text-gray-400 mt-2">
            Max {maxFiles} files • {maxSizeMB}MB per image • {maxVideoSizeMB}MB per video
          </p>
          <p className="text-xs text-gray-400">
            {existingMediaCount > 0 &&
              `${existingMediaCount} file${existingMediaCount > 1 ? 's' : ''} uploaded • `}
            {maxFiles - existingMediaCount} remaining
          </p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
      </motion.div>

      {/* Validation Errors */}
      <AnimatePresence>
        {validationErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {validationErrors.map((error, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm"
              >
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-red-800">{error.file}</p>
                  <p className="text-red-600">{error.reason}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
