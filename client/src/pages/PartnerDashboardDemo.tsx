/**
 * Partner Dashboard Demo Page
 * 
 * Demonstrates the Partner Dashboard with mock data for development and testing.
 * This shows all the features including analytics, content management, and lead tracking.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PartnerDashboard from './PartnerDashboard';

// Create a query client for the demo
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Mock API responses for demo
const mockApiResponses = {
  '/api/partner-analytics/partner-123/dashboard': {
    success: true,
    data: {
      summary: {
        totalViews: 15420,
        engagementRate: 8.7,
        leadConversions: 23,
        totalLeads: 45,
        totalContent: 12,
        averageQualityScore: 78.5,
      },
      trends: [
        { date: '2024-01-01', views: 1200, engagements: 104, leads: 3 },
        { date: '2024-01-02', views: 1350, engagements: 118, leads: 2 },
        { date: '2024-01-03', views: 1180, engagements: 95, leads: 4 },
        { date: '2024-01-04', views: 1420, engagements: 127, leads: 5 },
        { date: '2024-01-05', views: 1680, engagements: 146, leads: 3 },
        { date: '2024-01-06', views: 1520, engagements: 132, leads: 6 },
        { date: '2024-01-07', views: 1750, engagements: 158, leads: 4 },
      ],
      topContent: [
        {
          contentId: 'content-1',
          title: 'Modern Kitchen Renovation Tips',
          type: 'video' as const,
          views: 3420,
          engagements: 298,
          engagementRate: 8.7,
          qualityScore: 85,
          createdAt: new Date('2024-01-01'),
        },
        {
          contentId: 'content-2',
          title: 'Bathroom Design Trends 2024',
          type: 'card' as const,
          views: 2890,
          engagements: 231,
          engagementRate: 8.0,
          qualityScore: 78,
          createdAt: new Date('2024-01-03'),
        },
        {
          contentId: 'content-3',
          title: 'Quick Home Security Check',
          type: 'short' as const,
          views: 2150,
          engagements: 172,
          engagementRate: 8.0,
          qualityScore: 72,
          createdAt: new Date('2024-01-05'),
        },
        {
          contentId: 'content-4',
          title: 'Energy Efficient Home Upgrades',
          type: 'video' as const,
          views: 1980,
          engagements: 158,
          engagementRate: 8.0,
          qualityScore: 81,
          createdAt: new Date('2024-01-07'),
        },
        {
          contentId: 'content-5',
          title: 'Smart Home Installation Guide',
          type: 'card' as const,
          views: 1750,
          engagements: 140,
          engagementRate: 8.0,
          qualityScore: 75,
          createdAt: new Date('2024-01-10'),
        },
      ],
      boostROI: [
        {
          campaignId: 'campaign-1',
          campaignName: 'Kitchen Renovation Boost',
          budget: 1000,
          spent: 850,
          impressions: 12500,
          clicks: 425,
          leads: 8,
          roi: 15.2,
        },
        {
          campaignId: 'campaign-2',
          campaignName: 'Home Security Awareness',
          budget: 500,
          spent: 480,
          impressions: 8200,
          clicks: 290,
          leads: 5,
          roi: 8.7,
        },
      ],
    },
  },
  '/api/partner-leads/partner/partner-123': {
    success: true,
    leads: [
      {
        id: 'lead-1',
        type: 'quote_request' as const,
        status: 'new' as const,
        price: 150,
        contactInfo: {
          name: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          phone: '+27 82 123 4567',
        },
        intentDetails: 'Kitchen renovation for 3-bedroom house',
        createdAt: '2024-01-10T10:30:00Z',
      },
      {
        id: 'lead-2',
        type: 'consultation' as const,
        status: 'contacted' as const,
        price: 200,
        contactInfo: {
          name: 'Michael Chen',
          email: 'michael.chen@email.com',
          phone: '+27 83 987 6543',
        },
        intentDetails: 'Home security system consultation',
        createdAt: '2024-01-09T14:15:00Z',
      },
      {
        id: 'lead-3',
        type: 'eligibility_check' as const,
        status: 'converted' as const,
        price: 750,
        contactInfo: {
          name: 'Emma Williams',
          email: 'emma.williams@email.com',
          phone: '+27 84 555 1234',
        },
        intentDetails: 'Bond pre-approval for first home',
        createdAt: '2024-01-08T09:45:00Z',
      },
      {
        id: 'lead-4',
        type: 'quote_request' as const,
        status: 'contacted' as const,
        price: 120,
        contactInfo: {
          name: 'David Brown',
          email: 'david.brown@email.com',
          phone: '+27 85 777 8888',
        },
        intentDetails: 'Bathroom renovation quote',
        createdAt: '2024-01-07T16:20:00Z',
      },
      {
        id: 'lead-5',
        type: 'consultation' as const,
        status: 'converted' as const,
        price: 250,
        contactInfo: {
          name: 'Lisa Anderson',
          email: 'lisa.anderson@email.com',
          phone: '+27 86 333 2222',
        },
        intentDetails: 'Smart home automation consultation',
        createdAt: '2024-01-06T11:10:00Z',
      },
    ],
  },
};

// Mock fetch function
const originalFetch = window.fetch;
window.fetch = async (url: string | URL | Request, options?: RequestInit) => {
  const urlString = url.toString();
  
  // Check if this is a mock API call
  for (const [mockUrl, mockResponse] of Object.entries(mockApiResponses)) {
    if (urlString.includes(mockUrl.split('?')[0])) {
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  
  // Fall back to original fetch for other requests
  return originalFetch(url, options);
};

export default function PartnerDashboardDemo() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <div className="border-b bg-muted/30 px-4 py-3">
          <div className="container mx-auto">
            <h2 className="text-lg font-semibold text-muted-foreground">
              🎯 Partner Dashboard Demo
            </h2>
            <p className="text-sm text-muted-foreground">
              Comprehensive analytics, content management, and lead tracking for partners
            </p>
          </div>
        </div>
        <PartnerDashboard />
      </div>
    </QueryClientProvider>
  );
}