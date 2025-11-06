import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingUp, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProspectDashboard } from './ProspectDashboard';

interface ProspectTriggerProps {
  propertyId?: number;
  variant?: 'floating' | 'button';
  className?: string;
}

export function ProspectTrigger({
  propertyId,
  variant = 'floating',
  className = '',
}: ProspectTriggerProps) {
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Auto-show dashboard after scrolling or time-based interaction
  useEffect(() => {
    const handleScroll = () => {
      if (!hasInteracted && window.scrollY > 300) {
        setHasInteracted(true);
        // Delay auto-show slightly for better UX
        setTimeout(() => {
          setIsDashboardOpen(true);
        }, 2000);
      }
    };

    const handleTimeBased = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
        setTimeout(() => {
          setIsDashboardOpen(true);
        }, 15000); // Show after 15 seconds of browsing
      }
    };

    window.addEventListener('scroll', handleScroll);
    const timer = setTimeout(handleTimeBased, 15000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [hasInteracted]);

  if (variant === 'button') {
    return (
      <>
        <Button
          onClick={() => setIsDashboardOpen(true)}
          className={`bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg ${className}`}
        >
          <Calculator className="w-4 h-4 mr-2" />
          Calculate What You Can Afford
        </Button>

        <ProspectDashboard
          isOpen={isDashboardOpen}
          onClose={() => setIsDashboardOpen(false)}
          propertyId={propertyId}
        />
      </>
    );
  }

  // Floating variant
  return (
    <>
      {/* Floating Trigger Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 2, duration: 0.5 }}
        className={`fixed bottom-6 right-6 z-40 ${className}`}
      >
        <div className="relative">
          {/* Pulse animation */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 bg-blue-500 rounded-full"
          />

          <Button
            onClick={() => {
              setHasInteracted(true);
              setIsDashboardOpen(true);
            }}
            size="lg"
            className="relative bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-2xl rounded-full w-14 h-14 p-0"
          >
            <Calculator className="w-6 h-6" />

            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Calculate what you can afford
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
            </div>
          </Button>

          {/* Notification badge */}
          {!hasInteracted && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 3, type: 'spring', stiffness: 500 }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
            >
              !
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Dashboard */}
      <ProspectDashboard
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        propertyId={propertyId}
      />
    </>
  );
}
