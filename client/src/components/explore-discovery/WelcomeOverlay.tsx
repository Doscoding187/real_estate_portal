/**
 * Welcome Overlay Component
 * 
 * Displays on first session to introduce Explore and suggest topics.
 * Implements Requirements 16.7, 16.8, 16.9
 * 
 * Features:
 * - Welcome message explaining Explore
 * - 3 suggested topics based on user profile
 * - Topic selection that pre-filters feed
 * - Dismissible overlay
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Topic {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
}

interface WelcomeOverlayProps {
  isOpen: boolean;
  suggestedTopics: Topic[];
  onTopicSelect: (topicSlug: string) => void;
  onDismiss: () => void;
}

export function WelcomeOverlay({
  isOpen,
  suggestedTopics,
  onTopicSelect,
  onDismiss,
}: WelcomeOverlayProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const handleTopicClick = (topicSlug: string) => {
    setSelectedTopic(topicSlug);
  };

  const handleContinue = () => {
    if (selectedTopic) {
      onTopicSelect(selectedTopic);
    }
    onDismiss();
  };

  const handleSkip = () => {
    onDismiss();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />

          {/* Overlay Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <Card className="relative w-full max-w-2xl bg-white dark:bg-gray-900 p-8 shadow-2xl">
              {/* Close Button */}
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close welcome overlay"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>

              {/* Welcome Content */}
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="inline-block text-6xl mb-4"
                  >
                    🏠
                  </motion.div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Welcome to Explore
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    Discover properties, ideas, and insights—all in one place
                  </p>
                </div>

                {/* Topic Selection */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      What are you interested in?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose a topic to personalize your feed
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {suggestedTopics.map((topic, index) => (
                      <motion.button
                        key={topic.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        onClick={() => handleTopicClick(topic.slug)}
                        className={`
                          relative p-6 rounded-xl border-2 transition-all
                          ${
                            selectedTopic === topic.slug
                              ? 'border-primary bg-primary/5 shadow-lg scale-105'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:shadow-md'
                          }
                        `}
                      >
                        <div className="text-4xl mb-3">{topic.icon}</div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {topic.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {topic.description}
                        </p>

                        {/* Selection Indicator */}
                        {selectedTopic === topic.slug && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                          >
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="px-6"
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={handleContinue}
                    disabled={!selectedTopic}
                    className="px-6"
                  >
                    {selectedTopic ? 'Continue' : 'Select a topic'}
                  </Button>
                </div>

                {/* Helper Text */}
                <p className="text-xs text-center text-gray-500 dark:text-gray-500">
                  You can change topics anytime from the navigation bar
                </p>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
