import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Home,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  MoreVertical,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  budget: string;
  property?: {
    title: string;
    city: string;
    price: number;
  };
  createdAt: string;
  score: number;
  tags: string[];
  source: string;
}

interface SortableLeadCardProps {
  lead: Lead;
  onClick?: () => void;
}

export function SortableLeadCard({ lead, onClick }: SortableLeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-hover group',
          isDragging && 'shadow-hover rotate-2 scale-105'
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header with drag handle */}
            <div className="flex items-start gap-2">
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded transition-colors mt-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4 text-gray-400" />
              </button>

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-gray-900 truncate">{lead.name}</h4>
                {lead.score >= 80 && (
                  <Badge className="bg-red-100 text-red-700 text-xs mt-1 inline-flex items-center gap-1">
                    <span className="text-red-500">🔥</span>
                    Hot Lead ({lead.score})
                  </Badge>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle more options
                }}
              >
                <MoreVertical className="h-4 w-4 text-gray-400" />
              </Button>
            </div>

            {/* Property Info */}
            {lead.property && (
              <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Home className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                  <p className="font-semibold text-xs text-gray-900 truncate">
                    {lead.property.title}
                  </p>
                </div>
                <p className="text-xs text-gray-600">
                  {lead.property.city} • R {(lead.property.price / 1000000).toFixed(1)}M
                </p>
              </div>
            )}

            {/* Contact Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="truncate">{lead.email}</span>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <span>{lead.phone}</span>
                </div>
              )}
            </div>

            {/* Budget */}
            <div className="flex items-center gap-2 text-xs">
              <DollarSign className="h-3 w-3 text-green-600 flex-shrink-0" />
              <span className="font-medium text-gray-700">Budget: {lead.budget}</span>
            </div>

            {/* Tags */}
            {lead.tags && lead.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {lead.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs bg-white border-gray-200 text-gray-700"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
              </div>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {lead.source}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
