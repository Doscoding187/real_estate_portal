import React, { useState, useEffect } from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface PropertyMobileFooterProps {
  agentName: string;
  price: string;
  repayment: string;
  onEmail?: () => void;
  onWhatsApp?: () => void;
  canWhatsApp?: boolean;
}

export function PropertyMobileFooter({
  agentName: _agentName,
  price,
  repayment,
  onEmail,
  onWhatsApp,
  canWhatsApp = true,
}: PropertyMobileFooterProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Show after scrolling past 200px
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
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
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 md:hidden pb-[env(safe-area-inset-bottom)]"
        >
          {/* Price Row */}
          <div className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="font-bold text-slate-900">{price}</span>
            <span className="text-slate-500">{repayment}</span>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 p-3">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0 h-11"
              onClick={onWhatsApp}
              disabled={!canWhatsApp}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>

            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-11"
              onClick={onEmail}
            >
              <Mail className="h-4 w-4 mr-2" />
              Enquire
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
