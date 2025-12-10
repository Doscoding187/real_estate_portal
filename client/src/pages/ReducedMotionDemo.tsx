/**
 * Reduced Motion Demo Page
 * 
 * Demonstrates how animations adapt to reduced motion preferences
 * 
 * Requirements: 11.4 - Respect user preferences for reduced motion
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion, useAnimationDuration } from '@/hooks/useReducedMotion.advertise';
import { 
  fadeUp, 
  softLift, 
  staggerContainer, 
  staggerItem,
  scaleIn,
  slideInLeft,
  slideInRight,
  buttonPress
} from '@/lib/animations/advertiseAnimations';
import { applyReducedMotion } from '@/lib/animations/motionUtils';
import { softUITokens } from '@/components/advertise/design-tokens';

export default function ReducedMotionDemo() {
  const prefersReducedMotion = useReducedMotion();
  const animationDuration = useAnimationDuration(0.4);
  const [showInfo, setShowInfo] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: animationDuration }}
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Reduced Motion Demo
          </h1>
          <p className="text-xl text-gray-600">
            See how animations adapt to your motion preferences
          </p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-8"
          variants={fadeUp}
          initial="initial"
          animate="animate"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Current Status
              </h2>
              <p className="text-gray-600">
                Your system preference: {' '}
                <span className={`font-bold ${prefersReducedMotion ? 'text-green-600' : 'text-blue-600'}`}>
                  {prefersReducedMotion ? 'Reduced Motion Enabled' : 'Animations Enabled'}
                </span>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Animation duration: {animationDuration}s
              </p>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              prefersReducedMotion ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {prefersReducedMotion ? (
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
            </div>
          </div>
        </motion.div>

        {/* Info Card */}
        {showInfo && (
          <motion.div
            className="bg-blue-50 border border-blue-200 rounded-2xl p-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  How to Test Reduced Motion
                </h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p><strong>Chrome/Edge:</strong> DevTools → Cmd/Ctrl+Shift+P → "Emulate CSS prefers-reduced-motion"</p>
                  <p><strong>Firefox:</strong> about:config → ui.prefersReducedMotion → Set to 1</p>
                  <p><strong>macOS:</strong> System Preferences → Accessibility → Display → Reduce motion</p>
                  <p><strong>Windows:</strong> Settings → Ease of Access → Display → Show animations</p>
                </div>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="ml-4 text-blue-600 hover:text-blue-800"
                aria-label="Close info"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}

        {/* Animation Examples */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-gray-900">Animation Examples</h2>

          {/* Fade Up */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-8"
            variants={fadeUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: false, margin: "-100px" }}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">Fade Up Animation</h3>
            <p className="text-gray-600">
              {prefersReducedMotion 
                ? 'With reduced motion: Only opacity changes (instant)'
                : 'Normal: Fades in while moving up from below'
              }
            </p>
          </motion.div>

          {/* Soft Lift */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-8 cursor-pointer"
            variants={softLift}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">Soft Lift (Hover Me)</h3>
            <p className="text-gray-600">
              {prefersReducedMotion 
                ? 'With reduced motion: No lift effect on hover'
                : 'Normal: Lifts up with shadow expansion on hover'
              }
            </p>
          </motion.div>

          {/* Stagger Container */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: false, margin: "-100px" }}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Stagger Animation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((item) => (
                <motion.div
                  key={item}
                  className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-6"
                  variants={staggerItem}
                >
                  <p className="text-gray-700 font-medium">Item {item}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {prefersReducedMotion 
                      ? 'Appears instantly'
                      : 'Staggers with 100ms delay'
                    }
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Scale In */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-8"
            variants={scaleIn}
            initial="initial"
            whileInView="animate"
            viewport={{ once: false, margin: "-100px" }}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">Scale In Animation</h3>
            <p className="text-gray-600">
              {prefersReducedMotion 
                ? 'With reduced motion: Only opacity changes'
                : 'Normal: Scales up from smaller size'
              }
            </p>
          </motion.div>

          {/* Slide In Left */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-8"
            variants={slideInLeft}
            initial="initial"
            whileInView="animate"
            viewport={{ once: false, margin: "-100px" }}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">Slide In Left</h3>
            <p className="text-gray-600">
              {prefersReducedMotion 
                ? 'With reduced motion: Only opacity changes'
                : 'Normal: Slides in from the left'
              }
            </p>
          </motion.div>

          {/* Slide In Right */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-8"
            variants={slideInRight}
            initial="initial"
            whileInView="animate"
            viewport={{ once: false, margin: "-100px" }}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">Slide In Right</h3>
            <p className="text-gray-600">
              {prefersReducedMotion 
                ? 'With reduced motion: Only opacity changes'
                : 'Normal: Slides in from the right'
              }
            </p>
          </motion.div>

          {/* Button Press */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Button Press Animation</h3>
            <motion.button
              className="px-8 py-4 rounded-full font-semibold text-white"
              style={{
                background: softUITokens.colors.primary.gradient,
              }}
              variants={buttonPress}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
            >
              {prefersReducedMotion ? 'Click Me (No Animation)' : 'Click Me (With Animation)'}
            </motion.button>
          </div>
        </div>

        {/* Summary */}
        <motion.div
          className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-lg p-8 text-white"
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: false, margin: "-100px" }}
        >
          <h2 className="text-2xl font-bold mb-4">Summary</h2>
          <div className="space-y-2 text-white/90">
            <p>✓ All animations respect prefers-reduced-motion media query</p>
            <p>✓ Transform animations are disabled with reduced motion</p>
            <p>✓ Opacity transitions are preserved (instant)</p>
            <p>✓ Essential UI feedback is maintained</p>
            <p>✓ Accessibility is prioritized</p>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm">
          <p>Scroll up and down to see animations trigger again</p>
          <p className="mt-2">Toggle reduced motion in your system settings to see the difference</p>
        </div>
      </div>
    </div>
  );
}
