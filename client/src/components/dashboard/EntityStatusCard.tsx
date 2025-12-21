
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
    <Card className={cn("overflow-hidden bg-white border-slate-200 shadow-sm hover:shadow-md transition-all duration-200", className)}>
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row gap-0 sm:gap-6">
            {/* Image Section */}
            <div className="w-full sm:w-48 h-48 sm:h-auto bg-slate-100 shrink-0 relative border-r border-slate-100">
                {image ? (
                    <img src={image} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs font-medium">
                        No Image
                    </div>
                )}
                 <div className="absolute top-3 left-3 sm:hidden">
                    {getStatusBadge()}
                 </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 p-5 flex flex-col justify-between">
                <div>
                   <div className="flex justify-between items-start mb-3">
                       <div className="hidden sm:block">
                            {getStatusBadge()}
                       </div>
                       <div className="flex items-center gap-3">
                           {/* Readiness Indicator */}
                           {status === 'draft' && (
                               <div className="scale-90 origin-right">
                                   <ReadinessIndicator 
                                       score={readiness.score} 
                                       missing={readiness.missing} 
                                       variant="compact"
                                       size="sm"
                                   />
                               </div>
                           )}
                           
                           {/* Quality Indicator (Only for drafts/active) */}
                           {quality && (status === 'draft' || status === 'active' || status === 'published') && (
                               <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-md border border-slate-200">
                                   <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Quality</span>
                                   <div className={cn(
                                       "text-xs font-bold",
                                       getQualityTier(quality.score).color === 'green' ? "text-emerald-600" :
                                       getQualityTier(quality.score).color === 'blue' ? "text-blue-600" :
                                       getQualityTier(quality.score).color === 'yellow' ? "text-amber-600" : "text-rose-600"
                                   )}>
                                       {quality.score}
                                   </div>
                               </div>
                           )}

                           {/* Quick Actions */}
                           <div className="flex items-center gap-1 border-l border-slate-100 pl-2 ml-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" onClick={() => onEdit(data.id)} title="Edit">
                                    <Edit className="w-4 h-4" />
                                </Button>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => onDelete(data.id)} title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                           </div>
                       </div>
                   </div>

                   <h3 className="font-semibold text-xl text-slate-900 line-clamp-1 mb-1">{title || 'Untitled Property'}</h3>
                   <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
                       <span>{data.address || data.city || 'No location set'}</span>
                   </div>
                   
                   {price && <p className="font-semibold text-lg text-slate-900">{formatCurrency(price)}</p>}
                
                    {/* Rejection Feedback */}
                    {isRejected && (
                        <div className="mt-4 bg-red-50/50 border border-red-100 rounded-lg p-4">
                             <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-red-900">Changes Required</p>
                                    <ul className="text-sm text-red-700 list-disc pl-4 mt-2 mb-2 space-y-1">
                                        {rejectionReasons.slice(0, 3).map((r, i) => (
                                            <li key={i}>{r}</li>
                                        ))}
                                        {rejectionReasons.length > 3 && <li>+ {rejectionReasons.length - 3} more</li>}
                                    </ul>
                                    {rejectionNote && <p className="text-sm text-red-600 mt-2 bg-white/50 p-2 rounded border border-red-100 italic">Note from Admin: "{rejectionNote}"</p>}
                                    <Button 
                                        size="sm"
                                        variant="outline" 
                                        className="mt-3 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-900 hover:border-red-300"
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
                     <div className="mt-5 flex justify-end border-t border-slate-50 pt-4">
                         {status === 'draft' ? (
                              <Button size="sm" onClick={() => onEdit(data.id)} className="font-medium">
                                 {readiness.score >= 90 ? 'Review & Submit' : 'Continue Setup'}
                              </Button>
                         ) : (
                             <Button size="sm" variant="outline" className="text-slate-500 bg-slate-50 border-slate-200" disabled>
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
