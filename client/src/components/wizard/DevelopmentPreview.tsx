import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Bed,
  Bath,
  Car,
  Maximize,
  Smartphone,
  Monitor,
  Share2,
  ArrowLeft,
  Moon,
  Sun,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import type { UnitType } from '@/hooks/useDevelopmentWizard';

type DevelopmentPreviewData = {
  developmentData?: {
    name?: string;
    location?: { address?: string; city?: string };
    media?: { heroImage?: { url?: string } };
  };
  overview?: {
    description?: string;
    highlights?: string[];
    status?: string;
  };
  unitTypes?: UnitType[];
  classification?: { type?: string };
};

const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isPresentSize = (value: unknown): boolean => {
  const parsed = parseNumber(value);
  return parsed !== null && parsed > 0;
};

const formatSizeValue = (value: unknown): string | null => {
  const parsed = parseNumber(value);
  if (parsed === null) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed !== '' && !Number.isNaN(Number(trimmed))) {
      if (trimmed.includes('.')) {
        return trimmed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
      }
      return trimmed;
    }
  }

  return Number.isInteger(parsed) ? `${parsed}` : `${parsed}`;
};

const formatParkingLabel = (unit: UnitType): string | null => {
  const parkingValue = unit.parkingType;
  const parkingBays = parseNumber(unit.parkingBays);

  if (typeof parkingValue === 'string') {
    const trimmed = parkingValue.trim();
    if (trimmed === '' || trimmed === 'none' || trimmed === '0') {
      return parkingBays && parkingBays > 0
        ? `${parkingBays} Bay${parkingBays === 1 ? '' : 's'}`
        : null;
    }
    if (/^\d+$/.test(trimmed)) {
      const bays = Number(trimmed);
      return bays > 0 ? `${bays} Bay${bays === 1 ? '' : 's'}` : null;
    }
    const normalized = trimmed.replace(/[_-]+/g, ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return parkingBays && parkingBays > 0
    ? `${parkingBays} Bay${parkingBays === 1 ? '' : 's'}`
    : null;
};

export const DevelopmentPreview: React.FC = () => {
  const [data, setData] = useState<DevelopmentPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem('development_preview_data');
    if (storedData) {
      try {
        setData(JSON.parse(storedData));
      } catch (e) {
        console.error('Failed to parse preview data');
      }
    }
    setLoading(false);
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading preview...
      </div>
    );
  if (!data)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        No preview data found. Please return to the wizard and click Preview again.
      </div>
    );

  const { developmentData, overview, unitTypes, classification } = data;
  const heroImage = developmentData?.media?.heroImage;

  const handleShare = () => {
    // In a real app, this would generate a public ID/link
    navigator.clipboard.writeText(window.location.href);
    toast.success('Preview link copied to clipboard');
  };

  // Content Component to reuse
  const PreviewContent = () => (
    <div
      className={`min-h-full transition-colors duration-300 ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'} ${isMobile ? 'text-sm' : ''}`}
    >
      {/* Hero Section */}
      <div className={`relative w-full bg-gray-200 ${isMobile ? 'h-[250px]' : 'h-[500px]'}`}>
        {heroImage?.url ? (
          <img
            src={heroImage.url}
            alt="Development Hero"
            className="w-full h-full object-cover"
            onError={e => {
              (e.target as HTMLImageElement).src =
                'https://via.placeholder.com/1200x500?text=Image+Preview';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Hero Image Selected
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

        <div
          className={`absolute bottom-0 left-0 right-0 ${isMobile ? 'p-4' : 'p-8'} max-w-7xl mx-auto`}
        >
          <div className="flex items-end justify-between">
            <div className="w-full">
              <span className="inline-block px-2 py-1 bg-blue-600 text-white text-[10px] md:text-xs font-bold uppercase tracking-wider rounded mb-2">
                {classification?.type || 'Development'}
              </span>
              <h1
                className={`${isMobile ? 'text-2xl' : 'text-4xl md:text-5xl'} font-bold text-white mb-2 leading-tight`}
              >
                {developmentData?.name || 'Untitled Development'}
              </h1>
              <div
                className={`flex items-center text-white/90 gap-2 ${isMobile ? 'text-sm' : 'text-lg'}`}
              >
                <MapPin className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                <span className="truncate">
                  {developmentData?.location?.address}, {developmentData?.location?.city}
                </span>
              </div>
            </div>
            {!isMobile && (
              <div className="hidden md:block text-right text-white min-w-fit ml-4">
                <div className="text-sm opacity-80">Starting From</div>
                <div className="text-3xl font-bold whitespace-nowrap">
                  R {unitTypes?.[0]?.basePriceFrom?.toLocaleString() || 'TBD'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <main
        className={`
        ${isMobile ? 'p-4 space-y-6' : 'max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12'}
      `}
      >
        {/* Main Content Column */}
        <div className={`${isMobile ? 'space-y-6' : 'lg:col-span-2 space-y-12'}`}>
          {/* Mobile Price Card */}
          {isMobile && (
            <div
              className={`p-4 rounded-xl shadow-sm border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}
            >
              <div
                className={`text-xs uppercase font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Starting From
              </div>
              <div className="text-2xl font-bold text-blue-500">
                R {unitTypes?.[0]?.basePriceFrom?.toLocaleString() || 'TBD'}
              </div>
            </div>
          )}

          {/* Overview */}
          <section
            className={`rounded-2xl shadow-sm border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} ${isMobile ? 'p-5' : 'p-8'}`}
          >
            <h2
              className={`font-bold mb-4 ${isMobile ? 'text-lg' : 'text-2xl'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              About the Development
            </h2>
            <div
              className={`prose max-w-none whitespace-pre-line text-sm md:text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
            >
              {overview?.description || 'No description provided.'}
            </div>

            {/* Highlights */}
            {overview?.highlights?.length > 0 && (
              <div
                className={`mt-6 grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}
              >
                {overview.highlights.map((highlight: string, idx: number) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-lg font-medium text-sm ${isDarkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-900'}`}
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    {highlight}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Unit Types */}
          <section>
            <h2
              className={`font-bold mb-4 md:mb-6 ${isMobile ? 'text-lg' : 'text-2xl'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Available Units
            </h2>
            <div className="space-y-4">
              {unitTypes?.map((unit: UnitType) => {
                const houseSizeSource = unit.unitSize;
                const yardSizeSource = unit.yardSize;
                const showHouseSize = isPresentSize(houseSizeSource);
                const showYardSize = isPresentSize(yardSizeSource);
                const houseSizeLabel = formatSizeValue(houseSizeSource);
                const yardSizeLabel = formatSizeValue(yardSizeSource);
                const parkingLabel = formatParkingLabel(unit);

                return (
                <div
                  key={unit.id}
                  className={`rounded-xl shadow-sm border transition-colors ${isDarkMode ? 'bg-gray-900 border-gray-800 hover:border-blue-800' : 'bg-white border-gray-100 hover:border-blue-200'} ${isMobile ? 'p-4' : 'p-6 flex flex-col md:flex-row gap-6 items-center'}`}
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3
                        className={`font-bold ${isMobile ? 'text-base' : 'text-xl'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                      >
                        {unit.name}
                      </h3>
                      <span
                        className={`font-bold text-blue-500 ${isMobile ? 'text-base' : 'text-lg'}`}
                      >
                        R {unit.basePriceFrom?.toLocaleString()}
                      </span>
                    </div>

                    <div
                      className={`flex flex-wrap gap-4 text-sm my-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} ${isMobile ? 'gap-y-2' : ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Bed className="w-4 h-4" /> {unit.bedrooms}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Bath className="w-4 h-4" /> {unit.bathrooms}
                      </div>
                      {showHouseSize && houseSizeLabel && (
                        <div className="flex items-center gap-1.5">
                          <Maximize className="w-4 h-4" /> House size {houseSizeLabel} m?
                        </div>
                      )}
                      {showYardSize && yardSizeLabel ? (
                        <div className="flex items-center gap-1.5">
                          <Maximize className="w-4 h-4" /> Erf/Yard size {yardSizeLabel} m?
                        </div>
                      ) : (
                        parkingLabel && (
                          <div className="flex items-center gap-1.5">
                            <Car className="w-4 h-4" /> Parking {parkingLabel}
                          </div>
                        )
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {Object.entries(unit.specifications?.builtInFeatures || {})
                        .filter(([_, v]) => v)
                        .map(([k]) => (
                          <span
                            key={k}
                            className={`px-2 py-1 text-[10px] md:text-xs rounded capitalize ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                          >
                            {k.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        ))}
                    </div>
                  </div>
                  {!isMobile && (
                    <button className="w-full md:w-auto px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">
                      View Details
                    </button>
                  )}
                  {isMobile && (
                    <button className="w-full mt-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg">
                      View Details
                    </button>
                  )}
                </div>
                );
              })}
              {(!unitTypes || unitTypes.length === 0) && (
                <div
                  className={`text-center py-8 rounded-xl border border-dashed ${isDarkMode ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}
                >
                  No unit types configured yet.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar (Desktop) / Bottom Actions (Mobile) */}
        <div className={`${isMobile ? 'pb-8' : 'space-y-6'}`}>
          <div
            className={`rounded-2xl shadow-sm border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} ${isMobile ? 'p-5' : 'p-6 sticky top-24'}`}
          >
            <h3 className={`font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Development Status
            </h3>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span
                className={`capitalize font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
              >
                {overview?.status?.replace('-', ' ') || 'Planning'}
              </span>
            </div>

            <button className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 mb-3">
              Enquire Now
            </button>
            <button
              className={`w-full py-4 border-2 font-bold rounded-xl transition-all ${isDarkMode ? 'bg-transparent border-gray-700 text-white hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              Download Brochure
            </button>
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <div
      className={`min-h-screen font-sans flex flex-col ${isDarkMode ? 'bg-gray-950' : 'bg-gray-100'}`}
    >
      {/* Preview Toolbar */}
      <div className="bg-gray-900 text-white px-4 py-3 sticky top-0 z-50 shadow-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.close()}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-sm font-medium">Development Preview</div>
          </div>

          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setIsMobile(false)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-xs font-medium ${!isMobile ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                <Monitor className="w-4 h-4" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                onClick={() => setIsMobile(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-xs font-medium ${isMobile ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            <button
              onClick={handleShare}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
              title="Share Preview"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div
        className={`flex-1 w-full transition-all duration-500 ease-in-out ${isMobile ? (isDarkMode ? 'bg-gray-900 py-8' : 'bg-gray-200 py-8') : isDarkMode ? 'bg-gray-950' : 'bg-white'}`}
      >
        <div
          className={`
           mx-auto transition-all duration-500 ease-in-out ${isDarkMode ? 'bg-gray-950' : 'bg-white'}
           ${
             isMobile
               ? 'w-[375px] h-[812px] rounded-[3rem] border-[12px] border-gray-800 shadow-2xl overflow-hidden relative'
               : 'w-full min-h-screen'
           }
         `}
        >
          {/* Mobile Notch */}
          {isMobile && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl z-20" />
          )}

          {/* Scrollable Area */}
          <div className={`h-full w-full ${isMobile ? 'overflow-y-auto scrollbar-hide' : ''}`}>
            <PreviewContent />
          </div>
        </div>
      </div>
    </div>
  );
};
