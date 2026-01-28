/**
 * Onboarding Demo Page
 *
 * Demonstrates the welcome overlay and tooltips functionality.
 * Implements Requirements 16.7, 16.8, 16.10, 16.11
 */

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { WelcomeOverlay } from '@/components/explore-discovery/WelcomeOverlay';
import {
  OnboardingTooltip,
  FloatingTooltip,
} from '@/components/explore-discovery/OnboardingTooltip';
import { TopicsNavigation } from '@/components/explore-discovery/TopicsNavigation';
import { ContentBadge } from '@/components/explore-discovery/ContentBadge';
import { useWelcomeOverlay } from '@/hooks/useWelcomeOverlay';
import { useTopicNavigationTooltip, usePartnerContentTooltip } from '@/hooks/useOnboardingTooltip';

// Mock topics data
const MOCK_TOPICS = [
  {
    id: '1',
    slug: 'find-your-home',
    name: 'Find Your Home',
    description: 'Discover your perfect property',
    icon: '🏠',
  },
  {
    id: '2',
    slug: 'home-security',
    name: 'Home Security',
    description: 'Keep your home safe',
    icon: '🔒',
  },
  {
    id: '3',
    slug: 'renovations',
    name: 'Renovations & Upgrades',
    description: 'Transform your space',
    icon: '🔨',
  },
];

// Mock content data
const MOCK_CONTENT = [
  {
    id: '1',
    title: 'Beautiful 3BR Home in Sandton',
    type: 'property' as const,
    partnerId: 'partner-1',
    partnerName: 'Elite Properties',
    isVerified: true,
  },
  {
    id: '2',
    title: 'Home Security Best Practices',
    type: 'expert_tip' as const,
    partnerId: 'partner-2',
    partnerName: 'SecureHome Solutions',
    isVerified: true,
  },
  {
    id: '3',
    title: 'Kitchen Renovation Ideas',
    type: 'service' as const,
    partnerId: 'partner-3',
    partnerName: 'Dream Renovations',
    isVerified: false,
  },
];

