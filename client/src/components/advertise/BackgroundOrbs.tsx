/**
 * BackgroundOrbs Component
 *
 * Decorative floating gradient orbs for visual depth and premium aesthetic
 */

import React from 'react';
import { softUITokens } from './design-tokens';

export const BackgroundOrbs: React.FC = () => {
  return (
    <>
      {/* Top-right orb */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: softUITokens.colors.primary.gradient,
          opacity: 0.25,
          filter: 'blur(80px)',
          transform: 'translate(30%, -30%)',
          zIndex: -10,
        }}
        aria-hidden="true"
      />

      {/* Bottom-left orb */}
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: softUITokens.colors.secondary.gradient,
          opacity: 0.3,
          filter: 'blur(80px)',
          transform: 'translate(-30%, 30%)',
          zIndex: -10,
        }}
        aria-hidden="true"
      />
    </>
  );
};
