/**
 * SkipLinks Component
 *
 * Provides skip navigation links for keyboard users to jump to main content sections.
 * Links are visually hidden but become visible when focused.
 *
 * Requirements: 10.5
 */

import React from 'react';
import { softUITokens } from './design-tokens';

export interface SkipLink {
  id: string;
  label: string;
  targetId: string;
}

export interface SkipLinksProps {
  links?: SkipLink[];
}

const defaultSkipLinks: SkipLink[] = [
  {
    id: 'skip-to-main',
    label: 'Skip to main content',
    targetId: 'main-content',
  },
  {
    id: 'skip-to-partner-selection',
    label: 'Skip to partner selection',
    targetId: 'partner-selection-heading',
  },
  {
    id: 'skip-to-value-proposition',
    label: 'Skip to benefits',
    targetId: 'value-proposition-heading',
  },
  {
    id: 'skip-to-faq',
    label: 'Skip to FAQ',
    targetId: 'faq-heading',
  },
];

/**
 * SkipLinks Component
 *
 * Renders a list of skip navigation links that are visually hidden
 * until focused via keyboard navigation.
 */
export const SkipLinks: React.FC<SkipLinksProps> = ({ links = defaultSkipLinks }) => {
  const handleSkipClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav
      aria-label="Skip navigation links"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 9999,
      }}
    >
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {links.map(link => (
          <li key={link.id}>
            <a
              href={`#${link.targetId}`}
              onClick={e => handleSkipClick(e, link.targetId)}
              className="skip-link"
              style={{
                position: 'absolute',
                left: '-9999px',
                top: 'auto',
                width: '1px',
                height: '1px',
                overflow: 'hidden',
                padding: `${softUITokens.spacing.md} ${softUITokens.spacing.lg}`,
                background: softUITokens.colors.primary.base,
                color: softUITokens.colors.neutral.white,
                textDecoration: 'none',
                borderRadius: softUITokens.borderRadius.soft,
                fontWeight: softUITokens.typography.fontWeight.semibold,
                fontSize: softUITokens.typography.fontSize.base,
                boxShadow: softUITokens.shadows.softLarge,
                transition: `all ${softUITokens.transitions.fast}`,
              }}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      {/* CSS for focus state */}
      <style>{`
        .skip-link:focus {
          position: fixed !important;
          left: ${softUITokens.spacing.md} !important;
          top: ${softUITokens.spacing.md} !important;
          width: auto !important;
          height: auto !important;
          overflow: visible !important;
          z-index: 10000 !important;
        }
        
        .skip-link:focus:hover {
          transform: translateY(-2px);
          box-shadow: ${softUITokens.shadows.primaryGlow};
        }
      `}</style>
    </nav>
  );
};
