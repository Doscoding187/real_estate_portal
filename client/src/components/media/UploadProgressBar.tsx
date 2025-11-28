/**
 * Upload Progress Bar Component
 * 
 * Displays upload progress for individual files with speed and time remaining
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface UploadProgress {
  /**
   * Unique identifier for the upload
   */
  id: string;
  
  /**
   * File name
   */
  fileName: string;
  
  /**
   * Upload progress (0-100)
   */
  progress: number;
  
  /**
   * Upload status
   */
  status: 'uploading' | 'completed' | 'error';
  
  /**
   * Upload speed in bytes per second
   */
  speed?: number;
  
  /**
   * Time remaining in seconds
   */
  timeRemaining?: number;
  
  /**
   * Error message if status is 'error'
   */
  error?: string;
}

export interface UploadProgressBarProps {
  /**
   * Upload progress data
   */
  upload: UploadProgress;
  
  /**
   * Callback when cancel button is clicked
   */
  onCancel?: (id: string) => void;
  
  /**
   * Callback when retry button is clicked (for errors)
   */
  onRetry?: (id: string) => void;
  
  /**
   * Callback when remove button is clicked (for completed/error)
   */
  onRemove?: (id: string) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Format bytes to human-readable string
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Format seconds to human-readable time
 */
const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

export const UploadProgressBar: React.FC<UploadProgressBarProps> = ({
  upload,
  onCancel,
  onRetry,
  onRemove,
  className,
}) => {
  const { id, fileName, progress, status, speed, timeRemaining, error } = upload;
  const [isHovered, setIsHovered] = useState(false);

  // Auto-remove completed uploads after 3 seconds
  useEffect(() => {
    if (status === 'completed' && onRemove) {
      const timer = setTimeout(() => {
        onRemove(id);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, id, onRemove]);

  // Get status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  // Get progress bar color
  const getProgressColor = () => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-600';
      case 'completed':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
    }
  };

  // Get background color
  const getBackgroundColor = () => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative p-4 rounded-lg border transition-all',
        getBackgroundColor(),
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getStatusIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* File Name */}
          <p className="text-sm font-medium text-gray-900 truncate mb-1">
            {fileName}
          </p>

          {/* Progress Bar */}
          {status === 'uploading' && (
            <div className="space-y-1">
              <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className={cn('h-full', getProgressColor())}
                />
              </div>

              {/* Upload Info */}
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{progress}%</span>
                <div className="flex items-center gap-2">
                  {speed && (
                    <span>{formatBytes(speed)}/s</span>
                  )}
                  {timeRemaining !== undefined && (
                    <span>• {formatTime(timeRemaining)} remaining</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Completed Message */}
          {status === 'completed' && (
            <p className="text-xs text-green-600">
              Upload completed successfully
            </p>
          )}

          {/* Error Message */}
          {status === 'error' && error && (
            <p className="text-xs text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {status === 'uploading' && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(id)}
              className="h-8 w-8 p-0 hover:bg-red-100"
            >
              <X className="w-4 h-4 text-gray-600" />
            </Button>
          )}

          {status === 'error' && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRetry(id)}
              className="h-8 px-2 text-xs hover:bg-blue-100"
            >
              Retry
            </Button>
          )}

          {(status === 'completed' || status === 'error') && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(id)}
              className="h-8 w-8 p-0 hover:bg-gray-200"
            >
              <X className="w-4 h-4 text-gray-600" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Upload Progress List Component
 * 
 * Displays a list of upload progress bars
 */
export interface UploadProgressListProps {
  /**
   * List of uploads
   */
  uploads: UploadProgress[];
  
  /**
   * Callback when cancel button is clicked
   */
  onCancel?: (id: string) => void;
  
  /**
   * Callback when retry button is clicked
   */
  onRetry?: (id: string) => void;
  
  /**
   * Callback when remove button is clicked
   */
  onRemove?: (id: string) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const UploadProgressList: React.FC<UploadProgressListProps> = ({
  uploads,
  onCancel,
  onRetry,
  onRemove,
  className,
}) => {
  if (uploads.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {uploads.map(upload => (
        <UploadProgressBar
          key={upload.id}
          upload={upload}
          onCancel={onCancel}
          onRetry={onRetry}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};
