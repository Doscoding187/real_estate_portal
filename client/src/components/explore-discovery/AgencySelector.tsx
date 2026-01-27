/**
 * Agency Selector Component
 * Requirements: 2.1, 9.5
 *
 * Dropdown selector for filtering content by agency
 */

import { useState, useEffect } from 'react';
import { Building2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { trpc } from '@/lib/trpc';
import { designTokens } from '@/lib/design-tokens';

interface Agency {
  id: number;
  name: string;
  logo?: string;
  isVerified?: boolean;
}

interface AgencySelectorProps {
  selectedAgencyId: number | null;
  onAgencyChange: (agencyId: number | null) => void;
  className?: string;
}

export function AgencySelector({
  selectedAgencyId,
  onAgencyChange,
  className = '',
}: AgencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);

  // Mock agencies for now - in production, fetch from API
  useEffect(() => {
    // TODO: Replace with actual API call
    // const { data } = trpc.agencies.getAll.useQuery();
    setAgencies([
      { id: 1, name: 'Premium Properties', isVerified: true },
      { id: 2, name: 'Luxury Estates', isVerified: true },
      { id: 3, name: 'Urban Living', isVerified: false },
      { id: 4, name: 'Coastal Realty', isVerified: true },
    ]);
  }, []);

  const selectedAgency = agencies.find(a => a.id === selectedAgencyId);

  const handleSelect = (agencyId: number | null) => {
    onAgencyChange(agencyId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
        style={{
          backgroundColor: selectedAgencyId
            ? designTokens.colors.accent.light
            : designTokens.colors.bg.tertiary,
          border: `1px solid ${
            selectedAgencyId ? designTokens.colors.accent.primary : designTokens.colors.bg.tertiary
          }`,
        }}
      >
        <div className="flex items-center gap-3">
          <Building2
            className="w-5 h-5"
            style={{
              color: selectedAgencyId
                ? designTokens.colors.accent.primary
                : designTokens.colors.text.secondary,
            }}
          />
          <span
            className="text-sm font-medium"
            style={{
              color: selectedAgencyId
                ? designTokens.colors.accent.primary
                : designTokens.colors.text.secondary,
              fontWeight: designTokens.typography.fontWeight.medium,
            }}
          >
            {selectedAgency ? selectedAgency.name : 'All Agencies'}
          </span>
        </div>
        {selectedAgencyId && (
          <button
            onClick={e => {
              e.stopPropagation();
              handleSelect(null);
            }}
            className="p-1 rounded-lg hover:bg-white/50 transition-colors"
          >
            <X className="w-4 h-4" style={{ color: designTokens.colors.accent.primary }} />
          </button>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

            {/* Dropdown Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-20"
              style={{
                backgroundColor: designTokens.colors.bg.primary,
                boxShadow: designTokens.shadows.lg,
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {/* All Agencies Option */}
              <button
                onClick={() => handleSelect(null)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Building2
                    className="w-5 h-5"
                    style={{ color: designTokens.colors.text.secondary }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: designTokens.colors.text.primary,
                      fontWeight: designTokens.typography.fontWeight.medium,
                    }}
                  >
                    All Agencies
                  </span>
                </div>
                {!selectedAgencyId && (
                  <Check
                    className="w-5 h-5"
                    style={{ color: designTokens.colors.accent.primary }}
                  />
                )}
              </button>

              {/* Divider */}
              <div className="h-px" style={{ backgroundColor: designTokens.colors.bg.tertiary }} />

              {/* Agency Options */}
              {agencies.map(agency => (
                <button
                  key={agency.id}
                  onClick={() => handleSelect(agency.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {agency.logo ? (
                      <img
                        src={agency.logo}
                        alt={agency.name}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{
                          background: designTokens.colors.accent.gradient,
                          color: 'white',
                        }}
                      >
                        {agency.name.charAt(0)}
                      </div>
                    )}
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-medium"
                          style={{
                            color: designTokens.colors.text.primary,
                            fontWeight: designTokens.typography.fontWeight.medium,
                          }}
                        >
                          {agency.name}
                        </span>
                        {agency.isVerified && (
                          <Check
                            className="w-4 h-4"
                            style={{ color: designTokens.colors.status.success }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedAgencyId === agency.id && (
                    <Check
                      className="w-5 h-5"
                      style={{ color: designTokens.colors.accent.primary }}
                    />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
