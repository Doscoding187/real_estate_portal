/**
 * Script to generate a detailed color contrast audit report
 * Run with: npx tsx client/src/lib/accessibility/generateContrastReport.ts
 */

import { generateAuditReport, auditColorContrast, getContrastRatio } from './colorContrastAudit';

console.log('🎨 Running Color Contrast Audit...\n');

const audit = auditColorContrast();

console.log('📊 Summary:');
console.log(`   Total combinations: ${audit.summary.total}`);
console.log(`   ✓ Passed: ${audit.summary.passed}`);
console.log(`   ✗ Failed: ${audit.summary.failed}`);
console.log(`   Pass rate: ${audit.summary.passRate.toFixed(1)}%\n`);

if (audit.failed.length > 0) {
  console.log('⚠️  Failed Combinations:\n');
  audit.failed.forEach((pair, index) => {
    const ratio = getContrastRatio(pair.foreground, pair.background);
    console.log(`${index + 1}. ${pair.usage}`);
    console.log(`   Foreground: ${pair.foreground}`);
    console.log(`   Background: ${pair.background}`);
    console.log(`   Contrast: ${ratio.toFixed(2)}:1 (required: ${pair.required}:1)`);
    console.log(`   Gap: ${(pair.required - ratio).toFixed(2)}:1\n`);
  });
}

// Generate markdown report
const report = generateAuditReport();
console.log('\n📝 Full report generated. Writing to file...\n');

// Write to file
import { writeFileSync } from 'fs';
import { join } from 'path';

const reportPath = join(
  process.cwd(),
  'client',
  'src',
  'lib',
  'accessibility',
  'COLOR_CONTRAST_AUDIT_REPORT.md',
);
writeFileSync(reportPath, report);

console.log(`✅ Report saved to: ${reportPath}`);
