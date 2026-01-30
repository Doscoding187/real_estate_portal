import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Edit,
  Trash2,
  Eye,
  MapPin,
  Home,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { getPrimaryDevelopmentImageUrl } from '@/lib/mediaUtils';
import { publisherTheme, cardElevation, animations, gradients } from '@/lib/publisherTheme';

interface EnhancedDevelopmentCardProps {
  development: {
    id: number;
    name: string;
    description?: string;
    city?: string;
    address?: string;
    priceFrom?: number;
    priceTo?: number;
    images?: string[];
    status: string;
    approvalStatus?: string;
    unitCount?: number;
    createdAt?: string;
    updatedAt?: string;
  };
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onView?: (id: number) => void;
  className?: string;
}

export const EnhancedDevelopmentCard: React.FC<EnhancedDevelopmentCardProps> = ({
  development,
  onEdit,
  onDelete,
  onView,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const primaryImage = development.images?.[0]
    ? getPrimaryDevelopmentImageUrl(development.images[0])
    : null;

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      published: {
        bg: 'bg-gradient-to-r from-emerald-500 to-green-600',
        text: 'text-white',
        icon: <CheckCircle className="w-3 h-3" />,
      },
      approved: {
        bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
        text: 'text-white',
        icon: <CheckCircle className="w-3 h-3" />,
      },
      pending: {
        bg: 'bg-gradient-to-r from-amber-500 to-orange-600',
        text: 'text-white',
        icon: <Clock className="w-3 h-3" />,
      },
      rejected: {
        bg: 'bg-gradient-to-r from-red-500 to-pink-600',
        text: 'text-white',
        icon: <AlertTriangle className="w-3 h-3" />,
      },
      draft: {
        bg: 'bg-gradient-to-r from-gray-500 to-slate-600',
        text: 'text-white',
        icon: <Edit className="w-3 h-3" />,
      },
    };
    return statusMap[status.toLowerCase()] || statusMap.draft;
  };

  const statusInfo = getStatusColor(development.status);

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer',
        cardElevation.medium,
        isHovered && cardElevation.colored,
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section with Overlay */}
      <div className="relative h-48 overflow-hidden">
        {primaryImage && !imageError ? (
          <>
            <img
              src={primaryImage}
              alt={development.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <Badge
            className={cn(
              'px-3 py-1.5 text-xs font-semibold border-0 shadow-lg',
              statusInfo.bg,
              statusInfo.text,
              'flex items-center gap-1.5',
            )}
          >
            {statusInfo.icon}
            {development.status}
          </Badge>
        </div>

        {/* Quick Actions Overlay */}
        <div
          className={cn(
            'absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300',
            isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2',
          )}
        >
          {onView && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 shadow-lg"
                    onClick={() => onView(development.id)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View Details</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Price Badge (if available) */}
        {development.priceFrom && (
          <div className="absolute bottom-3 left-3">
            <div className="glass-effect-light px-3 py-1.5 rounded-xl border border-white/30">
              <div className="text-white font-bold text-sm">
                {development.priceTo
                  ? `${formatCurrency(development.priceFrom)} - ${formatCurrency(development.priceTo)}`
                  : formatCurrency(development.priceFrom)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <CardContent className="p-5 space-y-4">
        {/* Title and Location */}
        <div className="space-y-2">
          <h3 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
            {development.name}
          </h3>

          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="line-clamp-1">
              {development.address || development.city || 'Location not specified'}
            </span>
          </div>
        </div>

        {/* Description */}
        {development.description && (
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {development.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {development.unitCount && (
              <div className="flex items-center gap-1">
                <Home className="w-3.5 h-3.5" />
                <span>{development.unitCount} units</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-400">
            <TrendingUp className="w-3 h-3" />
            <span>Active</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(development.id)}
            className="flex-1 h-8 gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <Edit className="w-3 h-3" />
            <span className="font-medium">Edit</span>
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(development.id)}
                  className="h-8 w-8 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Development</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
};
