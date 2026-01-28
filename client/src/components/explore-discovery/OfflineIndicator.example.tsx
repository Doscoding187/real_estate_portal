import React from 'react';
import { OfflineIndicator } from './OfflineIndicator';
import { ModernCard } from '@/components/ui/soft/ModernCard';

/**
 * OfflineIndicator Examples
 *
 * Demonstrates the OfflineIndicator component in various scenarios.
 * Use browser DevTools to simulate offline/online states.
 */
export function OfflineIndicatorExamples() {
  const [isSimulatedOffline, setIsSimulatedOffline] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">OfflineIndicator Component</h1>
          <p className="text-gray-600">Provides visual feedback about network connection status</p>
        </div>

        {/* Live Demo */}
        <ModernCard>
          <h2 className="text-xl font-semibold mb-4">Live Demo</h2>
          <p className="text-gray-600 mb-4">
            The indicator is active at the top of this page. Use browser DevTools to simulate
            offline mode:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
            <li>Open DevTools (F12)</li>
            <li>Go to Network tab</li>
            <li>Set throttling to "Offline"</li>
            <li>Watch the banner appear</li>
            <li>Set back to "Online" to see reconnection message</li>
          </ol>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The reconnection message auto-dismisses after 3 seconds.
            </p>
          </div>
        </ModernCard>

        {/* Integration Example */}
        <ModernCard>
          <h2 className="text-xl font-semibold mb-4">Integration Example</h2>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code>{`import { OfflineIndicator } from '@/components/explore-discovery/OfflineIndicator';

function ExploreHome() {
  return (
    <div className="min-h-screen">
      <OfflineIndicator />
      <Navbar />
      <MainContent />
    </div>
  );
}`}</code>
          </pre>
        </ModernCard>

        {/* With React Query */}
        <ModernCard>
          <h2 className="text-xl font-semibold mb-4">With React Query</h2>
          <p className="text-gray-600 mb-4">
            The OfflineIndicator works seamlessly with React Query's offline capabilities:
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code>{`import { useQuery } from '@tanstack/react-query';
import { OfflineIndicator } from '@/components/explore-discovery/OfflineIndicator';

function ExploreFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ['explore', 'feed'],
    queryFn: fetchExploreFeed,
    // React Query automatically serves cached data when offline
  });

  return (
    <div>
      <OfflineIndicator />
      {data ? <FeedContent data={data} /> : <Skeleton />}
    </div>
  );
}`}</code>
          </pre>
        </ModernCard>

        {/* Accessibility Features */}
        <ModernCard>
          <h2 className="text-xl font-semibold mb-4">Accessibility Features</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>
                <strong>ARIA alerts:</strong> Uses role="alert" for screen reader announcements
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>
                <strong>Live regions:</strong> Offline uses aria-live="assertive", reconnection uses
                "polite"
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>
                <strong>Visual icons:</strong> WifiOff and Wifi icons provide visual context
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>
                <strong>Color contrast:</strong> High contrast text on colored backgrounds
              </span>
            </li>
          </ul>
        </ModernCard>

        {/* Animation Details */}
        <ModernCard>
          <h2 className="text-xl font-semibold mb-4">Animation Details</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Entry Animation</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Slides down from top (y: -100 → 0)</li>
                <li>Fades in (opacity: 0 → 1)</li>
                <li>Duration: 300ms</li>
                <li>Easing: easeOut</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Exit Animation</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Slides up (y: 0 → -100)</li>
                <li>Fades out (opacity: 1 → 0)</li>
                <li>Duration: 300ms</li>
                <li>Easing: easeOut</li>
              </ul>
            </div>
          </div>
        </ModernCard>

        {/* States */}
        <ModernCard>
          <h2 className="text-xl font-semibold mb-4">Component States</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-amber-500 pl-4">
              <h3 className="font-medium text-gray-900 mb-1">Offline State</h3>
              <p className="text-gray-600 text-sm mb-2">Shown when navigator.onLine is false</p>
              <div className="bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <span>📡</span>
                <span className="text-sm">You're offline. Showing cached content.</span>
              </div>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-medium text-gray-900 mb-1">Reconnection State</h3>
              <p className="text-gray-600 text-sm mb-2">
                Shown when connection is restored (auto-dismisses after 3s)
              </p>
              <div className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <span>✓</span>
                <span className="text-sm">Back online! Content updated.</span>
              </div>
            </div>
          </div>
        </ModernCard>

        {/* Testing Instructions */}
        <ModernCard>
          <h2 className="text-xl font-semibold mb-4">Testing Instructions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Manual Testing</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Open browser DevTools (F12)</li>
                <li>Navigate to Network tab</li>
                <li>Change throttling dropdown to "Offline"</li>
                <li>Verify amber banner appears at top</li>
                <li>Change throttling back to "Online"</li>
                <li>Verify green banner appears</li>
                <li>Wait 3 seconds and verify banner dismisses</li>
              </ol>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Automated Testing</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{`test('shows offline banner when offline', () => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: false,
  });
  
  render(<OfflineIndicator />);
  expect(screen.getByText(/offline/i)).toBeInTheDocument();
});`}</code>
              </pre>
            </div>
          </div>
        </ModernCard>
      </div>
    </div>
  );
}

/**
 * Standalone demo page for OfflineIndicator
 */
export default function OfflineIndicatorDemo() {
  return (
    <>
      <OfflineIndicator />
      <OfflineIndicatorExamples />
    </>
  );
}
