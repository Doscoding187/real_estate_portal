import { Button } from './ui/button';
import { Heart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { OptimizedImageCard } from './OptimizedImage';

interface ImageUrls {
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
  original: string;
}

export interface PropertyCardProps {
  id: string;
  title: string;
  price: number;
  location: string;
  image: string | ImageUrls; // Support both old (string) and new (ImageUrls) formats
  description?: string;
  onFavoriteClick?: () => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  id,
  title,
  price,
  location,
  image,
  description,
  onFavoriteClick,
}) => {
  // Check if image is the new multi-size format or old single URL
  const isMultiSizeImage = typeof image === 'object' && 'medium' in image;

  return (
    <div className="group relative rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
        {isMultiSizeImage ? (
          <OptimizedImageCard
            images={image as ImageUrls}
            alt={title}
            aspectRatio="4/3"
            className="transition-transform group-hover:scale-105"
          />
        ) : (
          <img
            src={image as string}
            alt={title}
            className="object-cover w-full h-full transition-transform group-hover:scale-105"
          />
        )}
        {onFavoriteClick && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2 rounded-full opacity-90 hover:opacity-100"
            onClick={() => onFavoriteClick()}
          >
            <Heart className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-2">{location}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-semibold">{formatCurrency(price)}</span>
          <span className="text-sm text-muted-foreground">/month</span>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  );
};

export default PropertyCard;
