import React, { useState, useEffect } from 'react';
import { Phone, Mail, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface PropertyMobileFooterProps {
  agentName: string;
  onCall?: () => void;
  onEmail?: () => void;
  onWhatsApp?: () => void;
}

export function PropertyMobileFooter({ 
  agentName,
  onCall,
  onEmail,
  onWhatsApp 
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
            className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 md:hidden flex gap-3 items-center pb-[safe-area-inset-bottom]"
        >
          <Button 
            variant="outline" 
            className="flex-1 border-slate-300 text-slate-700 bg-white"
            onClick={onCall}
          >
            <Phone className="h-4 w-4 mr-2" />
            Call
          </Button>
          
          <Button 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0"
            onClick={onWhatsApp}
          >
             <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
          
          <Button 
            className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white"
            onClick={onEmail}
          >
            <Mail className="h-4 w-4 mr-2" />
            Enquire
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