export default function OnboardingDemo() {
  const [demoStep, setDemoStep] = useState<'welcome' | 'topics' | 'partner' | 'complete'>(
    'welcome',
  );
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [scrollCount, setScrollCount] = useState(0);

  // Refs for tooltip positioning
  const topicsRef = useRef<HTMLDivElement>(null);
  const partnerContentRef = useRef<HTMLDivElement>(null);

  // Manual state for demo purposes
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTopicTooltip, setShowTopicTooltip] = useState(false);
  const [showPartnerTooltip, setShowPartnerTooltip] = useState(false);

  const handleWelcomeStart = () => {
    setShowWelcome(true);
    setDemoStep('welcome');
  };

  const handleTopicSelect = (topicSlug: string) => {
    setSelectedTopic(topicSlug);
    setShowWelcome(false);
    setDemoStep('topics');

    // Show topic tooltip after a delay
    setTimeout(() => {
      setShowTopicTooltip(true);
    }, 1000);
  };

  const handleWelcomeDismiss = () => {
    setShowWelcome(false);
    setDemoStep('topics');

    // Show topic tooltip after a delay
    setTimeout(() => {
      setShowTopicTooltip(true);
    }, 1000);
  };

  const handleTopicTooltipDismiss = () => {
    setShowTopicTooltip(false);
    setDemoStep('partner');

    // Show partner tooltip after a delay
    setTimeout(() => {
      setShowPartnerTooltip(true);
    }, 1000);
  };

  const handlePartnerTooltipDismiss = () => {
    setShowPartnerTooltip(false);
    setDemoStep('complete');
  };

  const handleScrollSimulation = () => {
    const newCount = scrollCount + 1;
    setScrollCount(newCount);

    if (newCount >= 5 && !showTopicTooltip && demoStep === 'topics') {
      setShowTopicTooltip(true);
    }
  };

  const resetDemo = () => {
    setDemoStep('welcome');
    setSelectedTopic(null);
    setScrollCount(0);
    setShowWelcome(false);
    setShowTopicTooltip(false);
    setShowPartnerTooltip(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Onboarding Demo</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Experience the welcome overlay and progressive disclosure tooltips
          </p>

          {/* Demo Controls */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button onClick={handleWelcomeStart} variant="default">
              Start Welcome Flow
            </Button>
            <Button onClick={handleScrollSimulation} variant="outline">
              Simulate Scroll ({scrollCount}/5)
            </Button>
            <Button onClick={() => setShowPartnerTooltip(true)} variant="outline">
              Show Partner Tooltip
            </Button>
            <Button onClick={resetDemo} variant="secondary">
              Reset Demo
            </Button>
          </div>

          {/* Demo Status */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm">
            <div
              className={`w-3 h-3 rounded-full ${
                demoStep === 'welcome' ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
            <span className="text-sm">Welcome</span>

            <div
              className={`w-3 h-3 rounded-full ${
                demoStep === 'topics' ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
            <span className="text-sm">Topics</span>

            <div
              className={`w-3 h-3 rounded-full ${
                demoStep === 'partner' ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
            <span className="text-sm">Partner</span>

            <div
              className={`w-3 h-3 rounded-full ${
                demoStep === 'complete' ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span className="text-sm">Complete</span>
          </div>
        </div>

        {/* Mock Explore Interface */}
        <div className="max-w-4xl mx-auto">
          {/* Topics Navigation */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Topics Navigation</h2>
            <div ref={topicsRef}>
              <TopicsNavigation
                topics={MOCK_TOPICS}
                selectedTopicSlug={selectedTopic}
                onTopicSelect={setSelectedTopic}
              />
            </div>
          </Card>

          {/* Content Feed */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Content Feed</h2>
            <div className="space-y-4">
              {MOCK_CONTENT.map((content, index) => (
                <motion.div
                  key={content.id}
                  ref={content.type !== 'property' ? partnerContentRef : undefined}
                  className="relative p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Content Badge */}
                  <div className="absolute top-2 left-2">
                    <ContentBadge type={content.type} />
                  </div>

                  <div className="ml-16">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{content.title}</h3>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>{content.partnerName}</span>
                      {content.isVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>

        {/* Demo Information */}
        <div className="max-w-4xl mx-auto mt-8">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Demo Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Welcome Overlay Features:</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Shows on first session</li>
                  <li>• Explains Explore purpose</li>
                  <li>• Suggests 3 topics based on user profile</li>
                  <li>• Pre-filters feed on topic selection</li>
                  <li>• Dismissible with skip option</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Progressive Tooltips:</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Topic tooltip after 5 items scrolled</li>
                  <li>• Partner tooltip on first encounter</li>
                  <li>• One-time display per user</li>
                  <li>• Contextual positioning</li>
                  <li>• Smooth animations</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Welcome Overlay */}
      <WelcomeOverlay
        isOpen={showWelcome}
        suggestedTopics={MOCK_TOPICS}
        onTopicSelect={handleTopicSelect}
        onDismiss={handleWelcomeDismiss}
      />

      {/* Topic Navigation Tooltip */}
      <OnboardingTooltip
        tooltipId="topic_navigation"
        isVisible={showTopicTooltip}
        onDismiss={handleTopicTooltipDismiss}
        position="bottom"
        targetRef={topicsRef}
      />

      {/* Partner Content Tooltip */}
      <OnboardingTooltip
        tooltipId="partner_content"
        isVisible={showPartnerTooltip}
        onDismiss={handlePartnerTooltipDismiss}
        position="top"
        targetRef={partnerContentRef}
      />

      {/* Floating Tooltip Demo */}
      {demoStep === 'complete' && (
        <FloatingTooltip tooltipId="topic_navigation" isVisible={true} onDismiss={() => {}} />
      )}
    </div>
  );
}
