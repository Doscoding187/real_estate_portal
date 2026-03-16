import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Eye, Shield, Star, TrendingUp } from 'lucide-react';

/**
 * PartnerProfile Page
 * Displays the public profile of a partner/developer brand
 */
type PartnerProfileData = {
  id: string;
  userId: string;
  tier: {
    id: number;
    name: string;
    allowedContentTypes: string[];
    allowedCTAs: string[];
  };
  companyName: string;
  description: string | null;
  logoUrl: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  trustScore: number;
  serviceLocations: string[];
  subscriptionTier: 'free' | 'basic' | 'premium' | 'featured';
  approvedContentCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type PartnerMetrics = {
  totalViews: number;
  engagementRate: number;
  totalContent: number;
  averageQualityScore: number;
};

type PartnerProfileParams = {
  partnerId?: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export default function PartnerProfile() {
  const { partnerId } = useParams<PartnerProfileParams>();

  const profileQuery = useQuery({
    queryKey: ['partner-profile', partnerId],
    enabled: !!partnerId,
    retry: false,
    queryFn: () => fetchJson<PartnerProfileData>(`/api/partners/${partnerId}`),
  });

  const metricsQuery = useQuery({
    queryKey: ['partner-profile-metrics', partnerId],
    enabled: !!partnerId && !!profileQuery.data,
    retry: false,
    queryFn: async () => {
      const raw = await fetchJson<
        | PartnerMetrics
        | {
            success?: boolean;
            data?: Partial<PartnerMetrics>;
          }
      >(`/api/partner-analytics/${partnerId}/summary`);

      if ('data' in raw && raw.data) {
        return {
          totalViews: Number(raw.data.totalViews || 0),
          engagementRate: Number(raw.data.engagementRate || 0),
          totalContent: Number(raw.data.totalContent || 0),
          averageQualityScore: Number(raw.data.averageQualityScore || 0),
        };
      }

      return {
        totalViews: Number((raw as PartnerMetrics).totalViews || 0),
        engagementRate: Number((raw as PartnerMetrics).engagementRate || 0),
        totalContent: Number((raw as PartnerMetrics).totalContent || 0),
        averageQualityScore: Number((raw as PartnerMetrics).averageQualityScore || 0),
      };
    },
  });

  const reviewsQuery = useQuery({
    queryKey: ['partner-profile-reviews', partnerId],
    enabled: !!partnerId && !!profileQuery.data,
    retry: false,
    queryFn: async () => fetchJson<any[]>(`/api/partners/${partnerId}/reviews`),
  });

  if (profileQuery.isLoading) {
    return (
      <div className="container mx-auto p-6" data-testid="partner-profile-skeleton">
        <div className="space-y-4">
          <Skeleton className="h-12 w-72" />
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (profileQuery.isError) {
    const status = (profileQuery.error as Error & { status?: number })?.status;
    if (status === 404) {
      return (
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Partner Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                The partner profile you&apos;re looking for doesn&apos;t exist or has been removed.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Unable to load partner profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profile = profileQuery.data;
  if (!profile) {
    return null;
  }

  const metrics = metricsQuery.data || {
    totalViews: 0,
    engagementRate: 0,
    totalContent: profile.approvedContentCount || 0,
    averageQualityScore: 0,
  };
  const reviews = reviewsQuery.data || [];

  const subscriptionLabel =
    profile.subscriptionTier === 'premium'
      ? 'Premium Member'
      : profile.subscriptionTier === 'featured'
        ? 'Featured Member'
        : profile.subscriptionTier === 'basic'
          ? 'Basic Member'
          : 'Free Member';

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              {profile.logoUrl ? (
                <img
                  src={profile.logoUrl}
                  alt={`${profile.companyName} logo`}
                  className="h-16 w-16 rounded-lg object-cover border border-slate-200"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg border border-slate-200 bg-slate-100 grid place-content-center">
                  <Building2 className="h-8 w-8 text-slate-500" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{profile.companyName}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {profile.verificationStatus === 'verified' ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                      Verified Partner
                    </Badge>
                  ) : (
                    <Badge variant="outline">Verification {profile.verificationStatus}</Badge>
                  )}
                  <Badge variant="secondary">{profile.tier.name}</Badge>
                  <Badge variant="secondary">{subscriptionLabel}</Badge>
                </div>
                <p className="mt-3 text-slate-600">{profile.description || 'No description provided.'}</p>
                {profile.serviceLocations?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.serviceLocations.map(location => (
                      <Badge key={location} variant="outline">
                        {location}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Card className="w-full md:w-52">
              <CardContent className="pt-6 text-center">
                <Shield className="mx-auto mb-2 h-5 w-5 text-blue-600" />
                <div className="text-3xl font-bold">{Math.round(profile.trustScore)}</div>
                <div className="text-sm text-slate-600">Trust Score</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm">Total Views</span>
            </div>
            <div className="text-2xl font-semibold">{metrics.totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Engagement Rate</span>
            </div>
            <div className="text-2xl font-semibold">{metrics.engagementRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <Building2 className="h-4 w-4" />
              <span className="text-sm">Content Pieces</span>
            </div>
            <div className="text-2xl font-semibold">
              {(metrics.totalContent || profile.approvedContentCount || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <Star className="h-4 w-4" />
              <span className="text-sm">Quality Score</span>
            </div>
            <div className="text-2xl font-semibold">{metrics.averageQualityScore}</div>
          </CardContent>
        </Card>
      </div>

      {reviews.length === 0 && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-slate-600">This partner is new to the platform</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
