import { PropertyShort } from '@/../../shared/types';
import { ChevronUp, MessageCircle, Calendar, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface PropertyOverlayProps {
  property: PropertyShort;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onContactAgent: () => void;
  onBookViewing: () => void;
  onWhatsApp: () => void;
}

export function PropertyOverlay({
  property,
  isExpanded,
  onToggleExpand,
  onContactAgent,
  onBookViewing,
  onWhatsApp,
}: PropertyOverlayProps) {
  return (
    <>
      {/* Backdrop for expanded state */}
      {isExpanded && (
        <div
          className="absolute inset-0 bg-black/60 z-30"
          onClick={onToggleExpand}
          aria-label="Close overlay"
        />
      )}

      {/* Overlay Panel */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl transition-all duration-300 ease-out ${
          isExpanded ? 'h-[70vh]' : 'h-auto'
        }`}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-pointer"
          onClick={onToggleExpand}
          role="button"
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleExpand();
            }
          }}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Collapsed Content */}
        {!isExpanded && (
          <div className="px-6 pb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{property.title}</h2>
            {property.caption && (
              <p className="text-gray-600 text-sm line-clamp-2 mb-4">{property.caption}</p>
            )}

            {/* CTA Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={onContactAgent}
                className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-xs font-medium">Contact</span>
              </button>
              <button
                onClick={onBookViewing}
                className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
              >
                <Calendar className="w-5 h-5" />
                <span className="text-xs font-medium">Book</span>
              </button>
              <button
                onClick={onWhatsApp}
                className="flex flex-col items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs font-medium">WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-6 pb-6 h-full overflow-y-auto">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{property.title}</h2>
              {property.property?.price && (
                <div className="text-2xl font-bold text-blue-600 mb-3">
                  R{property.property.price.toLocaleString()}
                </div>
              )}
              {property.caption && (
                <p className="text-gray-600 text-base leading-relaxed">{property.caption}</p>
              )}
            </div>

            {/* Property Details */}
            <div className="space-y-6 mb-6">
              {/* Location */}
              {property.property?.location && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Location
                  </h3>
                  <p className="text-gray-900 text-lg">
                    {property.property.location.suburb && `${property.property.location.suburb}, `}
                    {property.property.location.city}
                    {property.property.location.province &&
                      `, ${property.property.location.province}`}
                  </p>
                </div>
              )}

              {/* Specifications */}
              {property.property?.specs && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Specifications
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {property.property.specs.bedrooms !== undefined && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">
                          {property.property.specs.bedrooms}
                        </div>
                        <div className="text-sm text-gray-600">Bedrooms</div>
                      </div>
                    )}
                    {property.property.specs.bathrooms !== undefined && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">
                          {property.property.specs.bathrooms}
                        </div>
                        <div className="text-sm text-gray-600">Bathrooms</div>
                      </div>
                    )}
                    {property.property.specs.parking !== undefined && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">
                          {property.property.specs.parking}
                        </div>
                        <div className="text-sm text-gray-600">Parking</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Highlights */}
              {property.highlightTags && property.highlightTags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Highlights
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {property.highlightTags.map(tag => (
                      <span
                        key={tag.id}
                        className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                      >
                        {tag.icon && <span className="mr-2">{tag.icon}</span>}
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Agent Information */}
              {property.agent && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Listed By
                  </h3>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    {property.agent.logo ? (
                      <img
                        src={property.agent.logo}
                        alt={property.agent.name}
                        className="w-16 h-16 rounded-full object-cover bg-white"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
                        {property.agent.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-gray-900">
                        {property.agent.name}
                      </div>
                      <div className="text-sm text-gray-600">Property Agent</div>
                      {property.agent.phone && (
                        <div className="text-sm text-gray-500 mt-1">{property.agent.phone}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CTA Buttons (Expanded) */}
            <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={onContactAgent}
                  className="flex flex-col items-center justify-center gap-2 py-4 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="text-sm font-semibold">Contact Agent</span>
                </button>
                <button
                  onClick={onBookViewing}
                  className="flex flex-col items-center justify-center gap-2 py-4 px-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-lg"
                >
                  <Calendar className="w-6 h-6" />
                  <span className="text-sm font-semibold">Book Viewing</span>
                </button>
                <button
                  onClick={onWhatsApp}
                  className="flex flex-col items-center justify-center gap-2 py-4 px-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-lg"
                >
                  <MessageSquare className="w-6 h-6" />
                  <span className="text-sm font-semibold">WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
