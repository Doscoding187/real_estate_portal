import { describe, it, expect } from 'vitest';
import {
  getContrastRatio,
  meetsWCAGAA,
  auditColorContrast,
  colorCombinations,
} from '../colorContrastAudit';

describe('Color Contrast Audit', () => {
  describe('getContrastRatio', () => {
    it('should calculate correct contrast ratio for black on white', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 0); // Maximum contrast
    });

    it('should calculate correct contrast ratio for white on black', () => {
      const ratio = getContrastRatio('#ffffff', '#000000');
      expect(ratio).toBeCloseTo(21, 0); // Maximum contrast
    });

    it('should calculate correct contrast ratio for same colors', () => {
      const ratio = getContrastRatio('#ffffff', '#ffffff');
      expect(ratio).toBeCloseTo(1, 0); // Minimum contrast
    });

    it('should handle colors in any order', () => {
      const ratio1 = getContrastRatio('#1f2937', '#ffffff');
      const ratio2 = getContrastRatio('#ffffff', '#1f2937');
      expect(ratio1).toBeCloseTo(ratio2, 2);
    });
  });

  describe('meetsWCAGAA', () => {
    it('should pass for high contrast normal text', () => {
      const result = meetsWCAGAA('#1f2937', '#ffffff', 'normal');
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should pass for high contrast large text', () => {
      const result = meetsWCAGAA('#6b7280', '#ffffff', 'large');
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(3.0);
    });

    it('should fail for low contrast normal text', () => {
      const result = meetsWCAGAA('#e0e7ff', '#ffffff', 'normal');
      expect(result.passes).toBe(false);
      expect(result.ratio).toBeLessThan(4.5);
    });

    it('should return correct required ratio for normal text', () => {
      const result = meetsWCAGAA('#000000', '#ffffff', 'normal');
      expect(result.required).toBe(4.5);
    });

    it('should return correct required ratio for large text', () => {
      const result = meetsWCAGAA('#000000', '#ffffff', 'large');
      expect(result.required).toBe(3.0);
    });
  });

  describe('auditColorContrast', () => {
    it('should audit all color combinations', () => {
      const audit = auditColorContrast();
      expect(audit.summary.total).toBe(colorCombinations.length);
      expect(audit.summary.passed + audit.summary.failed).toBe(audit.summary.total);
    });

    it('should have high pass rate for WCAG AA compliance', () => {
      const audit = auditColorContrast();
      // We expect at least 90% of combinations to pass
      expect(audit.summary.passRate).toBeGreaterThanOrEqual(90);
    });

    it('should categorize passed and failed combinations correctly', () => {
      const audit = auditColorContrast();

      // Check that all passed combinations actually pass
      audit.passed.forEach(pair => {
        const result = meetsWCAGAA(pair.foreground, pair.background, pair.textSize);
        expect(result.passes).toBe(true);
      });

      // Check that all failed combinations actually fail
      audit.failed.forEach(pair => {
        const result = meetsWCAGAA(pair.foreground, pair.background, pair.textSize);
        expect(result.passes).toBe(false);
      });
    });
  });

  describe('Specific color combinations', () => {
    it('should pass for primary text on white', () => {
      const result = meetsWCAGAA('#1f2937', '#ffffff', 'normal');
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should pass for secondary text on white', () => {
      const result = meetsWCAGAA('#6b7280', '#ffffff', 'normal');
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should pass for white text on accent button', () => {
      const result = meetsWCAGAA('#ffffff', '#4f46e5', 'normal'); // Updated color
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should pass for white text on dark background', () => {
      const result = meetsWCAGAA('#ffffff', '#1f2937', 'normal');
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should pass for error text on white', () => {
      const result = meetsWCAGAA('#dc2626', '#ffffff', 'normal'); // Updated color
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should pass for success text on white', () => {
      const result = meetsWCAGAA('#047857', '#ffffff', 'normal'); // Updated color for 4.5:1
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
