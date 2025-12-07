/**
 * Color Contrast Audit Utility
 * WCAG AA Compliance Checker
 * 
 * WCAG AA Requirements:
 * - Normal text (< 18pt or < 14pt bold): 4.5:1 contrast ratio
 * - Large text (≥ 18pt or ≥ 14pt bold): 3:1 contrast ratio
 * - UI components and graphics: 3:1 contrast ratio
 */

interface ColorPair {
  foreground: string;
  background: string;
  usage: string;
  textSize: 'normal' | 'large';
  required: number;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format. Use hex colors like #ffffff');
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color pair meets WCAG AA standards
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  textSize: 'normal' | 'large' = 'normal'
): { passes: boolean; ratio: number; required: number } {
  const ratio = getContrastRatio(foreground, background);
  const required = textSize === 'normal' ? 4.5 : 3.0;
  const passes = ratio >= required;

  return { passes, ratio, required };
}

/**
 * All color combinations used in the Explore feature
 */
export const colorCombinations: ColorPair[] = [
  // Primary text on backgrounds
  {
    foreground: '#1f2937', // text.primary
    background: '#ffffff', // bg.primary
    usage: 'Primary text on white background (cards, main content)',
    textSize: 'normal',
    required: 4.5,
  },
  {
    foreground: '#1f2937', // text.primary
    background: '#f8f9fa', // bg.secondary
    usage: 'Primary text on light gray background',
    textSize: 'normal',
    required: 4.5,
  },
  {
    foreground: '#1f2937', // text.primary
    background: '#f1f3f5', // bg.tertiary
    usage: 'Primary text on tertiary background',
    textSize: 'normal',
    required: 4.5,
  },

  // Secondary text on backgrounds
  {
    foreground: '#6b7280', // text.secondary
    background: '#ffffff', // bg.primary
    usage: 'Secondary text on white (descriptions, metadata)',
    textSize: 'normal',
    required: 4.5,
  },
  {
    foreground: '#6b7280', // text.secondary
    background: '#f8f9fa', // bg.secondary
    usage: 'Secondary text on light gray',
    textSize: 'normal',
    required: 4.5,
  },

  // Tertiary text on backgrounds
  {
    foreground: '#6b7280', // text.tertiary (updated for WCAG AA)
    background: '#ffffff', // bg.primary
    usage: 'Tertiary text on white (placeholders, labels)',
    textSize: 'normal',
    required: 4.5,
  },

  // Accent colors on backgrounds
  {
    foreground: '#4f46e5', // accent.primary (updated for WCAG AA)
    background: '#ffffff', // bg.primary
    usage: 'Accent text/links on white',
    textSize: 'normal',
    required: 4.5,
  },
  {
    foreground: '#4338ca', // accent.hover (updated for WCAG AA)
    background: '#ffffff', // bg.primary
    usage: 'Accent hover state on white',
    textSize: 'normal',
    required: 4.5,
  },

  // White text on accent backgrounds (buttons)
  {
    foreground: '#ffffff', // text.inverse
    background: '#4f46e5', // accent.primary (updated for WCAG AA)
    usage: 'White text on accent button',
    textSize: 'normal',
    required: 4.5,
  },
  {
    foreground: '#ffffff', // text.inverse
    background: '#4338ca', // accent.hover (updated for WCAG AA)
    usage: 'White text on accent button hover',
    textSize: 'normal',
    required: 4.5,
  },

  // Status colors on white
  {
    foreground: '#047857', // status.success (updated for WCAG AA 4.5:1)
    background: '#ffffff', // bg.primary
    usage: 'Success text/icons on white',
    textSize: 'normal',
    required: 4.5,
  },
  {
    foreground: '#b45309', // status.warning (updated for WCAG AA 4.5:1)
    background: '#ffffff', // bg.primary
    usage: 'Warning text/icons on white',
    textSize: 'normal',
    required: 4.5,
  },
  {
    foreground: '#dc2626', // status.error (updated for WCAG AA)
    background: '#ffffff', // bg.primary
    usage: 'Error text/icons on white',
    textSize: 'normal',
    required: 4.5,
  },
  {
    foreground: '#2563eb', // status.info (updated for WCAG AA)
    background: '#ffffff', // bg.primary
    usage: 'Info text/icons on white',
    textSize: 'normal',
    required: 4.5,
  },

  // Dark backgrounds (glass overlays)
  {
    foreground: '#ffffff', // text.inverse
    background: '#1f2937', // bg.dark
    usage: 'White text on dark background (video overlays)',
    textSize: 'normal',
    required: 4.5,
  },

  // Large text combinations (headings, titles)
  {
    foreground: '#1f2937', // text.primary
    background: '#ffffff', // bg.primary
    usage: 'Large headings on white',
    textSize: 'large',
    required: 3.0,
  },
  {
    foreground: '#6b7280', // text.secondary
    background: '#ffffff', // bg.primary
    usage: 'Large secondary text on white',
    textSize: 'large',
    required: 3.0,
  },

  // Subtle accent background
  {
    foreground: '#4338ca', // accent.hover (darker for better contrast)
    background: '#e0e7ff', // accent.subtle
    usage: 'Accent text on subtle accent background (chips, badges)',
    textSize: 'normal',
    required: 4.5,
  },
];

/**
 * Run a full audit of all color combinations
 */
export function auditColorContrast(): {
  passed: ColorPair[];
  failed: ColorPair[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
} {
  const passed: ColorPair[] = [];
  const failed: ColorPair[] = [];

  colorCombinations.forEach((pair) => {
    const result = meetsWCAGAA(pair.foreground, pair.background, pair.textSize);
    if (result.passes) {
      passed.push(pair);
    } else {
      failed.push(pair);
    }
  });

  return {
    passed,
    failed,
    summary: {
      total: colorCombinations.length,
      passed: passed.length,
      failed: failed.length,
      passRate: (passed.length / colorCombinations.length) * 100,
    },
  };
}

/**
 * Generate a detailed audit report
 */
export function generateAuditReport(): string {
  const audit = auditColorContrast();
  let report = '# Color Contrast Audit Report\n\n';
  report += `**WCAG AA Compliance Check**\n\n`;
  report += `## Summary\n\n`;
  report += `- Total combinations: ${audit.summary.total}\n`;
  report += `- Passed: ${audit.summary.passed} ✓\n`;
  report += `- Failed: ${audit.summary.failed} ✗\n`;
  report += `- Pass rate: ${audit.summary.passRate.toFixed(1)}%\n\n`;

  if (audit.failed.length > 0) {
    report += `## ⚠️ Failed Combinations\n\n`;
    audit.failed.forEach((pair) => {
      const result = meetsWCAGAA(pair.foreground, pair.background, pair.textSize);
      report += `### ${pair.usage}\n`;
      report += `- Foreground: ${pair.foreground}\n`;
      report += `- Background: ${pair.background}\n`;
      report += `- Contrast ratio: ${result.ratio.toFixed(2)}:1\n`;
      report += `- Required: ${result.required}:1\n`;
      report += `- **Status: FAIL** ✗\n\n`;
    });
  }

  report += `## ✓ Passed Combinations\n\n`;
  audit.passed.forEach((pair) => {
    const result = meetsWCAGAA(pair.foreground, pair.background, pair.textSize);
    report += `### ${pair.usage}\n`;
    report += `- Foreground: ${pair.foreground}\n`;
    report += `- Background: ${pair.background}\n`;
    report += `- Contrast ratio: ${result.ratio.toFixed(2)}:1\n`;
    report += `- Required: ${result.required}:1\n`;
    report += `- **Status: PASS** ✓\n\n`;
  });

  return report;
}
