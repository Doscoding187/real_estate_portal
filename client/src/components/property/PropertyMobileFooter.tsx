import React, { useState, useEffect } from 'react';
import { Calculator, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface PropertyMobileFooterProps {
  agentName: string;
  onQualify?: () => void;
  onEnquire?: () => void;
  onWhatsApp?: () => void;
  canQualify?: boolean;
  canEnquire?: boolean;
  canWhatsApp?: boolean;
}

export function PropertyMobileFooter({
  agentName: _agentName,
  onQualify,
  onEnquire,
  onWhatsApp,
  canQualify = true,
  canEnquire = true,
  canWhatsApp = true,
}: PropertyMobileFooterProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Show after scrolling past the hero section (approx 300px)
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 grid grid-cols-3 gap-2 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 md:hidden pb-[safe-area-inset-bottom]"
        >
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={onQualify}
            disabled={!canQualify}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Qualify
          </Button>

          <Button
            className="bg-green-600 hover:bg-green-700 text-white border-0"
            onClick={onWhatsApp}
            disabled={!canWhatsApp}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>

          <Button
            variant="outline"
            className="border-slate-300 text-slate-700 bg-white"
            onClick={onEnquire}
            disabled={!canEnquire}
          >
            <Mail className="h-4 w-4 mr-2" />
            Enquire
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
