/**
 * Performance Benchmarking Suite for Explore Frontend
 *
 * This module provides utilities to measure and document performance metrics
 * for the Explore feature refinement project.
 *
 * Metrics measured:
 * - Scroll FPS on mid-range devices
 * - Video start time
 * - Time to Interactive (TTI)
 * - First Contentful Paint (FCP)
 * - React Query cache hit rate
 */

export interface PerformanceMetrics {
  scrollFPS: number;
  videoStartTime: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  cacheHitRate: number;
  timestamp: string;
}

export interface BenchmarkResult {
  metric: string;
  value: number;
  unit: string;
  target: number;
  passed: boolean;
  notes?: string;
}

/**
 * Measure scroll FPS using requestAnimationFrame
 */
export async function measureScrollFPS(
  element: HTMLElement,
  duration: number = 2000,
): Promise<number> {
  return new Promise(resolve => {
    const frames: number[] = [];
    let lastTime = performance.now();
    let rafId: number;
    const startTime = performance.now();

    const measureFrame = () => {
      const currentTime = performance.now();
      const delta = currentTime - lastTime;

      if (delta > 0) {
        frames.push(1000 / delta); // Convert to FPS
      }

      lastTime = currentTime;

      if (currentTime - startTime < duration) {
        rafId = requestAnimationFrame(measureFrame);
      } else {
        // Calculate average FPS
        const avgFPS = frames.reduce((a, b) => a + b, 0) / frames.length;
        resolve(Math.round(avgFPS));
      }
    };

    // Start scrolling simulation
    let scrollPosition = 0;
    const scrollInterval = setInterval(() => {
      scrollPosition += 10;
      element.scrollTop = scrollPosition;
    }, 16); // ~60fps scroll

    rafId = requestAnimationFrame(measureFrame);

    // Cleanup
    setTimeout(() => {
      clearInterval(scrollInterval);
      cancelAnimationFrame(rafId);
    }, duration);
  });
}

/**
 * Measure video start time from load to play
 */
export async function measureVideoStartTime(videoUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.preload = 'auto';
    video.muted = true;

    const startTime = performance.now();
    let resolved = false;

    const handleCanPlay = () => {
      if (!resolved) {
        resolved = true;
        const duration = performance.now() - startTime;
        cleanup();
        resolve(duration);
      }
    };

    const handleError = () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error('Video failed to load'));
      }
    };

    const cleanup = () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.remove();
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error('Video load timeout'));
      }
    }, 10000);

    document.body.appendChild(video);
    video.load();
  });
}

/**
 * Measure Time to Interactive using Performance Observer
 */
export function measureTimeToInteractive(): Promise<number> {
  return new Promise(resolve => {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      resolve(0);
      return;
    }

    // Use navigation timing as fallback
    const navigationTiming = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;

    if (navigationTiming) {
      // TTI approximation: domInteractive - fetchStart
      const tti = navigationTiming.domInteractive - navigationTiming.fetchStart;
      resolve(tti);
    } else {
      resolve(0);
    }
  });
}

/**
 * Measure First Contentful Paint
 */
export function measureFirstContentfulPaint(): Promise<number> {
  return new Promise(resolve => {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      resolve(0);
      return;
    }

    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          observer.disconnect();
          resolve(entry.startTime);
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['paint'] });

      // Fallback: check if FCP already happened
      setTimeout(() => {
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');
        if (fcpEntry) {
          observer.disconnect();
          resolve(fcpEntry.startTime);
        } else {
          observer.disconnect();
          resolve(0);
        }
      }, 100);
    } catch (e) {
      console.error('Error observing paint timing:', e);
      resolve(0);
    }
  });
}

/**
 * Measure React Query cache hit rate
 */
export function measureCacheHitRate(queryClient: any, duration: number = 5000): Promise<number> {
  return new Promise(resolve => {
    let cacheHits = 0;
    let cacheMisses = 0;

    // Monitor query cache
    const cache = queryClient.getQueryCache();

    const unsubscribe = cache.subscribe((event: any) => {
      if (event?.type === 'updated') {
        if (event.query.state.dataUpdateCount > 0) {
          cacheHits++;
        }
      } else if (event?.type === 'added') {
        cacheMisses++;
      }
    });

    setTimeout(() => {
      unsubscribe();
      const total = cacheHits + cacheMisses;
      const hitRate = total > 0 ? (cacheHits / total) * 100 : 0;
      resolve(Math.round(hitRate));
    }, duration);
  });
}

/**
 * Run all performance benchmarks
 */
