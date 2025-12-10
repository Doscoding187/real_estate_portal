/**
 * Resource Hints Configuration
 * 
 * Task 12.3: Optimize CSS delivery
 * Requirements: 10.1
 * 
 * Provides utilities for adding resource hints to improve page load performance.
 * - preconnect: Establish early connections to important origins
 * - dns-prefetch: Resolve DNS early for third-party domains
 * - preload: Load critical resources early
 */

export interface ResourceHint {
  rel: 'preconnect' | 'dns-prefetch' | 'preload';
  href: string;
  as?: 'font' | 'style' | 'script' | 'image';
  type?: string;
  crossorigin?: '' | 'anonymous' | 'use-credentials';
}

/**
 * Critical resource hints for the advertise landing page
 */
export const advertisePageResourceHints: ResourceHint[] = [
  // Preconnect to Google Fonts
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossorigin: 'anonymous',
  },
  // DNS prefetch for image CDNs
  {
    rel: 'dns-prefetch',
    href: 'https://images.unsplash.com',
  },
  // Preload critical fonts
  {
    rel: 'preload',
    href: '/fonts/inter-var.woff2',
    as: 'font',
    type: 'font/woff2',
    crossorigin: 'anonymous',
  },
];

/**
 * Inject resource hints into the document head
 */
export function injectResourceHints(hints: ResourceHint[]): void {
  if (typeof document === 'undefined') return;

  hints.forEach((hint) => {
    const link = document.createElement('link');
    link.rel = hint.rel;
    link.href = hint.href;
    
    if (hint.as) link.setAttribute('as', hint.as);
    if (hint.type) link.setAttribute('type', hint.type);
    if (hint.crossorigin) link.setAttribute('crossorigin', hint.crossorigin);

    document.head.appendChild(link);
  });
}

/**
 * Preload critical CSS
 */
export function preloadCriticalCSS(href: string): void {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'style';
  link.href = href;
  
  // Convert to stylesheet after load
  link.onload = function() {
    this.onload = null;
    this.rel = 'stylesheet';
  };

  document.head.appendChild(link);
}

/**
 * Defer non-critical CSS
 */
export function deferNonCriticalCSS(href: string): void {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'print'; // Load with low priority
  
  // Switch to all media after load
  link.onload = function() {
    this.media = 'all';
  };

  document.head.appendChild(link);
}

/**
 * Extract critical CSS for above-the-fold content
 * This would typically be done at build time
 */
export const criticalCSS = `
  /* Critical CSS for above-the-fold content */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Hero section critical styles */
  .hero-section {
    min-height: max(90vh, 640px);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* CTA button critical styles */
  .cta-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 1rem 2rem;
    border-radius: 9999px;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  /* Prevent layout shift */
  img {
    max-width: 100%;
    height: auto;
  }
`;

/**
 * Inline critical CSS into the document
 */
export function inlineCriticalCSS(css: string): void {
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * Initialize performance optimizations for the advertise page
 */
export function initAdvertisePagePerformance(): void {
  // Inject resource hints
  injectResourceHints(advertisePageResourceHints);

  // Inline critical CSS
  inlineCriticalCSS(criticalCSS);

  // Defer non-critical CSS (if any)
  // deferNonCriticalCSS('/styles/non-critical.css');
}
