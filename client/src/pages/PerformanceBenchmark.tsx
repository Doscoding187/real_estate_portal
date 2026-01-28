import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  runAllBenchmarks,
  evaluateBenchmarks,
  generateMarkdownReport,
  saveMetrics,
  loadMetrics,
  type PerformanceMetrics,
  type BenchmarkResult,
} from '@/lib/testing/performanceBenchmarks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Download, RefreshCw } from 'lucide-react';

export default function PerformanceBenchmark() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [beforeMetrics, setBeforeMetrics] = useState<PerformanceMetrics | null>(null);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Load saved "before" metrics on mount
  useEffect(() => {
    const saved = loadMetrics('explore-performance-before');
    if (saved) {
      setBeforeMetrics(saved);
    }
  }, []);

  const runBenchmarks = async () => {
    setIsRunning(true);
    try {
      const metrics = await runAllBenchmarks({
        scrollElement: scrollRef.current || undefined,
        videoUrl:
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        queryClient,
      });

      setCurrentMetrics(metrics);
      const benchmarkResults = evaluateBenchmarks(metrics);
      setResults(benchmarkResults);

      // Save as "after" metrics
      saveMetrics('explore-performance-after', metrics);
    } catch (error) {
      console.error('Benchmark failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const saveAsBaseline = () => {
    if (currentMetrics) {
      saveMetrics('explore-performance-before', currentMetrics);
      setBeforeMetrics(currentMetrics);
    }
  };

  const downloadReport = () => {
    if (!currentMetrics || !beforeMetrics) return;

    const report = generateMarkdownReport(beforeMetrics, currentMetrics);
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetBaseline = () => {
    localStorage.removeItem('explore-performance-before');
    setBeforeMetrics(null);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Performance Benchmarks</h1>
        <p className="text-gray-600">
          Measure and track performance metrics for the Explore feature
        </p>
      </div>

      {/* Control Panel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Benchmark Controls</CardTitle>
          <CardDescription>
            Run benchmarks to measure scroll FPS, video start time, TTI, FCP, and cache hit rate
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={runBenchmarks} disabled={isRunning} className="flex items-center gap-2">
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Benchmarks
              </>
            )}
          </Button>

          {currentMetrics && (
            <>
              <Button
                onClick={saveAsBaseline}
                variant="outline"
                className="flex items-center gap-2"
              >
                Save as Baseline
              </Button>

              {beforeMetrics && (
                <Button
                  onClick={downloadReport}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Report
                </Button>
              )}

              <Button onClick={resetBaseline} variant="ghost" className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Reset Baseline
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {results.map(result => (
            <Card key={result.metric}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{result.metric}</CardTitle>
                  <Badge variant={result.passed ? 'default' : 'destructive'}>
                    {result.passed ? 'Pass' : 'Fail'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Value:</span>
                    <span className="font-semibold">
                      {result.value}
                      {result.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Target:</span>
                    <span className="font-semibold">
                      {result.target}
                      {result.unit}
                    </span>
                  </div>
                  {beforeMetrics && currentMetrics && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500">{result.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Comparison Table */}
      {beforeMetrics && currentMetrics && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Before/After Comparison</CardTitle>
            <CardDescription>Compare baseline metrics with current performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Metric</th>
                    <th className="text-right p-2">Before</th>
                    <th className="text-right p-2">After</th>
                    <th className="text-right p-2">Change</th>
                    <th className="text-right p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => {
                    const beforeValue = evaluateBenchmarks(beforeMetrics)[index].value;
                    const change = result.value - beforeValue;
                    const changePercent =
                      beforeValue > 0 ? ((change / beforeValue) * 100).toFixed(1) : 'N/A';

                    return (
                      <tr key={result.metric} className="border-b">
                        <td className="p-2">{result.metric}</td>
                        <td className="text-right p-2">
                          {beforeValue}
                          {result.unit}
                        </td>
                        <td className="text-right p-2">
                          {result.value}
                          {result.unit}
                        </td>
                        <td className="text-right p-2">
                          <span
                            className={
                              change > 0
                                ? result.unit === 'fps' || result.unit === '%'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                                : result.unit === 'fps' || result.unit === '%'
                                  ? 'text-red-600'
                                  : 'text-green-600'
                            }
                          >
                            {change > 0 ? '+' : ''}
                            {change.toFixed(0)}
                            {result.unit} ({changePercent}%)
                          </span>
                        </td>
                        <td className="text-right p-2">{result.passed ? '✅' : '❌'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Scroll Area */}
      <Card>
        <CardHeader>
          <CardTitle>Test Scroll Area</CardTitle>
          <CardDescription>This area is used for scroll FPS measurement</CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={scrollRef} className="h-96 overflow-y-auto border rounded-lg p-4">
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                className="p-4 mb-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <h3 className="font-semibold">Item {i + 1}</h3>
                <p className="text-sm text-gray-600">
                  This is a test item for scroll performance measurement
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">1. Run Initial Benchmark</h4>
            <p className="text-sm text-gray-600">
              Click "Run Benchmarks" to measure current performance. This will test scroll FPS,
              video loading, TTI, FCP, and cache hit rate.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">2. Save as Baseline</h4>
            <p className="text-sm text-gray-600">
              After running benchmarks, click "Save as Baseline" to store these metrics as your
              "before" measurements.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">3. Make Changes</h4>
            <p className="text-sm text-gray-600">
              Implement your performance optimizations or UI refinements.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">4. Run Again & Compare</h4>
            <p className="text-sm text-gray-600">
              Run benchmarks again to see the improvements. The comparison table will show
              before/after metrics.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">5. Download Report</h4>
            <p className="text-sm text-gray-600">
              Click "Download Report" to generate a markdown file with detailed results for
              documentation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
