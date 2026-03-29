import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { designTokens } from '@/lib/design-tokens';
import { buttonVariants } from '@/lib/animations/exploreAnimations';
import { DiscoveryFeedProvider } from '../providers/DiscoveryFeedProvider';
import { useDiscoveryStore } from '../store/useDiscoveryStore';
import { DiscoveryVideoViewport } from './DiscoveryFeedScreen';

const SHORTS_CHANNELS = [
  { label: 'For You', category: undefined },
  { label: 'Listings', category: 'property' as const },
  { label: 'Developments', category: 'development' as const },
  { label: 'Neighbourhoods', category: 'location' as const },
  { label: 'Insights', category: 'insight' as const },
  { label: 'Services', category: 'service' as const },
] as const;

export default function DiscoveryShortsScreen() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const query = useDiscoveryStore(state => state.query);
  const setQuery = useDiscoveryStore(state => state.setQuery);

  useEffect(() => {
    setQuery({
      mode: 'shorts',
      category: undefined,
      contentType: 'video',
      creatorActorId: undefined,
      location: undefined,
      priceRange: undefined,
    });
  }, [setQuery]);

  return (
    <DiscoveryFeedProvider mode="shorts">
      <DiscoveryVideoViewport
        background="linear-gradient(180deg, #000000 0%, #031525 52%, #07203a 100%)"
        emptyTitle="No shorts yet"
        emptyCopy="We do not have media in this lane yet. Check back shortly or switch to the main discovery feed."
        showMetaChips={false}
        overlay={
          <>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="absolute left-0 right-0 top-0 z-40 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.75) 0%, transparent 100%)',
              }}
            >
              <div className="flex items-center justify-between p-4 pointer-events-auto">
                <motion.button
                  onClick={() => setLocation('/explore/home')}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="p-3 rounded-full text-white shadow-xl"
                  style={{
                    background: designTokens.colors.glass.bgDark,
                    backdropFilter: designTokens.colors.glass.backdrop,
                    border: `1px solid ${designTokens.colors.glass.borderDark}`,
                  }}
                  aria-label="Back to explore"
                >
                  <ArrowLeft className="w-6 h-6" />
                </motion.button>

                <div className="rounded-full border border-white/20 bg-black/35 px-4 py-2 text-xs font-medium text-white backdrop-blur-xl">
                  Discovery shorts
                </div>

                {isAuthenticated ? (
                  <motion.button
                    onClick={() => setLocation('/explore/upload')}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    className="flex items-center gap-2 px-5 py-3 rounded-full text-white font-semibold shadow-xl"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(79, 70, 229, 0.9) 100%)',
                      backdropFilter: designTokens.colors.glass.backdrop,
                      border: `1px solid ${designTokens.colors.glass.border}`,
                    }}
                    aria-label="Upload content"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="hidden sm:inline">Upload</span>
                  </motion.button>
                ) : (
                  <div className="w-[88px]" aria-hidden="true" />
                )}
              </div>

              <div className="pointer-events-auto overflow-x-auto px-4 pb-3 scrollbar-hide">
                <div className="mx-auto flex w-max min-w-full gap-2">
                  {SHORTS_CHANNELS.map(channel => {
                    const isActive = query.category === channel.category || (!query.category && !channel.category);

                    return (
                      <button
                        key={channel.label}
                        type="button"
                        onClick={() =>
                          setQuery({
                            mode: 'shorts',
                            category: channel.category,
                            contentType: 'video',
                          })
                        }
                        className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                          isActive
                            ? 'border-white/45 bg-white text-slate-950 shadow-[0_10px_30px_rgba(255,255,255,0.18)]'
                            : 'border-white/15 bg-black/35 text-white/80 hover:bg-black/45'
                        }`}
                      >
                        {channel.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="absolute bottom-32 left-1/2 z-30 -translate-x-1/2 pointer-events-none"
              >
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 1.5, repeat: 2, ease: 'easeInOut' }}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-6 py-3 text-sm font-medium text-white backdrop-blur-xl"
                >
                  <span>Swipe for next</span>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </>
        }
      />
    </DiscoveryFeedProvider>
  );
}
