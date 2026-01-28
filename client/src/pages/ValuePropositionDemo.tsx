/**
 * ValuePropositionDemo Page
 *
 * Demo page to showcase the ValuePropositionSection component
 * with all four feature blocks.
 */

import React from 'react';
import { ValuePropositionSection } from '@/components/advertise/ValuePropositionSection';
import { softUITokens } from '@/components/advertise/design-tokens';

export default function ValuePropositionDemo() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: softUITokens.colors.neutral.white,
      }}
    >
      {/* Demo Header */}
      <div
        style={{
          padding: softUITokens.spacing['2xl'],
          background: softUITokens.colors.neutral.gray900,
          color: softUITokens.colors.neutral.white,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: softUITokens.typography.fontSize['3xl'],
            fontWeight: softUITokens.typography.fontWeight.bold,
            marginBottom: softUITokens.spacing.md,
          }}
        >
          Value Proposition Section Demo
        </h1>
        <p
          style={{
            fontSize: softUITokens.typography.fontSize.lg,
            color: softUITokens.colors.neutral.gray300,
          }}
        >
          Showcasing the four key benefits with scroll-triggered animations
        </p>
      </div>

      {/* Spacer to demonstrate scroll animation */}
      <div
        style={{
          height: '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: softUITokens.colors.neutral.white,
        }}
      >
        <p
          style={{
            fontSize: softUITokens.typography.fontSize.xl,
            color: softUITokens.colors.neutral.gray500,
          }}
        >
          ↓ Scroll down to see the animations ↓
        </p>
      </div>

      {/* Value Proposition Section */}
      <ValuePropositionSection />

      {/* Spacer */}
      <div style={{ height: '50vh' }} />
    </div>
  );
}
