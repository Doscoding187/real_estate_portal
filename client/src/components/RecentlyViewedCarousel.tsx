import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Bed, Bath, Square, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';

interface RecentlyViewedCarouselProps {
  sessionId: string;
  className?: string;
}

export function RecentlyViewedCarousel({ sessionId, className = '' }: RecentlyViewedCarouselProps) {
  const { data: recentlyViewed } = trpc.prospects.getRecentlyViewed.useQuery(
    { sessionId },
    { enabled: !!sessionId },
  );

  if (!recentlyViewed || recentlyViewed.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center">
          <Clock className="w-5 h-5 mr-2 text-gray-600" />
          Recently Viewed
        </h3>
        <Badge variant="outline">{recentlyViewed.length} properties</Badge>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex space-x-4">
          {recentlyViewed.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0 w-80"
            >
              <Card className="hover:shadow-lg transition-shadow duration-200">
                <div className="relative h-40 bg-gray-200 rounded-t-lg overflow-hidden">
                  {item.property.mainImage ? (
                    <img
                      src={item.property.mainImage}
                      alt={item.property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                      <MapPin className="w-8 h-8 text-blue-400" />
                    </div>
                  )}

                  <div className="absolute top-2 right-2">
                    <Badge className="bg-black/70 text-white">
                      Viewed {new Date(item.viewedAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="mb-2">
                    <div className="text-lg font-bold text-blue-600">
                      {formatCurrency(item.property.price, { compact: true })}
                    </div>
                    <h4 className="font-medium text-sm line-clamp-2">{item.property.title}</h4>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-gray-600 mb-3">
                    {item.property.bedrooms && (
                      <div className="flex items-center">
                        <Bed className="w-3 h-3 mr-1" />
                        {item.property.bedrooms}
                      </div>
                    )}
                    {item.property.bathrooms && (
                      <div className="flex items-center">
                        <Bath className="w-3 h-3 mr-1" />
                        {item.property.bathrooms}
                      </div>
                    )}
                    <div className="flex items-center">
                      <Square className="w-3 h-3 mr-1" />
                      {item.property.area}m²
                    </div>
                  </div>

                  <div className="flex items-center text-xs text-gray-600 mb-3">
                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="line-clamp-1">
                      {item.property.city}, {item.property.province}
                    </span>
                  </div>

                  <Button size="sm" className="w-full">
                    View Again
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {recentlyViewed.length > 3 && (
        <div className="text-center">
          <Button variant="outline" size="sm">
            View All Recently Viewed
          </Button>
        </div>
      )}
    </div>
  );
}
