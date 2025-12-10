/**
 * Accessibility Audit Utility
 * 
 * Automated checks for common accessibility issues.
 * Complements manual screen reader testing.
 * 
 * Requirements: 10.5
 */

export interface AccessibilityIssue {
  severity: 'error' | 'warning' | 'info';
  element: HTMLElement;
  message: string;
  wcagCriterion?: string;
  suggestion?: string;
}

export interface AccessibilityAuditResult {
  passed: boolean;
  score: number;
  issues: AccessibilityIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * Run accessibility audit on a container element
 */
export function runAccessibilityAudit(
  container: HTMLElement = document.body
): AccessibilityAuditResult {
  const issues: AccessibilityIssue[] = [];

  // Check for missing alt text on images
  issues.push(...checkImageAltText(container));

  // Check for proper heading hierarchy
  issues.push(...checkHeadingHierarchy(container));

  // Check for missing form labels
  issues.push(...checkFormLabels(container));

  // Check for insufficient color contrast
  issues.push(...checkColorContrast(container));

  // Check for missing ARIA labels on interactive elements
  issues.push(...checkAriaLabels(container));

  // Check for keyboard accessibility
  issues.push(...checkKeyboardAccessibility(container));

  // Check for proper link text
  issues.push(...checkLinkText(container));

  // Check for missing language attribute
  issues.push(...checkLanguageAttribute());

  // Calculate score and summary
  const summary = {
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    info: issues.filter((i) => i.severity === 'info').length,
  };

  const totalChecks = 8; // Number of check functions
  const passedChecks = totalChecks - summary.errors;
  const score = Math.round((passedChecks / totalChecks) * 100);
  const passed = summary.errors === 0;

  return {
    passed,
    score,
    issues,
    summary,
  };
}

/**
 * Check for images without alt text
 */
function checkImageAltText(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const images = container.querySelectorAll('img');

  images.forEach((img) => {
    const alt = img.getAttribute('alt');
    const ariaHidden = img.getAttribute('aria-hidden');

    if (alt === null && ariaHidden !== 'true') {
      issues.push({
        severity: 'error',
        element: img as HTMLElement,
        message: 'Image missing alt attribute',
        wcagCriterion: '1.1.1 Non-text Content',
        suggestion: 'Add descriptive alt text or mark as decorative with alt=""',
      });
    } else if (alt === '' && ariaHidden !== 'true') {
      // Empty alt is okay for decorative images, but warn if not marked as hidden
      issues.push({
        severity: 'info',
        element: img as HTMLElement,
        message: 'Image has empty alt text',
        wcagCriterion: '1.1.1 Non-text Content',
        suggestion: 'If decorative, consider adding aria-hidden="true"',
      });
    }
  });

  return issues;
}

/**
 * Check for proper heading hierarchy
 */
function checkHeadingHierarchy(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));

  let previousLevel = 0;

  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.substring(1));

    if (previousLevel > 0 && level > previousLevel + 1) {
      issues.push({
        severity: 'error',
        element: heading as HTMLElement,
        message: `Heading level skipped from H${previousLevel} to H${level}`,
        wcagCriterion: '1.3.1 Info and Relationships',
        suggestion: `Use H${previousLevel + 1} instead of H${level}`,
      });
    }

    previousLevel = level;
  });

  return issues;
}

/**
 * Check for form inputs without labels
 */
function checkFormLabels(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const inputs = container.querySelectorAll('input, textarea, select');

  inputs.forEach((input) => {
    const id = input.getAttribute('id');
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledby = input.getAttribute('aria-labelledby');
    const type = input.getAttribute('type');

    // Skip hidden and submit/button inputs
    if (type === 'hidden' || type === 'submit' || type === 'button') {
      return;
    }

    // Check if input has a label
    const hasLabel = id && container.querySelector(`label[for="${id}"]`);

    if (!hasLabel && !ariaLabel && !ariaLabelledby) {
      issues.push({
        severity: 'error',
        element: input as HTMLElement,
        message: 'Form input missing label',
        wcagCriterion: '3.3.2 Labels or Instructions',
        suggestion: 'Add a <label> element or aria-label attribute',
      });
    }
  });

  return issues;
}

/**
 * Check for insufficient color contrast (basic check)
 */
function checkColorContrast(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  
  // Note: This is a simplified check. For comprehensive contrast checking,
  // use tools like axe-core or Lighthouse
  
  const textElements = container.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6');
  
  textElements.forEach((element) => {
    const styles = window.getComputedStyle(element);
    const fontSize = parseFloat(styles.fontSize);
    const fontWeight = styles.fontWeight;
    
    // Check if text is large (18pt+ or 14pt+ bold)
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && parseInt(fontWeight) >= 700);
    
    // This is a placeholder - actual contrast calculation requires color parsing
    // In production, use a library like color-contrast-checker
    
    issues.push({
      severity: 'info',
      element: element as HTMLElement,
      message: 'Color contrast should be verified manually',
      wcagCriterion: '1.4.3 Contrast (Minimum)',
      suggestion: isLargeText 
        ? 'Ensure 3:1 contrast ratio for large text'
        : 'Ensure 4.5:1 contrast ratio for normal text',
    });
  });

  return issues;
}

/**
 * Check for missing ARIA labels on interactive elements
 */
