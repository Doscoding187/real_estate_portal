import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, PlayCircle, Box, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface PropertyMegaRowProps {
  property: any;
  onView: (property: any) => void;
  onEdit: (property: any) => void;
  onDelete: (property: any) => void;
  onApprove: (property: any) => void;
  onReject: (property: any) => void;
}

export const PropertyMegaRow: React.FC<PropertyMegaRowProps> = ({
  property,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}) => {
  // Calculate price per sqm if area is available
  const pricePerSqm = property.propertyDetails?.size
    ? Math.round(property.price / property.propertyDetails.size)
    : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
      case 'available':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending_review':
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'draft':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getVibeScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div 
      className="group relative flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all duration-200 mb-3 cursor-pointer"
      onClick={() => onView(property)}
    >
      {/* Visual Anchor: Thumbnail */}
      <div className="relative w-40 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
        {property.thumbnail ? (
          <img
            src={property.thumbnail}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <Box className="h-8 w-8" />
          </div>
        )}
        {/* Media Badges */}
        {property.mediaType === 'video' && (
          <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white p-1 rounded-full">
            <PlayCircle className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
        
        {/* Info Column */}
        <div className="col-span-5">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn("capitalize font-medium", getStatusColor(property.status))}>
              {property.status.replace('_', ' ')}
            </Badge>
            <span className="text-xs text-slate-400 font-mono">ID: {property.id}</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 truncate leading-tight mb-1">
            {property.title}
          </h3>
          <p className="text-sm text-slate-500 truncate flex items-center gap-1">
            {property.city}, {property.province}
          </p>
        </div>

        {/* Price & Vibe Column */}
        <div className="col-span-3">
          <div className="font-bold text-slate-900 text-lg">
            {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(property.price)}
          </div>
          {pricePerSqm && (
            <div className="text-xs text-slate-500 font-medium">
              {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(pricePerSqm)} / m²
            </div>
          )}
          
          {/* Vibe Score */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full", getVibeScoreColor(property.vibeScore))} 
                style={{ width: `${property.vibeScore}%` }}
              />
            </div>
            <span className={cn("text-xs font-bold", getVibeScoreColor(property.vibeScore).replace('bg-', 'text-'))}>
              {property.vibeScore}
            </span>
          </div>
        </div>

        {/* Agent Column */}
        <div className="col-span-2 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border border-slate-200">
              <AvatarImage src={property.agent?.profileImage} />
              <AvatarFallback className="text-xs bg-slate-100 text-slate-500">
                {property.agent?.firstName?.[0] || property.owner?.firstName?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-slate-900 truncate">
                {property.agent?.firstName || property.owner?.firstName || 'Unknown'}
              </span>
              {property.agent?.isVerified === 1 && (
                <span className="text-[10px] text-blue-600 flex items-center gap-0.5 font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Column */}
        <div className="col-span-2 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {property.approvalStatus === 'pending' ? (
            <>
              <Button 
                size="sm" 
                className="h-8 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onApprove(property)}
              >
                Approve
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => onReject(property)}
              >
                Reject
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-blue-600" onClick={() => onView(property)}>
                <Eye className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(property)}>
                    <Edit className="h-4 w-4 mr-2" /> Edit Listing
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600" onClick={() => onDelete(property)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
