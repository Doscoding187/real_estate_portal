/**
 * Amenity Display Component
 * Shows neighbourhood amenities with icons and distances
 * Requirements: 5.2
 */

import { School, ShoppingBag, Train, Shield, Footprints, Star } from 'lucide-react';

interface Amenity {
  name: string;
  distance: string;
  rating?: number;
  type?: string;
}

interface AmenityDisplayProps {
  amenities: {
    schools?: Amenity[];
    shopping?: Amenity[];
    transport?: Amenity[];
  } | null;
  safetyRating?: number | null;
  walkabilityScore?: number | null;
}

export function AmenityDisplay({ amenities, safetyRating, walkabilityScore }: AmenityDisplayProps) {
  if (!amenities && !safetyRating && !walkabilityScore) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Safety and Walkability Scores */}
      {(safetyRating || walkabilityScore) && (
        <div className="grid grid-cols-2 gap-4">
          {safetyRating && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Safety Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{safetyRating.toFixed(1)}</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(safetyRating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {walkabilityScore && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Footprints className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Walkability</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{walkabilityScore}</span>
                <span className="text-sm text-gray-500">/100</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schools */}
      {amenities?.schools && amenities.schools.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <School className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Schools</h3>
          </div>
          <div className="space-y-2">
            {amenities.schools.map((school, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{school.name}</p>
                  <p className="text-sm text-gray-500">{school.distance}</p>
                </div>
                {school.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium text-gray-700">{school.rating}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shopping */}
      {amenities?.shopping && amenities.shopping.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Shopping</h3>
          </div>
          <div className="space-y-2">
            {amenities.shopping.map((shop, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{shop.name}</p>
                  <p className="text-sm text-gray-500">{shop.distance}</p>
                </div>
                {shop.type && (
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                    {shop.type}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transport */}
      {amenities?.transport && amenities.transport.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Train className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Transport</h3>
          </div>
          <div className="space-y-2">
            {amenities.transport.map((transport, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{transport.name}</p>
                  <p className="text-sm text-gray-500">{transport.distance}</p>
                </div>
                {transport.type && (
                  <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                    {transport.type}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
