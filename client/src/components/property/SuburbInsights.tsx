import React, { useState } from 'react';
import { 
  Info, 
  Wifi, 
  Users, 
  Shield, 
  Coffee, 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle, 
  CheckCircle2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface SuburbInsightsProps {
  suburbName: string;
  rating?: number;
  isDevelopment?: boolean;
}

const FEATURE_RATINGS = [
  { icon: Wifi, label: 'Connectivity', rating: 4.2 },
  { icon: Users, label: 'Neighbourhood', rating: 4.5 },
  { icon: Shield, label: 'Safety', rating: 3.8 },
  { icon: Coffee, label: 'Livability', rating: 4.7 },
];

const PROS = [
  "Close to public transport",
  "Good schools nearby",
  "Shops and malls within the area",
  "Safe to walk during the day",
  "Family-friendly community"
];

const CONS = [
  "Load shedding frequency",
  "Limited night-time public transport",
  "Traffic congestion during peak hours",
  "Potholes on main roads"
];

const REVIEWS = [
  {
    id: 1,
    name: "Sarah M.",
    role: "Homeowner",
    timeAgo: "8 months ago",
    rating: 5,
    avatar: "",
    pros: "I've lived here for 5 years and absolutely love the community spirit. The local parks are well-maintained and it's very safe for kids to play outside. The new shopping center has made life so much easier.",
    cons: "The morning traffic on Main Road can be a bit of a nightmare, especially during school drop-off times. We also get hit by load shedding quite often, so a backup system is a must."
  },
  {
    id: 2,
    name: "David K.",
    role: "Tenant",
    timeAgo: "2 months ago",
    rating: 4,
    avatar: "",
    pros: "Great location for young professionals. There are plenty of cafes and restaurants within walking distance. The fiber internet connectivity is excellent, which is great for working from home.",
    cons: "Rent prices are creeping up. Public transport options late at night are pretty limited, so you really need a car or Uber if you're going out."
  },
  {
    id: 3,
    name: "Thabo N.",
    role: "Resident",
    timeAgo: "1 year ago",
    rating: 4,
    avatar: "",
    pros: "The security in this area is top-notch. We have active community policing and I feel very safe. The schools in the area are also some of the best in the city.",
    cons: "Some of the side roads have potholes that take a while to get fixed. Also, there aren't enough public parks for the number of residents."
  }
];

export function SuburbInsights({ suburbName, rating = 4.4, isDevelopment = false }: SuburbInsightsProps) {
  const [viewMode, setViewMode] = useState<'development' | 'suburb'>('suburb');

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-900">Resident reviews for {suburbName}</h2>
          <Badge className="bg-[#005ca8] hover:bg-[#004d8a] text-white text-base px-3 py-1 rounded-md">
            {rating} / 5
          </Badge>
        </div>
        
        {isDevelopment && (
          <div className="flex bg-slate-100 p-1 rounded-lg self-start md:self-auto">
            <button
              onClick={() => setViewMode('development')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                viewMode === 'development' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Development
            </button>
            <button
              onClick={() => setViewMode('suburb')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
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

      {/* Feature Ratings */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Ratings based on features</h3>
          <Info className="h-4 w-4 text-slate-400" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURE_RATINGS.map((feature, index) => (
            <div key={index} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-white">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 border border-blue-100">
                <feature.icon className="h-6 w-6 text-[#005ca8]" />
              </div>
              <span className="text-2xl font-bold text-slate-900 mb-1">{feature.rating}</span>
              <span className="text-sm text-slate-500 font-medium">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pros & Cons */}
      {/* Pros & Cons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Good Things */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ThumbsUp className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-slate-900">Good things about this suburb</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {PROS.map((pro, index) => (
              <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-medium border border-slate-200">
                {pro}
              </span>
            ))}
          </div>
        </div>

        {/* Improvements */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-slate-900">Things that need improvement</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {CONS.map((con, index) => (
              <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-medium border border-slate-200">
                {con}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Resident Reviews Carousel */}
      <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">All resident reviews ({REVIEWS.length} reviews)</h3>
          <a href="#" className="text-[#005ca8] font-medium hover:underline flex items-center gap-1">
            View All <ChevronRight className="h-4 w-4" />
          </a>
        </div>

        <Carousel className="w-full">
          <CarouselContent className="-ml-4">
            {REVIEWS.map((review) => (
              <CarouselItem key={review.id} className="pl-4 md:basis-1/1 lg:basis-1/1">
                <Card className="border-slate-200 shadow-sm h-full">
                  <CardContent className="p-6">
                    {/* Reviewer Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-slate-200">
                          <AvatarImage src={review.avatar} />
                          <AvatarFallback className="bg-slate-100 text-slate-600 font-medium">
                            {review.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{review.name}</span>
                            <Badge variant="secondary" className="text-xs font-normal bg-slate-100 text-slate-600 hover:bg-slate-200">
                              {review.role}
                            </Badge>
                          </div>
                          <span className="text-xs text-slate-500">{review.timeAgo}</span>
                        </div>
                      </div>
                      <Badge className="bg-green-600 hover:bg-green-700 border-none">
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
                        <a href="#" className="text-xs font-bold text-slate-900 hover:underline">Read more</a>
                      </div>

                      {/* Improvements */}
                      <div>
                        <h4 className="text-sm font-bold text-orange-600 mb-2 flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4" /> Things that need improvement
                        </h4>
                        <p className="text-slate-600 text-sm leading-relaxed mb-2">
                          {review.cons}
                        </p>
                        <a href="#" className="text-xs font-bold text-slate-900 hover:underline">Read more</a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-end gap-2 mt-4">
            <CarouselPrevious className="static translate-y-0 h-9 w-9 border-slate-300 hover:bg-white hover:text-[#005ca8]" />
            <CarouselNext className="static translate-y-0 h-9 w-9 border-slate-300 hover:bg-white hover:text-[#005ca8]" />
          </div>
        </Carousel>

        {/* Feedback Section */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-slate-500 font-medium">Is this helpful?</span>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="rounded-full border-slate-300 text-slate-600 hover:text-green-600 hover:border-green-600 hover:bg-green-50 gap-2">
              <ThumbsUp className="h-4 w-4" /> Yes
            </Button>
            <Button variant="outline" size="sm" className="rounded-full border-slate-300 text-slate-600 hover:text-red-600 hover:border-red-600 hover:bg-red-50 gap-2">
              <ThumbsDown className="h-4 w-4" /> No
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
