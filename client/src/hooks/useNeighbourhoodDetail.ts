/**
 * Neighbourhood Detail Hook
 * Manages neighbourhood data fetching and follow state
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface Neighbourhood {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  province: string | null;
  heroBannerUrl: string | null;
  description: string | null;
  locationLat: number | null;
  locationLng: number | null;
  amenities: {
    schools?: Array<{ name: string; distance: string; rating?: number }>;
    shopping?: Array<{ name: string; distance: string; type?: string }>;
    transport?: Array<{ name: string; distance: string; type?: string }>;
  } | null;
  safetyRating: number | null;
  walkabilityScore: number | null;
  avgPropertyPrice: number | null;
  priceTrend: {
    '6m'?: Array<{ month: string; avgPrice: number }>;
    '12m'?: Array<{ month: string; avgPrice: number }>;
  } | null;
  highlights: string[] | null;
  followerCount: number;
  propertyCount: number;
  videoCount: number;
}

interface Video {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  duration: number | null;
  viewCount: number;
}

interface NeighbourhoodDetailData {
  neighbourhood: Neighbourhood;
  videos: Video[];
}

export function useNeighbourhoodDetail(neighbourhoodId: number) {
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(false);

  // Fetch neighbourhood details
  const { data, isLoading, error } = useQuery<NeighbourhoodDetailData>({
    queryKey: ['neighbourhoodDetail', neighbourhoodId],
    queryFn: async () => {
      // TODO: Replace with actual tRPC call
      // const response = await apiClient.exploreApi.getNeighbourhoodDetail.query({ id: neighbourhoodId });
      // return response.data;

      // Mock data for now
      return {
        neighbourhood: {
          id: neighbourhoodId,
          name: 'Sandton City',
          slug: 'sandton-city',
          city: 'Johannesburg',
          province: 'Gauteng',
          heroBannerUrl: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200',
          description:
            'Sandton is the financial hub of South Africa, known for its upscale shopping, fine dining, and luxury residential estates. The area offers world-class amenities and is home to many multinational corporations.',
          locationLat: -26.1076,
          locationLng: 28.0567,
          amenities: {
            schools: [
              { name: 'Reddam House', distance: '2.5 km', rating: 4.8 },
              { name: 'St Peters College', distance: '3.1 km', rating: 4.7 },
              { name: 'Crawford College', distance: '4.2 km', rating: 4.6 },
            ],
            shopping: [
              { name: 'Sandton City Mall', distance: '1.2 km', type: 'Shopping Mall' },
              { name: 'Nelson Mandela Square', distance: '1.5 km', type: 'Shopping Mall' },
              { name: 'Woolworths', distance: '800 m', type: 'Supermarket' },
            ],
            transport: [
              { name: 'Sandton Gautrain Station', distance: '1.8 km', type: 'Train' },
              { name: 'Sandton Bus Terminal', distance: '2.0 km', type: 'Bus' },
            ],
          },
          safetyRating: 4.2,
          walkabilityScore: 75,
          avgPropertyPrice: 4500000,
          priceTrend: {
            '6m': [
              { month: 'Jul', avgPrice: 4200000 },
              { month: 'Aug', avgPrice: 4250000 },
              { month: 'Sep', avgPrice: 4300000 },
              { month: 'Oct', avgPrice: 4400000 },
              { month: 'Nov', avgPrice: 4450000 },
              { month: 'Dec', avgPrice: 4500000 },
            ],
            '12m': [
              { month: 'Jan', avgPrice: 3900000 },
              { month: 'Feb', avgPrice: 3950000 },
              { month: 'Mar', avgPrice: 4000000 },
              { month: 'Apr', avgPrice: 4100000 },
              { month: 'May', avgPrice: 4150000 },
              { month: 'Jun', avgPrice: 4200000 },
              { month: 'Jul', avgPrice: 4200000 },
              { month: 'Aug', avgPrice: 4250000 },
              { month: 'Sep', avgPrice: 4300000 },
              { month: 'Oct', avgPrice: 4400000 },
              { month: 'Nov', avgPrice: 4450000 },
              { month: 'Dec', avgPrice: 4500000 },
            ],
          },
          highlights: [
            'Financial district with major banks',
            'Luxury shopping at Sandton City',
            'Gautrain connectivity',
            '24/7 security in most estates',
            'Fine dining restaurants',
            'International schools nearby',
          ],
          followerCount: 1250,
          propertyCount: 342,
          videoCount: 28,
        },
        videos: [
          {
            id: 1,
            title: 'Luxury Penthouse Tour',
            thumbnailUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400',
            duration: 45,
            viewCount: 1200,
          },
          {
            id: 2,
            title: 'Sandton Lifestyle',
            thumbnailUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
            duration: 30,
            viewCount: 850,
          },
        ],
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      // TODO: Replace with actual tRPC call
      // await apiClient.exploreApi.toggleNeighbourhoodFollow.mutate({ neighbourhoodId });
      await new Promise((resolve) => setTimeout(resolve, 500));
      return !isFollowing;
    },
    onSuccess: (newFollowState) => {
      setIsFollowing(newFollowState);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['neighbourhoodDetail', neighbourhoodId] });
    },
  });

  const toggleFollow = () => {
    followMutation.mutate();
  };

  return {
    neighbourhood: data?.neighbourhood,
    videos: data?.videos || [],
    isLoading,
    error,
    isFollowing,
    toggleFollow,
    isTogglingFollow: followMutation.isPending,
  };
}
