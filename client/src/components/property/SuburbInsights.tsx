import React, { useState } from 'react';
import {
  Info,
  Wifi,
  Users,
  Shield,
  Coffee,
  ThumbsUp,
  AlertTriangle,
  CheckCircle2,
  Star,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Review {
  id: number;
  userName: string;
  userType: 'resident' | 'tenant' | 'landlord' | 'visitor';
  rating: number;
  pros: string;
  cons: string;
  comment?: string;
  createdAt: string;
}

interface SuburbInsightsProps {
  suburbId: number;
  suburbName: string;
  rating?: number;
  pros?: string[]; // Dynamic pros
  cons?: string[]; // Dynamic cons
  reviews?: Review[]; // Dynamic reviews
  isDevelopment?: boolean;
}

type ReviewUserType = Review['userType'];

const FEATURE_RATINGS = [
  { icon: Wifi, label: 'Connectivity', rating: 4.2 },
  { icon: Users, label: 'Neighbourhood', rating: 4.5 },
  { icon: Shield, label: 'Safety', rating: 3.8 },
  { icon: Coffee, label: 'Livability', rating: 4.7 },
];

export function SuburbInsights({
  suburbId,
  suburbName,
  rating = 4.4,
  pros = [],
  cons = [],
  reviews = [],
  isDevelopment = false,
}: SuburbInsightsProps) {
  const [viewMode, setViewMode] = useState<'development' | 'suburb'>('suburb');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewsDisabled, setReviewsDisabled] = useState(false);

  // Review Form State
  const [userType, setUserType] = useState<ReviewUserType>('resident');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewPros, setReviewPros] = useState('');
  const [reviewCons, setReviewCons] = useState('');
  const [reviewComment, setReviewComment] = useState('');

  const submitReviewMutation = trpc.locationPages.submitReview.useMutation({
    onSuccess: result => {
      if (result?.success === false && result?.message?.toLowerCase().includes('disabled')) {
        setReviewsDisabled(true);
        setIsReviewDialogOpen(false);
        toast.info(result.message || 'Reviews coming soon');
        return;
      }
      toast.success('Review submitted successfully!');
      setIsReviewDialogOpen(false);
      // Reset form
      setReviewPros('');
      setReviewCons('');
      setReviewComment('');
    },
    onError: error => {
      toast.error(`Failed to submit review: ${error.message}`);
    },
  });

  const handleSubmitReview = () => {
    if (!reviewPros || !reviewCons) {
      toast.error("Please fill in both 'Good things' and 'Things to improve'");
      return;
    }

    submitReviewMutation.mutate({
      suburbId,
      rating: reviewRating,
      userType,
      pros: reviewPros,
      cons: reviewCons,
      comment: reviewComment || 'No additional comments',
    });
  };

  // Fallback for empty pros/cons if AI service fails or returns empty
  const displayPros =
    pros && pros.length > 0
      ? pros
      : ['Great community spirit', 'Close to amenities', 'Green parks nearby'];
  const displayCons =
    cons && cons.length > 0 ? cons : ['Traffic during peak hours', 'Limited night life'];

  // Use passed reviews or fallback if empty array is passed (though we should avoid fallback if possible to encourage real content)
  const displayReviews = reviews && reviews.length > 0 ? reviews : [];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">Resident reviews for {suburbName}</h2>
            <Badge className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700 hover:bg-orange-50">
              {rating} / 5
            </Badge>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            A quick snapshot of how residents rate the area, plus the trade-offs they mention most.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-orange-500 text-white hover:bg-orange-600"
                disabled={reviewsDisabled}
              >
                {reviewsDisabled ? 'Reviews Coming Soon' : 'Write a Review'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Write a review for {suburbName}</DialogTitle>
                <DialogDescription>
                  Share your experience living in {suburbName} to help others finding their perfect
                  home.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {reviewsDisabled && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    Reviews are coming soon. We’ll let you know when submissions open.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>I am a...</Label>
                    <Select
                      value={userType}
                      onValueChange={value => setUserType(value as ReviewUserType)}
                      disabled={reviewsDisabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resident">Resident / Homeowner</SelectItem>
                        <SelectItem value="tenant">Tenant</SelectItem>
                        <SelectItem value="landlord">Landlord</SelectItem>
                        <SelectItem value="visitor">Frequent Visitor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Overall Rating</Label>
                    <div className="flex gap-1 pt-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star
                            className={`h-8 w-8 ${star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="pros"
                    className="flex items-center gap-2 text-green-700 font-medium"
                  >
                    <ThumbsUp className="h-4 w-4" /> Good things about {suburbName}
                  </Label>
                  <Textarea
                    id="pros"
                    placeholder="e.g. Safe streets, friendly neighbors, good schools..."
                    value={reviewPros}
                    onChange={e => setReviewPros(e.target.value)}
                    disabled={reviewsDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="cons"
                    className="flex items-center gap-2 text-orange-600 font-medium"
                  >
                    <AlertTriangle className="h-4 w-4" /> Things to improve
                  </Label>
                  <Textarea
                    id="cons"
                    placeholder="e.g. Heavy traffic, noise, load shedding issues..."
                    value={reviewCons}
                    onChange={e => setReviewCons(e.target.value)}
                    disabled={reviewsDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comment">Additional Comments (Optional)</Label>
                  <Textarea
                    id="comment"
                    placeholder="Any other thoughts?"
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    className="h-20"
                    disabled={reviewsDisabled}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  disabled={submitReviewMutation.isPending || reviewsDisabled}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {submitReviewMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {isDevelopment && (
            <div className="flex rounded-full bg-slate-100 p-1">
              <button
                onClick={() => setViewMode('development')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  viewMode === 'development'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Development
              </button>
              <button
                onClick={() => setViewMode('suburb')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  viewMode === 'suburb'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Suburb
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feature Ratings */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Area Snapshot</h3>
          <Info className="h-4 w-4 text-slate-400" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {FEATURE_RATINGS.map((feature, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-orange-100 bg-orange-50">
                <feature.icon className="h-5 w-5 text-orange-600" />
              </div>
              <span className="block text-2xl font-bold text-slate-900">{feature.rating}</span>
              <span className="mt-1 block text-sm font-medium text-slate-500">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pros & Cons */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Good Things */}
        <div className="rounded-2xl border border-green-100 bg-green-50/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <ThumbsUp className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-slate-900">Good things about {suburbName}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {displayPros.map((pro, index) => (
              <span
                key={index}
                className="inline-flex items-center rounded-full border border-green-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                {pro}
              </span>
            ))}
          </div>
        </div>

        {/* Improvements */}
        <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-slate-900">Things that need improvement</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {displayCons.map((con, index) => (
              <span
                key={index}
                className="inline-flex items-center rounded-full border border-orange-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                {con}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Resident Reviews Carousel */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">
            All resident reviews ({displayReviews.length} reviews)
          </h3>
        </div>

        {displayReviews.length > 0 ? (
          <Carousel className="w-full">
            <CarouselContent className="-ml-4">
              {displayReviews.map(review => (
                <CarouselItem key={review.id} className="pl-4 md:basis-1/1 lg:basis-1/1">
                  <Card className="border-slate-200 shadow-sm h-full">
                    <CardContent className="p-6">
                      {/* Reviewer Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-slate-200">
                            <AvatarFallback className="bg-slate-100 text-slate-600 font-medium">
                              {review.userName ? review.userName.charAt(0) : 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {review.userName || 'Anonymous Resident'}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-xs font-normal bg-slate-100 text-slate-600 hover:bg-slate-200 capitalize"
                              >
                                {review.userType}
                              </Badge>
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Badge className="border-none bg-orange-500 hover:bg-orange-600">
                          {review.rating}.0
                        </Badge>
                      </div>

                      {/* Review Content */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Positives */}
                        <div>
                          <h4 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Good things here
                          </h4>
                          <p className="text-slate-600 text-sm leading-relaxed mb-2">
                            {review.pros}
                          </p>
                        </div>

                        {/* Improvements */}
                        <div>
                          <h4 className="text-sm font-bold text-orange-600 mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4" /> Things that need improvement
                          </h4>
                          <p className="text-slate-600 text-sm leading-relaxed mb-2">
                            {review.cons}
                          </p>
                        </div>
                      </div>

                      {review.comment && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="text-slate-600 text-sm italic">"{review.comment}"</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-4 flex justify-end gap-2">
              <CarouselPrevious className="static h-9 w-9 translate-y-0 border-slate-300 hover:bg-white hover:text-orange-600" />
              <CarouselNext className="static h-9 w-9 translate-y-0 border-slate-300 hover:bg-white hover:text-orange-600" />
            </div>
          </Carousel>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No reviews yet</h3>
            <p className="mb-4 text-slate-500">
              Be the first to share what living in {suburbName} is actually like.
            </p>
            <Button
              variant="outline"
              onClick={() => setIsReviewDialogOpen(true)}
              disabled={reviewsDisabled}
              className="border-slate-300 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
            >
              {reviewsDisabled ? 'Reviews Coming Soon' : 'Write a Review'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
