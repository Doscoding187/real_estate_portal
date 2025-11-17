import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadCardProps {
  image: string;
  title: string;
  type: string;
  price: string;
  size: string;
  views: string;
  status: 'active' | 'pending' | 'sold';
  className?: string;
}

export function LeadCard({
  image,
  title,
  type,
  price,
  size,
  views,
  status,
  className,
}: LeadCardProps) {
  return (
    <Card className={cn('card group hover:shadow-lg transition-all duration-200', className)}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative w-24 h-24 rounded-12 overflow-hidden flex-shrink-0">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-foreground truncate">{title}</h3>
              <Badge
                variant={status === 'active' ? 'default' : 'secondary'}
                className={cn(
                  status === 'active' && 'bg-green-600 text-white',
                  status === 'pending' && 'bg-yellow-500 text-white',
                )}
              >
                {status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{type}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-primary">{price}</p>
                <p className="text-xs text-muted-foreground">{size}</p>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span>{views}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
