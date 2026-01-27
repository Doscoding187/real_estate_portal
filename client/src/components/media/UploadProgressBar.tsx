/**
 * Upload Progress Bar Component
 *
 * Displays individual upload progress for each file with speed and time remaining
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, CheckCircle2, AlertCircle, FileImage, FileVideo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface UploadProgress {
  id: string;
  file?: File; // Optional for backwards compatibility
  fileName?: string; // Alternative to file
  progress: number; // 0-100
  status: 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
  uploadSpeed?: number; // bytes per second
  timeRemaining?: number; // seconds
  speed?: number; // alias for uploadSpeed
}

export interface UploadProgressBarProps {
  /**
   * Upload progress items
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
   * Callback when remove completed/error item is clicked
   */
  onRemove?: (id: string) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Format bytes to human-readable size
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

/**
 * Individual upload progress item
 */
const UploadProgressItem: React.FC<{
  upload: UploadProgress;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
}> = ({ upload, onCancel, onRetry, onRemove }) => {
  const [autoRemoveTimer, setAutoRemoveTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-remove completed uploads after 3 seconds
  useEffect(() => {
    if (upload.status === 'completed' && onRemove) {
      const timer = setTimeout(() => {
        onRemove(upload.id);
      }, 3000);
      setAutoRemoveTimer(timer);
      return () => clearTimeout(timer);
    }
  }, [upload.status, upload.id, onRemove]);

  // Get file type icon
  const getFileIcon = () => {
    const fileType = upload.file?.type || '';
    const fileName = upload.fileName || upload.file?.name || '';
    if (fileType.startsWith('video/') || fileName.endsWith('.mp4') || fileName.endsWith('.mov')) {
      return <FileVideo className="w-5 h-5 text-blue-600" />;
    }
    return <FileImage className="w-5 h-5 text-blue-600" />;
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (upload.status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'p-4 rounded-lg border transition-colors',
        upload.status === 'uploading' && 'bg-blue-50 border-blue-200',
        upload.status === 'completed' && 'bg-green-50 border-green-200',
        upload.status === 'error' && 'bg-red-50 border-red-200',
        upload.status === 'cancelled' && 'bg-gray-50 border-gray-200',
      )}
    >
      <div className="flex items-start gap-3">
        {/* File Icon */}
        <div className="flex-shrink-0 mt-0.5">{getFileIcon()}</div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          {/* File Name */}
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {upload.fileName || upload.file?.name || 'Unknown file'}
            </p>
            {getStatusIcon()}
          </div>

          {/* File Size */}
          {upload.file?.size && (
            <p className="text-xs text-gray-500 mb-2">{formatBytes(upload.file.size)}</p>
          )}

          {/* Progress Bar */}
          {upload.status === 'uploading' && (
            <div className="space-y-1">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${upload.progress}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-blue-600 rounded-full"
                />
              </div>

              {/* Upload Stats */}
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{upload.progress}%</span>
                {upload.uploadSpeed && <span>{formatBytes(upload.uploadSpeed)}/s</span>}
                {upload.timeRemaining && <span>{formatTime(upload.timeRemaining)} remaining</span>}
              </div>
            </div>
          )}

          {/* Error Message */}
          {upload.status === 'error' && upload.error && (
            <p className="text-xs text-red-600 mt-1">{upload.error}</p>
          )}

          {/* Success Message */}
          {upload.status === 'completed' && (
            <p className="text-xs text-green-600 mt-1">Upload completed</p>
          )}

          {/* Cancelled Message */}
          {upload.status === 'cancelled' && (
            <p className="text-xs text-gray-600 mt-1">Upload cancelled</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex gap-1">
          {upload.status === 'uploading' && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(upload.id)}
              className="h-8 w-8 p-0 hover:bg-red-100"
            >
              <X className="w-4 h-4 text-gray-600" />
            </Button>
          )}

          {upload.status === 'error' && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRetry(upload.id)}
              className="h-8 px-2 text-xs hover:bg-blue-100"
            >
              Retry
            </Button>
          )}

          {(upload.status === 'completed' ||
            upload.status === 'error' ||
            upload.status === 'cancelled') &&
            onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (autoRemoveTimer) clearTimeout(autoRemoveTimer);
                  onRemove(upload.id);
                }}
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
 * Upload Progress Bar Component
 */
export const UploadProgressBar: React.FC<UploadProgressBarProps> = ({
  uploads,
  onCancel,
  onRetry,
  onRemove,
  className,
}) => {
  if (uploads.length === 0) {
    return null;
  }

  // Calculate overall stats
  const totalUploads = uploads.length;
  const completedUploads = uploads.filter(u => u.status === 'completed').length;
  const failedUploads = uploads.filter(u => u.status === 'error').length;
  const activeUploads = uploads.filter(u => u.status === 'uploading').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Progress Header */}
      {activeUploads > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-blue-900">
              Uploading {activeUploads} {activeUploads === 1 ? 'file' : 'files'}...
            </span>
          </div>
          <span className="text-xs text-blue-700">
            {completedUploads}/{totalUploads} completed
          </span>
        </div>
      )}

      {/* Individual Upload Progress Items */}
      <AnimatePresence mode="popLayout">
        {uploads.map(upload => (
          <UploadProgressItem
            key={upload.id}
            upload={upload}
            onCancel={onCancel}
            onRetry={onRetry}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>

      {/* Summary (when all uploads are done) */}
      {activeUploads === 0 && totalUploads > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            'p-3 rounded-lg border text-sm',
            failedUploads > 0
              ? 'bg-yellow-50 border-yellow-200 text-yellow-900'
              : 'bg-green-50 border-green-200 text-green-900',
          )}
        >
          {failedUploads > 0 ? (
            <span>
              {completedUploads} {completedUploads === 1 ? 'file' : 'files'} uploaded successfully,{' '}
              {failedUploads} failed
            </span>
          ) : (
            <span>
              All {completedUploads} {completedUploads === 1 ? 'file' : 'files'} uploaded
              successfully
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
};

// Alias for backwards compatibility
export const UploadProgressList = UploadProgressBar;
