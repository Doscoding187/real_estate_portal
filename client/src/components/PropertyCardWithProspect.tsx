import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Calendar, MapPin, Bed, Bath, Square, Phone, Mail } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { ProspectTrigger } from './ProspectTrigger';
import { formatCurrency } from '@/lib/utils';

interface PropertyCardWithProspectProps {
  property: {
    id: number;
    title: string;
    description: string;
    price: number;
    propertyType: string;
    listingType: string;
    bedrooms?: number;
    bathrooms?: number;
    area: number;
    address: string;
    city: string;
    province: string;
    mainImage?: string;
    featured: number;
    views: number;
    enquiries: number;
    agentId?: number;
    createdAt: string;
  };
  showProspectTrigger?: boolean;
}

export function PropertyCardWithProspect({
  property,
  showProspectTrigger = true,
}: PropertyCardWithProspectProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isViewingScheduled, setIsViewingScheduled] = useState(false);

  const { toast } = useToast();
  const sessionId = localStorage.getItem('prospect_session') || '';

  // Mutations
  const addFavoriteMutation = trpc.prospects.addFavoriteProperty.useMutation();
  const scheduleViewingMutation = trpc.prospects.scheduleViewing.useMutation();
  const trackViewMutation = trpc.prospects.trackPropertyView.useMutation();

  // Track property view when card is rendered
  React.useEffect(() => {
    if (sessionId) {
      trackViewMutation.mutate({ sessionId, propertyId: property.id });
    }
  }, [sessionId, property.id]);

  const handleAddToFavorites = async () => {
    if (!sessionId) {
      toast({
        title: 'Please calculate affordability first',
        description: 'Use the buyability calculator to unlock favorites and viewings.',
      });
      return;
    }

    try {
      await addFavoriteMutation.mutateAsync({
        sessionId,
        propertyId: property.id,
      });
      setIsFavorited(true);
      toast({
        title: 'Added to Favorites',
        description: 'Property has been added to your favorites.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add to favorites. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleScheduleViewing = async () => {
    if (!sessionId) {
      toast({
        title: 'Please calculate affordability first',
        description: 'Use the buyability calculator to unlock favorites and viewings.',
      });
      return;
    }

    try {
      // Prompt for viewing details
      const prospectName = prompt('Your name:');
      const prospectEmail = prompt('Your email:');
      const prospectPhone = prompt('Your phone:');
      const notes = prompt('Any special notes or preferred time?');

      if (!prospectName || !prospectEmail) {
        toast({
          title: 'Information required',
          description: 'Please provide your name and email to schedule a viewing.',
        });
        return;
      }

      // Schedule for tomorrow at 10 AM by default
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      await scheduleViewingMutation.mutateAsync({
        sessionId,
        propertyId: property.id,
        scheduledAt: tomorrow.toISOString(),
        prospectName,
        prospectEmail,
        prospectPhone: prospectPhone || undefined,
        notes: notes || undefined,
      });

      setIsViewingScheduled(true);
      toast({
        title: 'Viewing Scheduled!',
        description: 'The agent has been notified and will contact you soon.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to schedule viewing. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      apartment: 'Apartment',
      house: 'House',
      villa: 'Villa',
      townhouse: 'Townhouse',
      cluster_home: 'Cluster Home',
      plot: 'Plot',
      commercial: 'Commercial',
      farm: 'Farm',
      shared_living: 'Shared Living',
    };
    return labels[type] || type;
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Property Image */}
      <div className="relative h-48 bg-gray-200">
        {property.mainImage ? (
          <img
            src={property.mainImage}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
            <MapPin className="w-12 h-12 text-blue-400" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col space-y-1">
          {property.featured === 1 && <Badge className="bg-yellow-500 text-white">Featured</Badge>}
          <Badge variant="secondary">{getPropertyTypeLabel(property.propertyType)}</Badge>
        </div>

        {/* Favorite Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddToFavorites}
          className={`absolute top-3 right-3 p-2 rounded-full ${
            isFavorited
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-white/80 text-gray-600 hover:bg-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
        </Button>
      </div>

      <CardContent className="p-4">
        {/* Price and Title */}
        <div className="mb-3">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {formatCurrency(property.price, { compact: true })}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{property.title}</h3>
        </div>

        {/* Property Details */}
        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
          {property.bedrooms && (
            <div className="flex items-center">
              <Bed className="w-4 h-4 mr-1" />
              {property.bedrooms}
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center">
              <Bath className="w-4 h-4 mr-1" />
              {property.bathrooms}
            </div>
          )}
          <div className="flex items-center">
            <Square className="w-4 h-4 mr-1" />
            {property.area}m²
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center text-sm text-gray-600 mb-3">
          <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
          <span className="line-clamp-1">
            {property.address}, {property.city}, {property.province}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-700 mb-4 line-clamp-3">
          {showFullDescription
            ? property.description
            : property.description.substring(0, 120) +
              (property.description.length > 120 ? '...' : '')}
          {property.description.length > 120 && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="text-blue-600 hover:text-blue-800 ml-1"
            >
              {showFullDescription ? 'Show less' : 'Read more'}
            </button>
          )}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <span>{property.views} views</span>
          <span>{property.enquiries} enquiries</span>
          <span>{new Date(property.createdAt).toLocaleDateString()}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleScheduleViewing}
            disabled={isViewingScheduled}
          >
            <Calendar className="w-4 h-4 mr-2" />
            {isViewingScheduled ? 'Viewing Scheduled' : 'Schedule Viewing'}
          </Button>

          <Button className="flex-1 bg-blue-600 hover:bg-blue-700">View Details</Button>
        </div>

        {/* Prospect Trigger */}
        {showProspectTrigger && (
          <div className="mt-3 pt-3 border-t">
            <ProspectTrigger propertyId={property.id} variant="button" className="w-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
