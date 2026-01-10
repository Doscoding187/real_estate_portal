/**
 * Partner Profile Demo Page
 * Demonstrates the Partner Profile component with mock data
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PartnerProfile from './PartnerProfile';

// Mock the wouter hook for demo purposes
import { vi } from 'vitest';

// Create a demo query client
const demoQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function PartnerProfileDemo() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Partner Profile Demo</h1>
          <p className="text-gray-600">
            This page demonstrates the Partner Profile component. In a real application, 
            this would be accessed via a route like <code>/partner/123</code>.
          </p>
        </div>
        
        <QueryClientProvider client={demoQueryClient}>
          <PartnerProfile />
        </QueryClientProvider>
      </div>
    </div>
  );
}