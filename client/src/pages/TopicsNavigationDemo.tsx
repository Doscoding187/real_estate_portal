import { useState } from "react";
import { TopicsNavigation } from "@/components/explore-discovery/TopicsNavigation";

/**
 * TopicsNavigation Demo Page
 * 
 * Demonstrates the TopicsNavigation component functionality:
 * - Horizontal scrollable topic list
 * - Active topic highlighting
 * - Topic selection handling
 * - Integration with feed filtering
 */
export default function TopicsNavigationDemo() {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [feedMessage, setFeedMessage] = useState<string>("Showing all content");

  const handleTopicSelect = (topicSlug: string | null) => {
    setActiveTopic(topicSlug);
    
    if (topicSlug === null) {
      setFeedMessage("Showing all content");
    } else {
      setFeedMessage(`Showing content for topic: ${topicSlug}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Topics Navigation Demo
          </h1>
          <p className="mt-2 text-gray-600">
            Horizontal scrollable topic list with active topic highlighting
          </p>
        </div>
      </div>

      {/* Topics Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto">
          <TopicsNavigation
            activeTopic={activeTopic}
            onTopicSelect={handleTopicSelect}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Current State Display */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Current State
          </h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium text-gray-700">Active Topic:</span>
              <span className="ml-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
                {activeTopic || "All"}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Feed Message:</span>
              <span className="ml-2 text-gray-600">{feedMessage}</span>
            </div>
          </div>
        </div>

        {/* Features Showcase */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Features List */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Component Features
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">
                  Horizontal scrollable topic list
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">
                  Active topic highlighting with primary color
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">
                  Keyboard navigation support (Enter/Space)
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">
                  Scroll indicators (left/right arrows)
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">
                  Responsive design (mobile-friendly)
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">
                  Auto-scroll active topic into view
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">
                  Loading skeleton state
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">
                  Accessibility (ARIA roles and labels)
                </span>
              </li>
            </ul>
          </div>

          {/* Usage Instructions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              How to Test
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-800 mb-2">
                  Mouse/Touch Interaction:
                </h3>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Click any topic to select it</li>
                  <li>• Click "All" to show all content</li>
                  <li>• Use scroll arrows if topics overflow</li>
                  <li>• Scroll horizontally on mobile</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 mb-2">
                  Keyboard Navigation:
                </h3>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Tab to navigate between topics</li>
                  <li>• Press Enter or Space to select</li>
                  <li>• Focus ring shows current position</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-2">
                  Responsive Behavior:
                </h3>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Resize window to see responsive changes</li>
                  <li>• Scroll arrows appear/hide as needed</li>
                  <li>• Touch-friendly on mobile devices</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Mock Feed Content */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Mock Feed Content
          </h2>
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">
              {activeTopic === "find-your-home" && "🏠"}
              {activeTopic === "home-security" && "🔒"}
              {activeTopic === "renovations" && "🔨"}
              {activeTopic === "finance-investment" && "💰"}
              {activeTopic === "architecture-design" && "📐"}
              {activeTopic === "first-time-buyers" && "🎯"}
              {activeTopic === "smart-homes" && "🤖"}
              {activeTopic === "estate-living" && "🏘️"}
              {!activeTopic && "📋"}
            </div>
            <p className="text-lg">{feedMessage}</p>
            <p className="text-sm mt-2">
              In a real implementation, this would show filtered content based on the selected topic.
            </p>
          </div>
        </div>

        {/* API Information */}
        <div className="mt-8 bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            API Integration
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-blue-800">Endpoint:</span>
              <code className="ml-2 px-2 py-1 bg-blue-100 rounded text-blue-800">
                GET /api/topics
              </code>
            </div>
            <div>
              <span className="font-medium text-blue-800">Caching:</span>
              <span className="ml-2 text-blue-700">
                React Query with 5-minute stale time
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Error Handling:</span>
              <span className="ml-2 text-blue-700">
                Graceful fallback to "All" only
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Loading State:</span>
              <span className="ml-2 text-blue-700">
                Animated skeleton placeholders
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}