/**
 * Explore Component Demo Page
 * 
 * Interactive showcase of all Hybrid Modern + Soft UI components
 * for the Explore feature refinement.
 */

import { useState } from 'react';
import { ModernCard } from '@/components/ui/soft/ModernCard';
import { IconButton } from '@/components/ui/soft/IconButton';
import { MicroPill } from '@/components/ui/soft/MicroPill';
import { AvatarBubble } from '@/components/ui/soft/AvatarBubble';
import { 
  ModernSkeleton, 
  PropertyCardSkeleton, 
  VideoCardSkeleton, 
  NeighbourhoodCardSkeleton,
  InsightCardSkeleton 
} from '@/components/ui/soft/ModernSkeleton';
import { InsightCard } from '@/components/explore-discovery/cards/InsightCard';
import { useVideoPlayback } from '@/hooks/useVideoPlayback';
import { 
  Heart, 
  Share2, 
  MapPin, 
  Home, 
  Building2, 
  Sparkles,
  Play,
  Grid3x3,
  Loader2,
  AlertCircle,
} from 'lucide-react';

/**
 * Video Playback Demo Component
 * Demonstrates the useVideoPlayback hook with viewport detection
 */
function VideoPlaybackDemo() {
  const { 
    videoRef, 
    containerRef, 
    isPlaying, 
    isBuffering, 
    error, 
    inView,
    retry 
  } = useVideoPlayback({
    preloadNext: true,
    threshold: 0.5,
  });

  return (
    <ModernCard>
      <div ref={containerRef} className="relative">
        <video
          ref={videoRef}
          src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
          poster="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop"
          className="w-full h-64 object-cover rounded-lg"
          loop
          muted
          playsInline
        />

        {/* Status Overlay */}
        <div className="absolute top-2 right-2 flex gap-2">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            inView ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
          }`}>
            {inView ? 'In View' : 'Out of View'}
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            isPlaying ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
          }`}>
            {isPlaying ? 'Playing' : 'Paused'}
          </div>
        </div>

        {/* Buffering Indicator */}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
            <div className="bg-white/90 backdrop-blur-sm rounded-full p-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="text-center p-4">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
              <p className="text-white text-sm mb-3">{error.message}</p>
              <button
                onClick={retry}
                className="accent-btn px-4 py-2 text-white text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Info */}
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">In Viewport:</span>
          <span className="font-medium">{inView ? 'Yes' : 'No'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Playing:</span>
          <span className="font-medium">{isPlaying ? 'Yes' : 'No'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Buffering:</span>
          <span className="font-medium">{isBuffering ? 'Yes' : 'No'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Error:</span>
          <span className="font-medium">{error ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </ModernCard>
  );
}

export default function ExploreComponentDemo() {
  const [selectedChip, setSelectedChip] = useState<string>('all');
  const [showSkeletons, setShowSkeletons] = useState(false);
  const [cardVariant, setCardVariant] = useState<'default' | 'glass' | 'elevated'>('default');
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [pillSize, setPillSize] = useState<'sm' | 'md' | 'lg'>('md');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Explore Component Library
          </h1>
          <p className="text-gray-600">
            Hybrid Modern + Soft UI Design System - Interactive Component Showcase
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Route: <code className="bg-gray-200 px-2 py-1 rounded">/explore/component-demo</code>
          </p>
        </div>

        {/* Interactive Controls */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Interactive Controls</h2>
          <ModernCard className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Variant
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCardVariant('default')}
                    className={`px-3 py-1 rounded text-sm ${
                      cardVariant === 'default'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Default
                  </button>
                  <button
                    onClick={() => setCardVariant('glass')}
                    className={`px-3 py-1 rounded text-sm ${
                      cardVariant === 'glass'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Glass
                  </button>
                  <button
                    onClick={() => setCardVariant('elevated')}
                    className={`px-3 py-1 rounded text-sm ${
                      cardVariant === 'elevated'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Elevated
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button State
                </label>
                <button
                  onClick={() => setButtonDisabled(!buttonDisabled)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  {buttonDisabled ? 'Enable' : 'Disable'} Buttons
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pill Size
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPillSize('sm')}
                    className={`px-3 py-1 rounded text-sm ${
                      pillSize === 'sm'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Small
                  </button>
                  <button
                    onClick={() => setPillSize('md')}
                    className={`px-3 py-1 rounded text-sm ${
                      pillSize === 'md'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => setPillSize('lg')}
                    className={`px-3 py-1 rounded text-sm ${
                      pillSize === 'lg'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Large
                  </button>
                </div>
              </div>
            </div>
          </ModernCard>
        </section>

        {/* ModernCard Variants */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">ModernCard</h2>
          <p className="text-gray-600 mb-4">
            Versatile card component with hover animations and multiple variants
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ModernCard variant="default" hoverable>
              <h3 className="font-semibold mb-2">Default Card</h3>
              <p className="text-sm text-gray-600">
                Clean white background with subtle shadow. Hover to see lift animation.
              </p>
            </ModernCard>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-lg">
              <ModernCard variant="glass" hoverable>
                <h3 className="font-semibold mb-2">Glass Card</h3>
                <p className="text-sm text-gray-600">
                  Semi-transparent with blur effect. Perfect for overlays.
                </p>
              </ModernCard>
            </div>

            <ModernCard variant="elevated" hoverable>
              <h3 className="font-semibold mb-2">Elevated Card</h3>
              <p className="text-sm text-gray-600">
                Higher elevation with larger shadow. Use for important content.
              </p>
            </ModernCard>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-3">Interactive Card (Click Me!)</h3>
            <ModernCard 
              variant={cardVariant} 
              onClick={() => alert('Card clicked!')}
              className="max-w-md"
            >
              <div className="p-4">
                <h4 className="font-semibold mb-2">Clickable Card</h4>
                <p className="text-sm text-gray-600">
                  This card has an onClick handler. Try clicking it! Current variant: {cardVariant}
                </p>
              </div>
            </ModernCard>
          </div>
        </section>

        {/* IconButton Variants */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">IconButton</h2>
          <p className="text-gray-600 mb-4">
            Icon buttons with smooth animations and multiple variants. Try hovering and clicking!
          </p>
          <div className="flex flex-wrap gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Default Variant</p>
              <div className="flex gap-2">
                <IconButton 
                  icon={Heart} 
                  onClick={() => alert('Liked!')} 
                  label="Like" 
                  size="sm" 
                  disabled={buttonDisabled}
                />
                <IconButton 
                  icon={Heart} 
                  onClick={() => alert('Liked!')} 
                  label="Like" 
                  size="md" 
                  disabled={buttonDisabled}
                />
                <IconButton 
                  icon={Heart} 
                  onClick={() => alert('Liked!')} 
                  label="Like" 
                  size="lg" 
                  disabled={buttonDisabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Glass Variant (on gradient)</p>
              <div className="flex gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-lg">
                <IconButton 
                  icon={Share2} 
                  onClick={() => alert('Shared!')} 
                  label="Share" 
                  variant="glass" 
                  size="sm" 
                  disabled={buttonDisabled}
                />
                <IconButton 
                  icon={Share2} 
                  onClick={() => alert('Shared!')} 
                  label="Share" 
                  variant="glass" 
                  size="md" 
                  disabled={buttonDisabled}
                />
                <IconButton 
                  icon={Share2} 
                  onClick={() => alert('Shared!')} 
                  label="Share" 
                  variant="glass" 
                  size="lg" 
                  disabled={buttonDisabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Accent Variant</p>
              <div className="flex gap-2">
                <IconButton 
                  icon={Play} 
                  onClick={() => alert('Playing!')} 
                  label="Play" 
                  variant="accent" 
                  size="sm" 
                  disabled={buttonDisabled}
                />
                <IconButton 
                  icon={Play} 
                  onClick={() => alert('Playing!')} 
                  label="Play" 
                  variant="accent" 
                  size="md" 
                  disabled={buttonDisabled}
                />
                <IconButton 
                  icon={Play} 
                  onClick={() => alert('Playing!')} 
                  label="Play" 
                  variant="accent" 
                  size="lg" 
                  disabled={buttonDisabled}
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            {buttonDisabled ? '✓ Buttons are disabled' : 'Use the controls above to disable buttons'}
          </p>
        </section>

        {/* MicroPill Variants */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">MicroPill</h2>
          <p className="text-gray-600 mb-4">
            Category chips with selection states. Click to select, hover for animation.
          </p>
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Default Variant (Size: {pillSize})
              </p>
              <div className="flex flex-wrap gap-2">
                <MicroPill 
                  label="All" 
                  selected={selectedChip === 'all'}
                  onClick={() => setSelectedChip('all')}
                  size={pillSize}
                />
                <MicroPill 
                  label="Houses" 
                  icon={Home}
                  selected={selectedChip === 'houses'}
                  onClick={() => setSelectedChip('houses')}
                  size={pillSize}
                />
                <MicroPill 
                  label="Apartments" 
                  icon={Building2}
                  selected={selectedChip === 'apartments'}
                  onClick={() => setSelectedChip('apartments')}
                  size={pillSize}
                />
                <MicroPill 
                  label="Developments" 
                  icon={Grid3x3}
                  selected={selectedChip === 'developments'}
                  onClick={() => setSelectedChip('developments')}
                  size={pillSize}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Accent Variant (Size: {pillSize})
              </p>
              <div className="flex flex-wrap gap-2">
                <MicroPill 
                  label="Featured" 
                  icon={Sparkles}
                  variant="accent"
                  selected={selectedChip === 'featured'}
                  onClick={() => setSelectedChip('featured')}
                  size={pillSize}
                />
                <MicroPill 
                  label="Near You" 
                  icon={MapPin}
                  variant="accent"
                  selected={selectedChip === 'near'}
                  onClick={() => setSelectedChip('near')}
                  size={pillSize}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Disabled State</p>
              <div className="flex flex-wrap gap-2">
                <MicroPill 
                  label="Disabled" 
                  disabled
                  size={pillSize}
                />
                <MicroPill 
                  label="Disabled Selected" 
                  selected
                  disabled
                  size={pillSize}
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Currently selected: <strong>{selectedChip}</strong>
          </p>
        </section>

        {/* AvatarBubble Variants */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">AvatarBubble</h2>
          <p className="text-gray-600 mb-4">
            User avatars with status indicators and fallback states
          </p>
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Size Variants</p>
              <div className="flex items-end gap-3">
                <div className="text-center">
                  <AvatarBubble 
                    src="https://i.pravatar.cc/150?img=1" 
                    alt="User" 
                    size="xs" 
                  />
                  <p className="text-xs text-gray-500 mt-1">xs</p>
                </div>
                <div className="text-center">
                  <AvatarBubble 
                    src="https://i.pravatar.cc/150?img=2" 
                    alt="User" 
                    size="sm" 
                  />
                  <p className="text-xs text-gray-500 mt-1">sm</p>
                </div>
                <div className="text-center">
                  <AvatarBubble 
                    src="https://i.pravatar.cc/150?img=3" 
                    alt="User" 
                    size="md" 
                  />
                  <p className="text-xs text-gray-500 mt-1">md</p>
                </div>
                <div className="text-center">
                  <AvatarBubble 
                    src="https://i.pravatar.cc/150?img=4" 
                    alt="User" 
                    size="lg" 
                  />
                  <p className="text-xs text-gray-500 mt-1">lg</p>
                </div>
                <div className="text-center">
                  <AvatarBubble 
                    src="https://i.pravatar.cc/150?img=5" 
                    alt="User" 
                    size="xl" 
                  />
                  <p className="text-xs text-gray-500 mt-1">xl</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Status Indicators</p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <AvatarBubble 
                    src="https://i.pravatar.cc/150?img=6" 
                    alt="Online User" 
                    status="online"
                    size="lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Online</p>
                </div>
                <div className="text-center">
                  <AvatarBubble 
                    src="https://i.pravatar.cc/150?img=7" 
                    alt="Busy User" 
                    status="busy"
                    size="lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Busy</p>
                </div>
                <div className="text-center">
                  <AvatarBubble 
                    src="https://i.pravatar.cc/150?img=8" 
                    alt="Offline User" 
                    status="offline"
                    size="lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Offline</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Fallback States</p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <AvatarBubble 
                    name="John Doe" 
                    size="lg" 
                  />
                  <p className="text-xs text-gray-500 mt-1">Initials</p>
                </div>
                <div className="text-center">
                  <AvatarBubble 
                    alt="No Image" 
                    size="lg" 
                  />
                  <p className="text-xs text-gray-500 mt-1">Icon</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Interactive (Clickable)</p>
              <AvatarBubble 
                src="https://i.pravatar.cc/150?img=9" 
                alt="Clickable Avatar" 
                size="xl"
                status="online"
                onClick={() => alert('Avatar clicked!')}
              />
            </div>
          </div>
        </section>

        {/* InsightCard Demo */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">InsightCard (Refactored)</h2>
          <p className="text-gray-600 mb-4">
            Market insights with modern design, accent colors, and rich micro-interactions
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Market Trend */}
            <div>
              <InsightCard
                insight={{
                  id: 1,
                  title: 'Sandton Property Market Surging',
                  description: 'Average property prices in Sandton have increased significantly over the past quarter, driven by high demand and limited supply.',
                  insightType: 'market-trend',
                  data: {
                    value: 'R 2.5M',
                    change: 12.5,
                    label: 'Average price',
                  },
                  imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400',
                }}
                onClick={() => alert('Market trend clicked!')}
              />
            </div>

            {/* Price Analysis */}
            <div>
              <InsightCard
                insight={{
                  id: 2,
                  title: 'Cape Town Coastal Properties',
                  description: 'Coastal property prices are showing signs of stabilization with slight decreases in some areas.',
                  insightType: 'price-analysis',
                  data: {
                    value: 'R 4.2M',
                    change: -3.2,
                    label: 'Median price',
                  },
                  imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400',
                }}
                onClick={() => alert('Price analysis clicked!')}
              />
            </div>

            {/* Investment Tip */}
            <div>
              <InsightCard
                insight={{
                  id: 3,
                  title: 'Best Time to Invest',
                  description: 'Market analysis suggests Q2 2024 is optimal for Johannesburg investments with favorable interest rates.',
                  insightType: 'investment-tip',
                  data: {
                    value: '8.5%',
                    change: 2.1,
                    label: 'Rental yield',
                  },
                }}
                onClick={() => alert('Investment tip clicked!')}
              />
            </div>

            {/* Area Spotlight */}
            <div>
              <InsightCard
                insight={{
                  id: 4,
                  title: 'Rosebank: The New Business Hub',
                  description: 'Rosebank is emerging as a prime business district with new developments and excellent transport links.',
                  insightType: 'area-spotlight',
                  imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
                }}
                onClick={() => alert('Area spotlight clicked!')}
              />
            </div>

            {/* Simple insight without data */}
            <div>
              <InsightCard
                insight={{
                  id: 5,
                  title: 'Understanding Transfer Costs',
                  description: 'Learn about the various costs involved in property transfers, including transfer duty and legal fees.',
                  insightType: 'investment-tip',
                }}
                onClick={() => alert('Simple insight clicked!')}
              />
            </div>

            {/* Large positive change */}
            <div>
              <InsightCard
                insight={{
                  id: 6,
                  title: 'Pretoria East Boom',
                  description: 'The Pretoria East property market is experiencing unprecedented growth with new developments.',
                  insightType: 'market-trend',
                  data: {
                    value: 'R 1.8M',
                    change: 18.7,
                    label: 'Average price',
                  },
                  imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
                }}
                onClick={() => alert('Boom insight clicked!')}
              />
            </div>
          </div>

          <div className="mt-6">
            <ModernCard className="p-6 bg-purple-50">
              <h3 className="font-semibold mb-3 text-purple-900">Micro-interactions</h3>
              <ul className="space-y-2 text-sm text-purple-800">
                <li>✨ Icon: Scale 1.1 + 5° rotation on hover</li>
                <li>✨ Badge: Fade in from right with 0.1s delay</li>
                <li>✨ Data: Fade in from bottom with 0.15s delay</li>
                <li>✨ Change indicator: Slides right 2px on hover</li>
                <li>✨ Image: Scales to 1.05 on hover (500ms smooth)</li>
                <li>✨ Arrow: Continuous pulse animation (0 → 4px → 0)</li>
                <li>✨ Title: Color transition to indigo on card hover</li>
              </ul>
            </ModernCard>
          </div>

          <div className="mt-6">
            <p className="text-sm text-gray-600">
              📖 For complete documentation, see{' '}
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                client/src/components/explore-discovery/cards/InsightCard.README.md
              </code>
            </p>
          </div>
        </section>

        {/* Video Playback Hook Demo */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Video Playback Hook</h2>
          <p className="text-gray-600 mb-4">
            Viewport-based auto-play/pause with IntersectionObserver. Scroll the video in/out of view to see it work!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <VideoPlaybackDemo />
            <ModernCard>
              <h3 className="font-semibold mb-3">Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Auto-play when 50% visible in viewport</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Auto-pause when exiting viewport</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Buffering state detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Error handling with retry logic</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Exponential backoff for retries (max 3)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Low-bandwidth mode support</span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Tip:</strong> Scroll the page to see the video auto-play/pause based on viewport visibility!
                </p>
              </div>
            </ModernCard>
          </div>
        </section>

        {/* Skeleton States */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Skeleton States</h2>
          <p className="text-gray-600 mb-4">
            Skeleton loaders with subtle pulse animation that match actual card layouts precisely.
            Requirements: 7.4
          </p>
          
          <button
            onClick={() => setShowSkeletons(!showSkeletons)}
            className="accent-btn px-6 py-3 mb-6 text-white"
          >
            {showSkeletons ? 'Hide' : 'Show'} Skeleton Loaders
          </button>

          {showSkeletons && (
            <div className="space-y-8">
              {/* PropertyCard Skeleton */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">PropertyCard Skeleton</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Matches PropertyCard layout: Image (aspect-[4/3]), price, title (2 lines), location, features
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <PropertyCardSkeleton />
                  <PropertyCardSkeleton />
                  <PropertyCardSkeleton />
                </div>
              </div>

              {/* VideoCard Skeleton */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">VideoCard Skeleton</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Matches VideoCard layout: Thumbnail (aspect-[9/16]), play button, badges, title, creator
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <VideoCardSkeleton />
                  <VideoCardSkeleton />
                  <VideoCardSkeleton />
                  <VideoCardSkeleton />
                </div>
              </div>

              {/* NeighbourhoodCard Skeleton */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">NeighbourhoodCard Skeleton</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Matches NeighbourhoodCard layout: Image (aspect-[16/10]), follow button, name overlay, stats, highlights
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <NeighbourhoodCardSkeleton />
                  <NeighbourhoodCardSkeleton />
                  <NeighbourhoodCardSkeleton />
                </div>
              </div>

              {/* InsightCard Skeleton */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">InsightCard Skeleton</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Matches InsightCard layout: Gradient header, icon, badge, data value, title, description, image
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InsightCardSkeleton />
                  <InsightCardSkeleton />
                  <InsightCardSkeleton />
                </div>
              </div>

              {/* Base Skeleton Variants */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">Base Skeleton Variants</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Reusable skeleton primitives for custom layouts
                </p>
                <ModernCard className="p-6">
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Text Variant</p>
                      <ModernSkeleton variant="text" />
                      <ModernSkeleton variant="text" width="80%" />
                      <ModernSkeleton variant="text" width="60%" />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Avatar Variant</p>
                      <div className="flex gap-3">
                        <ModernSkeleton variant="avatar" />
                        <ModernSkeleton variant="avatar" />
                        <ModernSkeleton variant="avatar" />
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Card Variant</p>
                      <ModernSkeleton variant="card" />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Custom Dimensions</p>
                      <div className="space-y-2">
                        <ModernSkeleton variant="custom" width="200px" height="40px" className="rounded-lg" />
                        <ModernSkeleton variant="custom" width="150px" height="30px" className="rounded-full" />
                        <ModernSkeleton variant="custom" width="100%" height="120px" className="rounded-xl" />
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Multiple Lines (count prop)</p>
                      <ModernSkeleton variant="text" count={4} />
                    </div>
                  </div>
                </ModernCard>
              </div>

              {/* Animation Details */}
              <ModernCard className="p-6 bg-purple-50">
                <h3 className="font-semibold mb-3 text-purple-900">Animation Details</h3>
                <ul className="space-y-2 text-sm text-purple-800">
                  <li>✨ Subtle pulse animation using gradient background position</li>
                  <li>✨ 1.5s duration with linear easing for smooth continuous motion</li>
                  <li>✨ Gradient: from-gray-200 via-gray-100 to-gray-200</li>
                  <li>✨ Background size: 200% width for smooth sweep effect</li>
                  <li>✨ Respects prefers-reduced-motion (Framer Motion handles this)</li>
                  <li>✨ ARIA labels for accessibility (role="status", aria-label="Loading...")</li>
                </ul>
              </ModernCard>

              {/* Usage Example */}
              <ModernCard className="p-6">
                <h3 className="font-semibold mb-3">Usage Example</h3>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-xs">
{`import { 
  PropertyCardSkeleton,
  VideoCardSkeleton,
  NeighbourhoodCardSkeleton,
  InsightCardSkeleton,
  ModernSkeleton 
} from '@/components/ui/soft/ModernSkeleton';

// Use card-specific skeletons
function PropertyFeed() {
  const { data, isLoading } = useQuery('properties');
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-6">
        <PropertyCardSkeleton />
        <PropertyCardSkeleton />
        <PropertyCardSkeleton />
      </div>
    );
  }
  
  return <PropertyGrid properties={data} />;
}

// Use base skeleton for custom layouts
function CustomCard() {
  return (
    <div className="modern-card p-4">
      <div className="flex items-center gap-3 mb-3">
        <ModernSkeleton variant="avatar" />
        <div className="flex-1">
          <ModernSkeleton variant="text" width="60%" />
          <ModernSkeleton variant="text" width="40%" />
        </div>
      </div>
      <ModernSkeleton variant="text" count={3} />
    </div>
  );
}`}
                  </pre>
                </div>
              </ModernCard>

              {/* Comparison with Actual Cards */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">Side-by-Side Comparison</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Skeleton layouts match actual card layouts precisely for seamless loading states
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Skeleton State</p>
                    <PropertyCardSkeleton />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Loaded State</p>
                    <ModernCard className="p-0 overflow-hidden">
                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                        <img
                          src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=300&fit=crop"
                          alt="Property"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                          Residential
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="text-xl font-bold text-gray-900">R 2,500,000</div>
                        <h3 className="text-base font-semibold text-gray-900">
                          Modern Family Home in Sandton
                        </h3>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>Sandton, Johannesburg</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-900">
                          <div className="flex items-center gap-1">
                            <Home className="w-4 h-4" />
                            <span className="font-medium">4</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Home className="w-4 h-4" />
                            <span className="font-medium">3</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Home className="w-4 h-4" />
                            <span className="font-medium">350m²</span>
                          </div>
                        </div>
                      </div>
                    </ModernCard>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Interactive Example */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Interactive Example</h2>
          <ModernCard hoverable className="max-w-md">
            <div className="flex items-center gap-4 mb-4">
              <AvatarBubble 
                src="https://i.pravatar.cc/150?img=8" 
                alt="Agent" 
                size="lg"
                status="online"
              />
              <div className="flex-1">
                <h3 className="font-semibold">Luxury Villa in Sandton</h3>
                <p className="text-sm text-gray-600">Sandton, Johannesburg</p>
              </div>
            </div>

            <img
              src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=300&fit=crop"
              alt="Property"
              className="w-full h-48 object-cover rounded-lg mb-4"
            />

            <div className="flex gap-2 mb-4">
              <MicroPill label="5 Beds" icon={Home} size="sm" />
              <MicroPill label="4 Baths" size="sm" />
              <MicroPill label="450 m²" size="sm" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900">R 8,500,000</span>
              <div className="flex gap-2">
                <IconButton icon={Heart} onClick={() => {}} label="Save" />
                <IconButton icon={Share2} onClick={() => {}} label="Share" />
              </div>
            </div>
          </ModernCard>
        </section>

        {/* Animation Examples */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Animation Examples</h2>
          <p className="text-gray-600 mb-4">
            All animations respect prefers-reduced-motion and use smooth easing curves
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ModernCard>
              <h3 className="font-semibold mb-3">Hover Animations</h3>
              <p className="text-sm text-gray-600 mb-4">
                Hover over these elements to see subtle lift and scale effects
              </p>
              <div className="space-y-3">
                <ModernCard variant="default" hoverable className="p-3">
                  <p className="text-sm">Hover me - Subtle lift (2px)</p>
                </ModernCard>
                <ModernCard variant="elevated" hoverable className="p-3">
                  <p className="text-sm">Hover me - Scale + Shadow</p>
                </ModernCard>
              </div>
            </ModernCard>

            <ModernCard>
              <h3 className="font-semibold mb-3">Press Animations</h3>
              <p className="text-sm text-gray-600 mb-4">
                Click these elements to see press feedback
              </p>
              <div className="space-y-3">
                <ModernCard 
                  variant="default" 
                  onClick={() => {}} 
                  className="p-3"
                >
                  <p className="text-sm">Click me - Scale down (0.98)</p>
                </ModernCard>
                <div className="flex gap-2">
                  <IconButton 
                    icon={Heart} 
                    onClick={() => {}} 
                    label="Press animation" 
                  />
                  <MicroPill 
                    label="Press me" 
                    onClick={() => {}}
                  />
                </div>
              </div>
            </ModernCard>
          </div>
        </section>

        {/* Design Tokens Reference */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Design Tokens</h2>
          <ModernCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Shadows</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-lg" style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                    sm: Subtle
                  </div>
                  <div className="p-3 bg-white rounded-lg" style={{ boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.08)' }}>
                    md: Default
                  </div>
                  <div className="p-3 bg-white rounded-lg" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    lg: Elevated
                  </div>
                  <div className="p-3 bg-white rounded-lg" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                    xl: High
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Border Radius</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-indigo-100 rounded-lg">lg: 1rem (16px)</div>
                  <div className="p-3 bg-indigo-100 rounded-xl">xl: 1.5rem (24px)</div>
                  <div className="p-3 bg-indigo-100 rounded-full">pill: 9999px</div>
                </div>
              </div>
            </div>
          </ModernCard>
        </section>

        {/* Usage Guide */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Usage Guide</h2>
          <ModernCard>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Importing Components</h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`import { ModernCard } from '@/components/ui/soft/ModernCard';
import { IconButton } from '@/components/ui/soft/IconButton';
import { MicroPill } from '@/components/ui/soft/MicroPill';
import { AvatarBubble } from '@/components/ui/soft/AvatarBubble';
import { ModernSkeleton } from '@/components/ui/soft/ModernSkeleton';`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Design Tokens</h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`import { designTokens } from '@/lib/design-tokens';

// Access tokens
const shadow = designTokens.shadows.md;
const radius = designTokens.borderRadius.lg;
const spacing = designTokens.spacing.md;`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Animation Variants</h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`import { cardVariants, buttonVariants } from '@/lib/animations/exploreAnimations';
import { motion } from 'framer-motion';

<motion.div variants={cardVariants} initial="initial" animate="animate">
  Content
</motion.div>`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Tailwind Utilities</h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`// Available custom utilities
.modern-card       // Default card with shadow
.glass-overlay     // Glass effect with blur
.modern-btn        // Modern button style
.accent-btn        // Accent gradient button`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Best Practices</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Use ModernCard for all card-based layouts</li>
                  <li>Apply hoverable prop only when cards are interactive</li>
                  <li>Use glass variant for overlays on images/videos</li>
                  <li>Always provide aria-label for IconButtons</li>
                  <li>Use MicroPill for filters and category selection</li>
                  <li>Respect prefers-reduced-motion in custom animations</li>
                  <li>Use skeleton loaders during data fetching</li>
                </ul>
              </div>
            </div>
          </ModernCard>
        </section>

        {/* Video Preload Demo */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Video Preloading System</h2>
          <p className="text-gray-600 mb-4">
            Intelligent video preloading with network speed detection and adaptive loading.
          </p>
          
          <ModernCard className="p-6 mb-6">
            <h3 className="font-semibold mb-3">Features</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ Preload next 2 videos in feed automatically</li>
              <li>✅ Network speed detection using Network Information API</li>
              <li>✅ Low-bandwidth mode with poster images</li>
              <li>✅ Manual play button for slow connections</li>
              <li>✅ Adaptive loading based on connection quality</li>
              <li>✅ Automatic cleanup of out-of-range preloaded videos</li>
            </ul>
          </ModernCard>

          <ModernCard className="p-6">
            <h3 className="font-semibold mb-3">Usage Example</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-xs">
{`import { useVideoPreload } from '@/hooks/useVideoPreload';

const { isLowBandwidth, networkInfo, isPreloaded } = useVideoPreload({
  currentIndex: 0,
  videoUrls: videos.map(v => v.url),
  preloadCount: 2,
  onNetworkChange: (info) => {
    console.log('Network changed:', info);
  },
});

// Use in video component
<video
  src={video.url}
  preload={isPreloaded(video.url) ? 'auto' : 'metadata'}
  poster={video.thumbnailUrl}
/>

// Show manual play button in low-bandwidth mode
{isLowBandwidth && !isPlaying && (
  <button onClick={play}>
    <Play /> Tap to play
  </button>
)}`}
              </pre>
            </div>
          </ModernCard>

          <div className="mt-6">
            <ModernCard className="p-6 bg-blue-50">
              <h3 className="font-semibold mb-3 text-blue-900">Network Detection</h3>
              <p className="text-sm text-blue-800 mb-3">
                The hook automatically detects low-bandwidth connections based on:
              </p>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>• Save Data Mode: User has enabled data saver in browser</li>
                <li>• Connection Type: 2g or slow-2g connections</li>
                <li>• Downlink Speed: &lt; 1.5 Mbps</li>
                <li>• Round-Trip Time: &gt; 300ms</li>
              </ul>
            </ModernCard>
          </div>

          <div className="mt-6">
            <p className="text-sm text-gray-600">
              📖 For complete documentation, see{' '}
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                client/src/hooks/useVideoPreload.README.md
              </code>
            </p>
          </div>
        </section>

        {/* FilterPanel Demo */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">FilterPanel (Refactored)</h2>
          <p className="text-gray-600 mb-4">
            Modern filter panel with Zustand integration and Airbnb-inspired chip-style filters.
          </p>
          
          <ModernCard className="p-6 mb-6">
            <h3 className="font-semibold mb-3">Features</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ Zustand store integration for global state management</li>
              <li>✅ Modern chip-style filters using MicroPill component</li>
              <li>✅ Subtle shadows instead of heavy neumorphism</li>
              <li>✅ Clear Apply and Reset buttons with animations</li>
              <li>✅ Smooth slide-in animation with spring physics</li>
              <li>✅ Filter count indicator and active filter display</li>
              <li>✅ Persists to localStorage automatically</li>
              <li>✅ Keyboard accessible with proper ARIA labels</li>
            </ul>
          </ModernCard>

          <ModernCard className="p-6">
            <h3 className="font-semibold mb-3">Usage Example</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-xs">
{`import { FilterPanel } from '@/components/explore-discovery/FilterPanel';
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';

function MyComponent() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { getFilterCount } = useExploreFiltersStore();

  const handleApplyFilters = () => {
    // Trigger data fetch with current filter state
    console.log('Filters applied!');
  };

  return (
    <>
      <button onClick={() => setIsFilterOpen(true)}>
        Filters ({getFilterCount()})
      </button>

      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
      />
    </>
  );
}`}
              </pre>
            </div>
          </ModernCard>

          <div className="mt-6">
            <ModernCard className="p-6 bg-indigo-50">
              <h3 className="font-semibold mb-3 text-indigo-900">Simplified API</h3>
              <p className="text-sm text-indigo-800 mb-3">
                The refactored FilterPanel has a much simpler API compared to the old version:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-indigo-900 mb-2">Old API (13 props):</p>
                  <ul className="space-y-1 text-indigo-700 text-xs">
                    <li>• isOpen, onClose</li>
                    <li>• propertyType, onPropertyTypeChange</li>
                    <li>• priceMin, priceMax, onPriceChange</li>
                    <li>• residentialFilters, onResidentialFiltersChange</li>
                    <li>• developmentFilters, onDevelopmentFiltersChange</li>
                    <li>• landFilters, onLandFiltersChange</li>
                    <li>• filterCount, onClearAll</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-indigo-900 mb-2">New API (3 props):</p>
                  <ul className="space-y-1 text-indigo-700 text-xs">
                    <li>• isOpen</li>
                    <li>• onClose</li>
                    <li>• onApply (optional)</li>
                  </ul>
                  <p className="text-indigo-600 mt-2 text-xs">
                    All filter state is managed by Zustand! 🎉
                  </p>
                </div>
              </div>
            </ModernCard>
          </div>

          <div className="mt-6">
            <p className="text-sm text-gray-600">
              📖 For complete documentation, see{' '}
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                client/src/components/explore-discovery/FilterPanel.README.md
              </code>
            </p>
          </div>
        </section>

        {/* Mobile Bottom Sheet Demo */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Mobile Filter Bottom Sheet</h2>
          <p className="text-gray-600 mb-4">
            Drag-to-close bottom sheet with snap points, keyboard navigation, and focus trap.
          </p>
          
          <ModernCard className="p-6 mb-6">
            <h3 className="font-semibold mb-3">Features</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ Drag-to-close functionality with velocity detection</li>
              <li>✅ Snap points: Half (50%) and Full (90%)</li>
              <li>✅ Keyboard navigation with Tab/Shift+Tab</li>
              <li>✅ Focus trap - focus stays within sheet</li>
              <li>✅ Escape key to close</li>
              <li>✅ Full feature parity with desktop side panel</li>
              <li>✅ WCAG AA accessibility compliance</li>
              <li>✅ Touch-optimized with 44x44px minimum targets</li>
            </ul>
          </ModernCard>

          <ModernCard className="p-6 mb-6">
            <h3 className="font-semibold mb-3">Responsive Wrapper</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-xs">
{`import { ResponsiveFilterPanel } from '@/components/explore-discovery/ResponsiveFilterPanel';

// Automatically uses mobile bottom sheet on mobile, desktop panel on desktop
<ResponsiveFilterPanel
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onApply={() => console.log('Filters applied')}
/>`}
              </pre>
            </div>
          </ModernCard>

          <ModernCard className="p-6 bg-green-50">
            <h3 className="font-semibold mb-3 text-green-900">Snap Point Behavior</h3>
            <div className="space-y-3 text-sm text-green-800">
              <div>
                <p className="font-medium mb-1">Automatic Snapping:</p>
                <ul className="space-y-1 text-green-700 text-xs ml-4">
                  <li>• Drag down from full → Snaps to half</li>
                  <li>• Drag down from half → Closes sheet</li>
                  <li>• Drag up from half → Snaps to full</li>
                  <li>• Fast swipe down → Closes immediately</li>
                  <li>• Fast swipe up → Opens to full immediately</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">Thresholds:</p>
                <ul className="space-y-1 text-green-700 text-xs ml-4">
                  <li>• Velocity: 500px/s</li>
                  <li>• Offset: 20% down, 10% up</li>
                </ul>
              </div>
            </div>
          </ModernCard>

          <div className="mt-6">
            <ModernCard className="p-6 bg-blue-50">
              <h3 className="font-semibold mb-3 text-blue-900">Keyboard Shortcuts</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-medium text-blue-800 mb-1">Tab</p>
                  <p className="text-blue-700 text-xs">Next element</p>
                </div>
                <div>
                  <p className="font-medium text-blue-800 mb-1">Shift + Tab</p>
                  <p className="text-blue-700 text-xs">Previous element</p>
                </div>
                <div>
                  <p className="font-medium text-blue-800 mb-1">Escape</p>
                  <p className="text-blue-700 text-xs">Close sheet</p>
                </div>
                <div>
                  <p className="font-medium text-blue-800 mb-1">Enter/Space</p>
                  <p className="text-blue-700 text-xs">Activate button</p>
                </div>
              </div>
            </ModernCard>
          </div>

          <div className="mt-6">
            <p className="text-sm text-gray-600">
              📖 For complete documentation, see{' '}
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                client/src/components/explore-discovery/MobileFilterBottomSheet.README.md
              </code>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              💡 To test on desktop, resize your browser to mobile width (&lt;768px) or use device emulation
            </p>
          </div>
        </section>

        {/* Footer */}
        <section className="text-center py-8">
          <p className="text-gray-500 text-sm">
            Explore Frontend Refinement - Component Library v1.0
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Built with React, Framer Motion, and Tailwind CSS
          </p>
        </section>
      </div>
    </div>
  );
}
