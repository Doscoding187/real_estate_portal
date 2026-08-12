import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, CheckCircle2, FileSearch, FileText, MapPin, Search } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';

const channels = [
  { id: 'search', name: 'Public Search', icon: Search, delay: 0.2 },
  { id: 'location', name: 'Location Discovery', icon: MapPin, delay: 0.6 },
  { id: 'property', name: 'Property Detail', icon: FileSearch, delay: 1.0 },
  { id: 'development', name: 'Development Discovery', icon: Building2, delay: 1.4 },
];

export const ExtendedNetworkSection: React.FC = () => {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewedChannels, setPreviewedChannels] = useState<string[]>([]);

  useEffect(() => {
    if (!isPreviewing) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    channels.forEach(channel => {
      const timeout = setTimeout(() => {
        setPreviewedChannels(previous => [...previous, channel.id]);
      }, channel.delay * 1000);
      timeouts.push(timeout);
    });

    const reset = setTimeout(() => {
      setIsPreviewing(false);
      setPreviewedChannels([]);
    }, 4000);
    timeouts.push(reset);

    return () => timeouts.forEach(clearTimeout);
  }, [isPreviewing]);

  const handlePreview = () => {
    if (isPreviewing) return;
    setPreviewedChannels([]);
    setIsPreviewing(true);
  };

  return (
    <section
      data-testid="extended-network-section"
      className="relative overflow-hidden bg-white py-24"
      aria-labelledby="extended-network-heading"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Left Column: Copy */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="order-2 lg:order-1"
          >
            <motion.div
              variants={staggerItem}
              className="mb-6 inline-flex items-center space-x-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2"
            >
              <FileSearch className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <span className="text-sm font-semibold uppercase tracking-wider text-blue-800">
                Property Listify surfaces
              </span>
            </motion.div>

            <motion.h2
              id="extended-network-heading"
              variants={staggerItem}
              className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 lg:text-5xl"
            >
              One inventory source.{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                More ways to be discovered.
              </span>
            </motion.h2>

            <motion.p variants={staggerItem} className="mb-8 text-lg text-slate-600 md:text-xl">
              Keep inventory connected to the Property Listify discovery surfaces supported by the
              current product: public Search, location discovery, property detail and development
              discovery/detail.
            </motion.p>

            <motion.ul variants={staggerItem} className="mb-10 space-y-4">
              {[
                'Public Search',
                'Location / provincial discovery',
                'Property detail',
                'Development discovery and detail',
              ].map(benefit => (
                <li key={benefit} className="flex items-center font-medium text-slate-700">
                  <div className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  </div>
                  {benefit}
                </li>
              ))}
            </motion.ul>
          </motion.div>

          {/* Right Column: Product surface illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative order-1 lg:order-2"
          >
            <div className="relative flex flex-col items-center rounded-3xl border border-slate-100 bg-slate-50 p-8 shadow-inner">
              {/* Original inventory node */}
              <div className="relative z-20 mb-12 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="mb-1 h-4 w-24 rounded bg-slate-200" aria-hidden="true" />
                      <div className="h-3 w-16 rounded bg-slate-100" aria-hidden="true" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={isPreviewing}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Preview how inventory appears across Property Listify surfaces"
                  >
                    {isPreviewing ? 'Previewing...' : 'Preview flow'}
                  </button>
                </div>

                <div className="mb-3 h-24 w-full rounded-lg bg-slate-100" aria-hidden="true" />
                <div className="flex space-x-2" aria-hidden="true">
                  <div className="h-3 flex-1 rounded bg-slate-100" />
                  <div className="h-3 w-1/4 rounded bg-slate-100" />
                </div>
              </div>

              {/* Connecting lines and discovery surfaces */}
              <div className="relative h-40 w-full max-w-md">
                {channels.map((channel, index) => {
                  const isPreviewed = previewedChannels.includes(channel.id);
                  const angle = (index / (channels.length - 1)) * Math.PI - Math.PI;
                  const radius = 120;
                  const x = radius * Math.cos(angle) + 200;
                  const y = radius * Math.sin(angle) + 120;

                  return (
                    <React.Fragment key={channel.id}>
                      <svg
                        className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
                        aria-hidden="true"
                      >
                        <path
                          d={`M 200 0 Q ${x} 50, ${x} ${y}`}
                          fill="none"
                          stroke={isPreviewed ? '#60a5fa' : '#e2e8f0'}
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          className="transition-colors duration-500"
                        />
                        <AnimatePresence>
                          {isPreviewing && !isPreviewed && (
                            <motion.circle
                              cx={200}
                              cy={0}
                              r={4}
                              fill="#2563eb"
                              animate={{ cx: x, cy: y }}
                              transition={{ duration: channel.delay, ease: 'easeInOut' }}
                            />
                          )}
                        </AnimatePresence>
                      </svg>

                      <div
                        className="absolute flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center"
                        style={{ left: `${x}px`, top: `${y}px` }}
                      >
                        <motion.div
                          animate={
                            isPreviewed ? { scale: [1, 1.2, 1], borderColor: '#3b82f6' } : {}
                          }
                          className={`z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white transition-colors duration-500 ${isPreviewed ? 'border-blue-500 text-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.35)]' : 'border-slate-200 text-slate-400'}`}
                        >
                          <channel.icon className="h-5 w-5" aria-hidden="true" />
                        </motion.div>
                        <div
                          className={`mt-2 whitespace-nowrap text-xs font-medium transition-colors duration-500 ${isPreviewed ? 'text-blue-700' : 'text-slate-500'}`}
                        >
                          {channel.name}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
