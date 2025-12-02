import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Building2,
  Star,
  Award,
  Home,
  CheckCircle,
  Share2,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgentPublicProfile() {
  const [, params] = useRoute('/agent/profile/:agentId');
  const agentId = params?.agentId ? parseInt(params.agentId) : null;

  // TODO: Replace with actual tRPC query to fetch agent data
  // const { data: agent, isLoading } = trpc.public.getAgentProfile.useQuery({ agentId });

  // Mock data for now
  const agent = {
    id: agentId,
    firstName: 'Edward',
    lastName: 'Lehlohonolo',
    displayName: 'Edward Lehlohonolo',
    bio: 'Award-winning real estate agent specializing in luxury properties and first-time home buyers. With over 5 years of experience in the Johannesburg area, I help clients find their dream homes.',
    profileImage: null,
    phone: '+27 82 555 1234',
    email: 'edward.ikhayaproperty@gmail.com',
    specialization: 'Residential Sales, Luxury Properties, First-Time Buyers',
    yearsExperience: 5,
    areasServed: 'Sandton, Rosebank, Johannesburg North',
    rating: 4.8,
    reviewCount: 127,
    totalSales: 89,
    agency: {
      name: 'Prime Properties SA',
      logo: null,
    },
    socialMedia: {
      facebook: 'https://facebook.com/agent',
      instagram: 'https://instagram.com/agent',
      linkedin: 'https://linkedin.com/in/agent',
      twitter: 'https://twitter.com/agent',
    },
    achievements: [
      'Top Producer 2023',
      'Customer Service Excellence Award',
      'Million Dollar Club Member',
    ],
    activeListings: 12,
  };

  const initials = `${agent.firstName[0]}${agent.lastName[0]}`;

  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${agent.displayName} - Real Estate Agent`,
        text: `Check out my real estate profile!`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Profile link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Profile Image */}
            <div className="relative">
              <div className="h-32 w-32 rounded-full bg-white flex items-center justify-center shadow-2xl ring-4 ring-white/20">
                {agent.profileImage ? (
                  <img
                    src={agent.profileImage}
                    alt={agent.displayName}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-blue-600">{initials}</span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-green-500 h-6 w-6 rounded-full border-4 border-white"></div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-bold mb-2">{agent.displayName}</h1>
              <p className="text-xl text-blue-100 mb-4">
                Real Estate Agent {agent.agency && `at ${agent.agency.name}`}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{agent.rating}</span>
                  <span className="text-blue-100">({agent.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  <span>{agent.yearsExperience} Years Experience</span>
                </div>
                <div className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  <span>{agent.totalSales} Properties Sold</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <Button
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
                  onClick={() => window.location.href = `tel:${agent.phone}`}
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Call Now
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white/10"
                  onClick={() => window.location.href = `mailto:${agent.email}`}
                >
                  <Mail className="h-5 w-5 mr-2" />
                  Email Me
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white/10"
                  onClick={handleShare}
                >
                  <Share2 className="h-5 w-5 mr-2" />
                  Share Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - About & Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Me */}
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About Me</h2>
                <p className="text-gray-700 leading-relaxed">{agent.bio}</p>
              </CardContent>
            </Card>

            {/* Specializations */}
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Specializations</h2>
                <div className="flex flex-wrap gap-2">
                  {agent.specialization.split(',').map((spec, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="px-4 py-2 text-sm bg-blue-100 text-blue-700 border border-blue-200"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {spec.trim()}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Achievements</h2>
                <div className="space-y-3">
                  {agent.achievements.map((achievement, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                      <Award className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                      <span className="font-medium text-gray-900">{achievement}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active Listings */}
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Active Listings</h2>
                  <Badge className="bg-blue-600 text-white px-4 py-1">
                    {agent.activeListings} Properties
                  </Badge>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                  <p className="text-gray-700 mb-4">Browse my current property listings</p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    View All Listings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Contact & Areas */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card className="shadow-xl sticky top-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
                <div className="space-y-4">
                  <a
                    href={`tel:${agent.phone}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <Phone className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">{agent.phone}</p>
                    </div>
                  </a>

                  <a
                    href={`mailto:${agent.email}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium text-gray-900 break-all">{agent.email}</p>
                    </div>
                  </a>

                  <div className="flex items-start gap-3 p-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Areas Served</p>
                      <p className="font-medium text-gray-900">{agent.areasServed}</p>
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Connect With Me</p>
                  <div className="flex gap-3">
                    {agent.socialMedia.facebook && (
                      <a
                        href={agent.socialMedia.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"
                      >
                        <Facebook className="h-5 w-5" />
                      </a>
                    )}
                    {agent.socialMedia.instagram && (
                      <a
                        href={agent.socialMedia.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-all"
                      >
                        <Instagram className="h-5 w-5" />
                      </a>
                    )}
                    {agent.socialMedia.linkedin && (
                      <a
                        href={agent.socialMedia.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-700 hover:text-white transition-all"
                      >
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                    {agent.socialMedia.twitter && (
                      <a
                        href={agent.socialMedia.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-all"
                      >
                        <Twitter className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <Button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Send Message
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2024 {agent.displayName}. All rights reserved. | Powered by Property Listify
          </p>
        </div>
      </div>
    </div>
  );
}
