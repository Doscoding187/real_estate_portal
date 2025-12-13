import { NearbyAmenitiesMap } from './NearbyAmenitiesMap';

interface AmenitiesSectionProps {
  location?: {
    latitude: number;
    longitude: number;
  };
}

export function AmenitiesSection({ location }: AmenitiesSectionProps) {
  // If no location provided, we can either return null or show the old static services.
  // For now, let's keep the static services as a fallback or "Service Directory" 
  // and show the map if location is available.
  
  const services = [
    { icon: '💰', title: 'Home Loan' },
    { icon: '🛋️', title: 'Home Interiors' },
    { icon: '📊', title: 'Valuation' },
    { icon: '🏠', title: 'Prop Mgmt' },
    { icon: '📝', title: 'Legal' },
    { icon: '🔑', title: 'Rentals' },
  ];

  return (
    <div className="bg-white border-y border-slate-100 py-12">
      <div className="container space-y-12">
        {/* Dynamic Map Section */}
        {location && location.latitude && location.longitude && (
          <div>
             <h2 className="text-2xl font-bold mb-6 text-center">Lifestyle & Amenities</h2>
             <NearbyAmenitiesMap 
               center={[Number(location.latitude), Number(location.longitude)]}
               radius={2}
               className="w-full"
             />
          </div>
        )}

        {/* Static Services Section */}
        <div>
          <h2 className="text-2xl font-bold mb-8 text-center">Property Services</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {services.map((service, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-slate-50 hover:bg-white hover:shadow-lg transition-all cursor-pointer group border border-slate-100"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                  {service.icon}
                </div>
                <span className="font-medium text-slate-700">{service.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
