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

  // Show after a short initial scroll so actions are always close by.
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 160) {
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
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-8px_20px_-12px_rgba(15,23,42,0.4)] backdrop-blur md:hidden pb-[env(safe-area-inset-bottom)]"
        >
          {/* Price Row */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-slate-900 leading-none">{price}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">For this property</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-500">Est. Repayment</p>
              <p className="text-sm font-semibold text-slate-700">{repayment}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 p-3">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0 h-11"
              onClick={onWhatsApp}
              disabled={!canWhatsApp}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp Agent
            </Button>

            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-11"
              onClick={onEmail}
            >
              <Mail className="h-4 w-4 mr-2" />
              Enquire Now
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
