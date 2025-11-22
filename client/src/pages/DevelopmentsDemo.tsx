import { DevelopmentCard } from '@/components/DevelopmentCard';

export default function DevelopmentsDemo() {
  const sampleDevelopment = {
    id: '1',
    title: 'Eye of Afric',
    rating: 4.3,
    location: '2, 3 & 4 Bed Apartments in Waterfall Estate',
    description: 'Gorgeous, beautiful development in waterfall Estate dont missout on',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop',
    unitTypes: [
      {
        bedrooms: 2,
        label: '2 Bed Apartments',
        priceFrom: 1100000,
      },
      {
        bedrooms: 3,
        label: '3 Bed Apartments',
        priceFrom: 2300000,
      },
      {
        bedrooms: 4,
        label: '4 Bed Apartments',
        priceFrom: 3700000,
      },
    ],
    highlights: [
      'North-East Facing',
      'Huda City Center Ne...',
      'Modern Finishes',
      'Secure Estate',
    ],
    developer: {
      name: 'Cosmopolitan Projects',
      isFeatured: true,
    },
    imageCount: 15,
    isFeatured: true,
    isNewBooking: true,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Development Listing Card - Demo</h1>
        
        <div className="space-y-6">
          <DevelopmentCard {...sampleDevelopment} />
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Component Features:</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>✅ Multiple unit types with pricing tiers (2, 3, & 4 bed apartments)</li>
            <li>✅ Featured badge for premium developments</li>
            <li>✅ New Booking badge</li>
            <li>✅ Star rating display</li>
            <li>✅ Image gallery count indicator</li>
            <li>✅ Highlights section with expandable tags</li>
            <li>✅ Featured Dealer badge for developers</li>
            <li>✅ Favorite/heart icon</li>
            <li>✅ Contact Agent button</li>
            <li>✅ Responsive design (stacks on mobile)</li>
            <li>✅ Hover effects and smooth transitions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
