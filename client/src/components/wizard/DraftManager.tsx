/**
 * Draft Manager Component
 *
 * Displays a dialog to resume or discard a draft listing/development
 */

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Trash2, Clock, MapPin, Home } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface DraftData {
  currentStep: number;
  totalSteps: number;
  action?: string;
  propertyType?: string;
  developmentName?: string;
  address?: string;
  lastModified?: Date;
}

export interface DraftManagerProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;

  /**
   * Callback when dialog open state changes
   */
  onOpenChange?: (open: boolean) => void;

  /**
   * Callback when user chooses to resume draft
   */
  onResume: () => void;

  /**
   * Callback when user chooses to start fresh
   */
  onStartFresh: () => void;

  /**
   * Draft data to display
   */
  draftData: DraftData;

  /**
   * Type of wizard (listing or development)
   */
  wizardType?: 'listing' | 'development';
}

export const DraftManager: React.FC<DraftManagerProps> = ({
  open,
  onOpenChange,
  onResume,
  onStartFresh,
  draftData,
  wizardType = 'listing',
}) => {
  const { currentStep, totalSteps, action, propertyType, developmentName, address, lastModified } =
    draftData;

  // Calculate progress percentage
  const progressPercentage = Math.round((currentStep / totalSteps) * 100);

  // Format last modified time
  const lastModifiedText = lastModified
    ? formatDistanceToNow(lastModified, { addSuffix: true })
    : 'recently';

  // Capitalize first letter
  const capitalize = (str?: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-6 h-6 text-blue-600" />
            Resume Draft {capitalize(wizardType)}?
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            You have an unfinished {wizardType} saved {lastModifiedText}. Would you like to continue
            where you left off or start a new {wizardType}?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Progress Card */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-slate-800 mb-1">Draft Progress</p>
                <p className="text-sm text-slate-600">
                  Step {currentStep} of {totalSteps} • {progressPercentage}% complete
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
            <p className="font-medium text-slate-800 text-sm mb-2">Draft Details</p>

            {wizardType === 'listing' && (
              <>
                {action && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Home className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">Action:</span>
                    <span>{capitalize(action)}</span>
                  </div>
                )}
                {propertyType && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Home className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">Type:</span>
                    <span>{capitalize(propertyType)}</span>
                  </div>
                )}
              </>
            )}

            {wizardType === 'development' && (
              <>
                {developmentName && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Home className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">Name:</span>
                    <span className="truncate">{developmentName}</span>
                  </div>
                )}
                {address && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">Location:</span>
                    <span className="truncate">{address}</span>
                  </div>
                )}
              </>
            )}

            {lastModified && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-medium">Last saved:</span>
                <span>{lastModifiedText}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onStartFresh}
            className="gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          >
            <Trash2 className="w-4 h-4" />
            Start New
          </Button>
          <Button
            onClick={onResume}
            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <FileText className="w-4 h-4" />
            Resume Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
