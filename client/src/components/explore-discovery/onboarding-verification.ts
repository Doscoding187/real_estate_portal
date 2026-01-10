/**
 * Onboarding Components Verification
 * 
 * Quick verification that all onboarding components are properly implemented
 * and can be imported without errors.
 */

// Component imports
import { WelcomeOverlay } from './WelcomeOverlay';
import { OnboardingTooltip, FloatingTooltip } from './OnboardingTooltip';

// Hook imports
import { useWelcomeOverlay } from '../../hooks/useWelcomeOverlay';
import { useOnboardingTooltip, useTopicNavigationTooltip, usePartnerContentTooltip } from '../../hooks/useOnboardingTooltip';

// Type definitions
interface VerificationResult {
  component: string;
  status: 'available' | 'missing';
  error?: string;
}

/**
 * Verify that all onboarding components are available
 */
export function verifyOnboardingComponents(): VerificationResult[] {
  const results: VerificationResult[] = [];

  // Check components
  try {
    if (typeof WelcomeOverlay === 'function') {
      results.push({ component: 'WelcomeOverlay', status: 'available' });
    } else {
      results.push({ component: 'WelcomeOverlay', status: 'missing', error: 'Not a function' });
    }
  } catch (error) {
    results.push({ component: 'WelcomeOverlay', status: 'missing', error: String(error) });
  }

  try {
    if (typeof OnboardingTooltip === 'function') {
      results.push({ component: 'OnboardingTooltip', status: 'available' });
    } else {
      results.push({ component: 'OnboardingTooltip', status: 'missing', error: 'Not a function' });
    }
  } catch (error) {
    results.push({ component: 'OnboardingTooltip', status: 'missing', error: String(error) });
  }

  try {
    if (typeof FloatingTooltip === 'function') {
      results.push({ component: 'FloatingTooltip', status: 'available' });
    } else {
      results.push({ component: 'FloatingTooltip', status: 'missing', error: 'Not a function' });
    }
  } catch (error) {
    results.push({ component: 'FloatingTooltip', status: 'missing', error: String(error) });
  }

  // Check hooks
  try {
    if (typeof useWelcomeOverlay === 'function') {
      results.push({ component: 'useWelcomeOverlay', status: 'available' });
    } else {
      results.push({ component: 'useWelcomeOverlay', status: 'missing', error: 'Not a function' });
    }
  } catch (error) {
    results.push({ component: 'useWelcomeOverlay', status: 'missing', error: String(error) });
  }

  try {
    if (typeof useOnboardingTooltip === 'function') {
      results.push({ component: 'useOnboardingTooltip', status: 'available' });
    } else {
      results.push({ component: 'useOnboardingTooltip', status: 'missing', error: 'Not a function' });
    }
  } catch (error) {
    results.push({ component: 'useOnboardingTooltip', status: 'missing', error: String(error) });
  }

  try {
    if (typeof useTopicNavigationTooltip === 'function') {
      results.push({ component: 'useTopicNavigationTooltip', status: 'available' });
    } else {
      results.push({ component: 'useTopicNavigationTooltip', status: 'missing', error: 'Not a function' });
    }
  } catch (error) {
    results.push({ component: 'useTopicNavigationTooltip', status: 'missing', error: String(error) });
  }

  try {
    if (typeof usePartnerContentTooltip === 'function') {
      results.push({ component: 'usePartnerContentTooltip', status: 'available' });
    } else {
      results.push({ component: 'usePartnerContentTooltip', status: 'missing', error: 'Not a function' });
    }
  } catch (error) {
    results.push({ component: 'usePartnerContentTooltip', status: 'missing', error: String(error) });
  }

  return results;
}

/**
 * Print verification results to console
 */
export function printVerificationResults(): void {
  const results = verifyOnboardingComponents();
  
  console.log('🔍 Onboarding Components Verification');
  console.log('=====================================');
  
  results.forEach(result => {
    const status = result.status === 'available' ? '✅' : '❌';
    console.log(`${status} ${result.component}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const availableCount = results.filter(r => r.status === 'available').length;
  const totalCount = results.length;
  
  console.log('=====================================');
  console.log(`📊 Summary: ${availableCount}/${totalCount} components available`);
  
  if (availableCount === totalCount) {
    console.log('🎉 All onboarding components are properly implemented!');
  } else {
    console.log('⚠️  Some components are missing or have errors.');
  }
}

// Export verification function for use in other files
export default verifyOnboardingComponents;