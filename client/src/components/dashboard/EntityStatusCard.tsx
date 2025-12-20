
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReadinessIndicator } from '@/components/common/ReadinessIndicator';
import { cn } from '@/lib/utils';
import { Edit, Eye, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getQualityTier } from '@/lib/quality';

interface EntityStatusCardProps {
  type: 'listing' | 'development';
  data: any; // Listing or Development object
  readiness: { score: number; missing: Record<string, string[]> };
  quality?: { score: number; breakdown: any };
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onView?: (id: number) => void;
  className?: string;
}

export const EntityStatusCard: React.FC<EntityStatusCardProps> = ({
  type,
  data,
  readiness,
  quality,
  onEdit,
  onDelete,
  onView,
  className,
}) => {
  const isListing = type === 'listing';
  const status = data.status;
  const approvalStatus = data.approvalStatus;
  
  // Status Badge Logic
  const getStatusBadge = () => {
    switch (status) {
      case 'published':
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Published</Badge>;
      case 'approved':
         return <Badge className="bg-blue-500 hover:bg-blue-600">Approved (Unpublished)</Badge>;
      case 'pending':
      case 'pending_review':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Action Required</Badge>;
      case 'draft':
      default:
        return <Badge variant="secondary" className="text-gray-500">Draft</Badge>;
    }
  };

  // Rejection Logic
  const isRejected = status === 'rejected' || approvalStatus === 'rejected';
  // Use structured reasons if available, else legacy reason (which might be JSON stringified array or plain text)
  let rejectionReasons: string[] = [];
  if (data.rejectionReasons) {
      try {
          rejectionReasons = typeof data.rejectionReasons === 'string' ? JSON.parse(data.rejectionReasons) : data.rejectionReasons;
      } catch (e) { rejectionReasons = [String(data.rejectionReasons)]; }
  } else if (data.rejectionReason) {
       rejectionReasons = [data.rejectionReason];
  }
  const rejectionNote = data.rejectionNote;

  const title = isListing ? data.title : data.name;
  const image = isListing ? data.primaryImage : (data.images?.[0] || null);
  const price = isListing 
    ? (data.pricing?.askingPrice || data.pricing?.monthlyRent) 
    : (data.priceFrom);

  return (
    <Card className={cn("overflow-hidden hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row gap-4">
            {/* Image Section */}
            <div className="w-full sm:w-48 h-32 sm:h-auto bg-gray-100 shrink-0 relative">
                {image ? (
                    <img src={image} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                        No Image
                    </div>
                )}
                 <div className="absolute top-2 left-2 sm:hidden">
                    {getStatusBadge()}
                 </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                   <div className="flex justify-between items-start mb-2">
                       <div className="hidden sm:block">
                            {getStatusBadge()}
                       </div>
                       <div className="flex items-center gap-2">
                           {/* Readiness Indicator */}
                           {status === 'draft' && (
                               <ReadinessIndicator 
                                   score={readiness.score} 
                                   missing={readiness.missing} 
                                   variant="compact"
                                   size="sm"
                               />
                           )}
                           
                           {/* Quality Indicator (Only for drafts/active) */}
                           {quality && (status === 'draft' || status === 'active' || status === 'published') && (
                               <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md border border-slate-100">
                                   <span className="text-[10px] uppercase font-bold text-slate-400">Quality</span>
                                   <div className={cn(
                                       "text-xs font-bold",
                                       getQualityTier(quality.score).color === 'green' ? "text-green-600" :
                                       getQualityTier(quality.score).color === 'blue' ? "text-blue-600" :
                                       getQualityTier(quality.score).color === 'yellow' ? "text-amber-600" : "text-red-500"
                                   )}>
                                       {quality.score}
                                   </div>
                               </div>
                           )}

                           {/* Quick Actions */}
                            <Button variant="ghost" size="icon" onClick={() => onEdit(data.id)} title="Edit">
                                <Edit className="w-4 h-4 text-gray-500" />
                            </Button>
                             <Button variant="ghost" size="icon" onClick={() => onDelete(data.id)} title="Delete">
                                <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
                            </Button>
                       </div>
                   </div>

                   <h3 className="font-semibold text-lg line-clamp-1">{title || 'Untitled Property'}</h3>
                   <p className="text-sm text-gray-500 mb-1">{data.address || data.city || 'No location set'}</p>
                   {price && <p className="font-medium text-primary">{formatCurrency(price)}</p>}
                
                    {/* Rejection Feedback */}
                    {isRejected && (
                        <div className="mt-3 bg-red-50 border border-red-100 rounded-md p-3">
                             <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-red-800">Changes Required</p>
                                    <ul className="text-xs text-red-700 list-disc pl-4 mt-1">
                                        {rejectionReasons.slice(0, 3).map((r, i) => (
                                            <li key={i}>{r}</li>
                                        ))}
                                        {rejectionReasons.length > 3 && <li>+ {rejectionReasons.length - 3} more</li>}
                                    </ul>
                                    {rejectionNote && <p className="text-xs text-red-600 mt-1 italic">Note: "{rejectionNote}"</p>}
                                    <Button 
                                        variant="link" 
                                        className="h-auto p-0 text-xs text-red-800 underline mt-2"
                                        onClick={() => onEdit(data.id)}
                                    >
                                        Fix & Resubmit
                                    </Button>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
                
                 {/* Footer Actions if needed */}
                 {!isRejected && status !== 'published' && status !== 'active' && (
                     <div className="mt-4 flex justify-end">
                         {status === 'draft' ? (
                              <Button size="sm" onClick={() => onEdit(data.id)}>
                                 {readiness.score >= 90 ? 'Review & Submit' : 'Continue Setup'}
                              </Button>
                         ) : (
                             <Button size="sm" variant="outline" disabled>
                                 In Review
                             </Button>
                         )}
                     </div>
                 )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
};