export async function runAllBenchmarks(
  options: {
    scrollElement?: HTMLElement;
    videoUrl?: string;
    queryClient?: any;
  } = {},
): Promise<PerformanceMetrics> {
  console.log('🚀 Starting performance benchmarks...');

  const metrics: Partial<PerformanceMetrics> = {
    timestamp: new Date().toISOString(),
  };

  // Measure scroll FPS
  if (options.scrollElement) {
    try {
      console.log('📊 Measuring scroll FPS...');
      metrics.scrollFPS = await measureScrollFPS(options.scrollElement);
      console.log(`✅ Scroll FPS: ${metrics.scrollFPS}`);
    } catch (error) {
      console.error('❌ Failed to measure scroll FPS:', error);
      metrics.scrollFPS = 0;
    }
  } else {
    metrics.scrollFPS = 0;
  }

  // Measure video start time
  if (options.videoUrl) {
    try {
      console.log('🎥 Measuring video start time...');
      metrics.videoStartTime = await measureVideoStartTime(options.videoUrl);
      console.log(`✅ Video start time: ${metrics.videoStartTime}ms`);
    } catch (error) {
      console.error('❌ Failed to measure video start time:', error);
      metrics.videoStartTime = 0;
    }
  } else {
    metrics.videoStartTime = 0;
  }

  // Measure TTI
  try {
    console.log('⏱️ Measuring Time to Interactive...');
    metrics.timeToInteractive = await measureTimeToInteractive();
    console.log(`✅ TTI: ${metrics.timeToInteractive}ms`);
  } catch (error) {
    console.error('❌ Failed to measure TTI:', error);
    metrics.timeToInteractive = 0;
  }

  // Measure FCP
  try {
    console.log('🎨 Measuring First Contentful Paint...');
    metrics.firstContentfulPaint = await measureFirstContentfulPaint();
    console.log(`✅ FCP: ${metrics.firstContentfulPaint}ms`);
  } catch (error) {
    console.error('❌ Failed to measure FCP:', error);
    metrics.firstContentfulPaint = 0;
  }

  // Measure cache hit rate
  if (options.queryClient) {
    try {
      console.log('💾 Measuring React Query cache hit rate...');
      metrics.cacheHitRate = await measureCacheHitRate(options.queryClient);
      console.log(`✅ Cache hit rate: ${metrics.cacheHitRate}%`);
    } catch (error) {
      console.error('❌ Failed to measure cache hit rate:', error);
      metrics.cacheHitRate = 0;
    }
  } else {
    metrics.cacheHitRate = 0;
  }

  console.log('✨ Benchmarks complete!');
  return metrics as PerformanceMetrics;
}

/**
 * Compare metrics against targets
 */
export function evaluateBenchmarks(metrics: PerformanceMetrics): BenchmarkResult[] {
  const results: BenchmarkResult[] = [
    {
      metric: 'Scroll FPS',
      value: metrics.scrollFPS,
      unit: 'fps',
      target: 55,
      passed: metrics.scrollFPS >= 55,
      notes:
        metrics.scrollFPS >= 55
          ? 'Excellent performance'
          : 'Below target - consider virtualization or optimization',
    },
    {
      metric: 'Video Start Time',
      value: metrics.videoStartTime,
      unit: 'ms',
      target: 1000,
      passed: metrics.videoStartTime <= 1000,
      notes:
        metrics.videoStartTime <= 1000
          ? 'Fast video loading'
          : 'Slow video start - check network or preloading',
    },
    {
      metric: 'Time to Interactive',
      value: metrics.timeToInteractive,
      unit: 'ms',
      target: 3000,
      passed: metrics.timeToInteractive <= 3000,
      notes:
        metrics.timeToInteractive <= 3000
          ? 'Good interactivity'
          : 'Slow TTI - optimize JavaScript execution',
    },
    {
      metric: 'First Contentful Paint',
      value: metrics.firstContentfulPaint,
      unit: 'ms',
      target: 1500,
      passed: metrics.firstContentfulPaint <= 1500,
      notes:
        metrics.firstContentfulPaint <= 1500
          ? 'Fast initial render'
          : 'Slow FCP - optimize critical rendering path',
    },
    {
      metric: 'Cache Hit Rate',
      value: metrics.cacheHitRate,
      unit: '%',
      target: 70,
      passed: metrics.cacheHitRate >= 70,
      notes:
        metrics.cacheHitRate >= 70
          ? 'Effective caching'
          : 'Low cache hits - review cache configuration',
    },
  ];

  return results;
}

/**
 * Generate markdown report
 */
export function generateMarkdownReport(
  beforeMetrics: PerformanceMetrics,
  afterMetrics: PerformanceMetrics,
): string {
  const beforeResults = evaluateBenchmarks(beforeMetrics);
  const afterResults = evaluateBenchmarks(afterMetrics);

  let report = '# Performance Benchmark Report\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += '## Summary\n\n';
  report += '| Metric | Before | After | Target | Change | Status |\n';
  report += '|--------|--------|-------|--------|--------|--------|\n';

  beforeResults.forEach((before, index) => {
    const after = afterResults[index];
    const change = after.value - before.value;
    const changePercent = before.value > 0 ? ((change / before.value) * 100).toFixed(1) : 'N/A';

    const changeStr =
      before.unit === 'ms' || before.unit === 'fps'
        ? `${change > 0 ? '+' : ''}${change.toFixed(0)}${before.unit}`
        : `${change > 0 ? '+' : ''}${change.toFixed(0)}${before.unit}`;

    const status = after.passed ? '✅ Pass' : '❌ Fail';

    report += `| ${before.metric} | ${before.value}${before.unit} | ${after.value}${after.unit} | ${after.target}${after.unit} | ${changeStr} (${changePercent}%) | ${status} |\n`;
  });

  report += '\n## Detailed Results\n\n';

  afterResults.forEach(result => {
    report += `### ${result.metric}\n\n`;
    report += `- **Value:** ${result.value}${result.unit}\n`;
    report += `- **Target:** ${result.target}${result.unit}\n`;
    report += `- **Status:** ${result.passed ? '✅ Pass' : '❌ Fail'}\n`;
    report += `- **Notes:** ${result.notes}\n\n`;
  });

  report += '## Recommendations\n\n';

  const failedResults = afterResults.filter(r => !r.passed);
  if (failedResults.length === 0) {
    report += '✨ All performance targets met! No recommendations at this time.\n';
  } else {
    failedResults.forEach(result => {
      report += `- **${result.metric}:** ${result.notes}\n`;
    });
  }

  return report;
}

/**
 * Save metrics to localStorage for comparison
 */
export function saveMetrics(key: string, metrics: PerformanceMetrics): void {
  try {
    localStorage.setItem(key, JSON.stringify(metrics));
  } catch (error) {
    console.error('Failed to save metrics:', error);
  }
}

/**
 * Load metrics from localStorage
 */
export function loadMetrics(key: string): PerformanceMetrics | null {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load metrics:', error);
    return null;
  }
}