function checkAriaLabels(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const interactiveElements = container.querySelectorAll('button, a, [role="button"], [role="link"]');

  interactiveElements.forEach((element) => {
    const textContent = element.textContent?.trim();
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledby = element.getAttribute('aria-labelledby');
    const title = element.getAttribute('title');

    if (!textContent && !ariaLabel && !ariaLabelledby && !title) {
      issues.push({
        severity: 'error',
        element: element as HTMLElement,
        message: 'Interactive element has no accessible name',
        wcagCriterion: '4.1.2 Name, Role, Value',
        suggestion: 'Add text content, aria-label, or aria-labelledby',
      });
    }
  });

  return issues;
}

/**
 * Check for keyboard accessibility
 */
function checkKeyboardAccessibility(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const interactiveElements = container.querySelectorAll('a, button, input, textarea, select, [tabindex]');

  interactiveElements.forEach((element) => {
    const tabindex = element.getAttribute('tabindex');

    // Warn about positive tabindex values
    if (tabindex && parseInt(tabindex) > 0) {
      issues.push({
        severity: 'warning',
        element: element as HTMLElement,
        message: 'Positive tabindex value detected',
        wcagCriterion: '2.4.3 Focus Order',
        suggestion: 'Use tabindex="0" or rely on natural tab order',
      });
    }

    // Check for disabled interactive elements
    const isDisabled = element.hasAttribute('disabled');
    if (isDisabled) {
      issues.push({
        severity: 'info',
        element: element as HTMLElement,
        message: 'Disabled element is not keyboard accessible',
        wcagCriterion: '2.1.1 Keyboard',
        suggestion: 'Consider using aria-disabled instead if element should remain focusable',
      });
    }
  });

  return issues;
}

/**
 * Check for proper link text
 */
function checkLinkText(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const links = container.querySelectorAll('a');

  const genericLinkText = ['click here', 'read more', 'learn more', 'here', 'more'];

  links.forEach((link) => {
    const text = link.textContent?.trim().toLowerCase() || '';
    const ariaLabel = link.getAttribute('aria-label');

    if (genericLinkText.includes(text) && !ariaLabel) {
      issues.push({
        severity: 'warning',
        element: link as HTMLElement,
        message: 'Link has generic text without context',
        wcagCriterion: '2.4.4 Link Purpose (In Context)',
        suggestion: 'Add aria-label with full context or make link text more descriptive',
      });
    }

    if (!text && !ariaLabel) {
      issues.push({
        severity: 'error',
        element: link as HTMLElement,
        message: 'Link has no text content',
        wcagCriterion: '2.4.4 Link Purpose (In Context)',
        suggestion: 'Add text content or aria-label',
      });
    }
  });

  return issues;
}

/**
 * Check for missing language attribute
 */
function checkLanguageAttribute(): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const html = document.documentElement;
  const lang = html.getAttribute('lang');

  if (!lang) {
    issues.push({
      severity: 'error',
      element: html,
      message: 'HTML element missing lang attribute',
      wcagCriterion: '3.1.1 Language of Page',
      suggestion: 'Add lang="en" to <html> element',
    });
  }

  return issues;
}

/**
 * Generate a human-readable report
 */
export function generateAccessibilityReport(result: AccessibilityAuditResult): string {
  let report = '# Accessibility Audit Report\n\n';
  report += `**Score**: ${result.score}/100\n`;
  report += `**Status**: ${result.passed ? '✅ Passed' : '❌ Failed'}\n\n`;
  
  report += `## Summary\n`;
  report += `- Errors: ${result.summary.errors}\n`;
  report += `- Warnings: ${result.summary.warnings}\n`;
  report += `- Info: ${result.summary.info}\n\n`;

  if (result.issues.length === 0) {
    report += '✅ No accessibility issues found!\n';
    return report;
  }

  // Group issues by severity
  const errors = result.issues.filter((i) => i.severity === 'error');
  const warnings = result.issues.filter((i) => i.severity === 'warning');
  const info = result.issues.filter((i) => i.severity === 'info');

  if (errors.length > 0) {
    report += `## Errors (${errors.length})\n\n`;
    errors.forEach((issue, index) => {
      report += `### ${index + 1}. ${issue.message}\n`;
      report += `- **WCAG**: ${issue.wcagCriterion}\n`;
      report += `- **Element**: ${issue.element.tagName}\n`;
      if (issue.suggestion) {
        report += `- **Suggestion**: ${issue.suggestion}\n`;
      }
      report += '\n';
    });
  }

  if (warnings.length > 0) {
    report += `## Warnings (${warnings.length})\n\n`;
    warnings.forEach((issue, index) => {
      report += `### ${index + 1}. ${issue.message}\n`;
      report += `- **WCAG**: ${issue.wcagCriterion}\n`;
      if (issue.suggestion) {
        report += `- **Suggestion**: ${issue.suggestion}\n`;
      }
      report += '\n';
    });
  }

  if (info.length > 0) {
    report += `## Info (${info.length})\n\n`;
    info.forEach((issue, index) => {
      report += `### ${index + 1}. ${issue.message}\n`;
      if (issue.suggestion) {
        report += `- **Suggestion**: ${issue.suggestion}\n`;
      }
      report += '\n';
    });
  }

  return report;
}
