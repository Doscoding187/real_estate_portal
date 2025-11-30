/**
 * Registration Success Page
 * Shown after successful registration
 * Provides next steps and navigation options
 */

import { useLocation } from 'wouter';
import { CheckCircle, ArrowRight, Home, LayoutDashboard } from 'lucide-react';
import { GradientButton } from '@/components/ui/GradientButton';

interface RegistrationSuccessProps {
  role?: 'developer' | 'agency' | 'agent';
}

export default function RegistrationSuccess({ role = 'developer' }: RegistrationSuccessProps) {
  const [, setLocation] = useLocation();

  const roleConfig = {
    developer: {
      title: 'Developer Registration Complete!',
      subtitle: 'Your application has been submitted for review',
      dashboardRoute: '/developer-dashboard',
      dashboardLabel: 'Go to Developer Dashboard',
      gradient: 'from-blue-600 to-indigo-600',
      nextSteps: [
        'Our team will review your application within 2-3 business days',
        'You\'ll receive an email notification once approved',
        'Meanwhile, you can explore the platform and set up your profile',
        'Start preparing your development listings for when you\'re approved',
      ],
    },
    agency: {
      title: 'Agency Registration Complete!',
      subtitle: 'Welcome to the platform!',
      dashboardRoute: '/agency-dashboard',
      dashboardLabel: 'Go to Agency Dashboard',
      gradient: 'from-green-600 to-emerald-600',
      nextSteps: [
        'Set up your agency branding and profile',
        'Invite agents to join your agency',
        'Start listing properties',
        'Explore subscription plans for additional features',
      ],
    },
    agent: {
      title: 'Agent Registration Complete!',
      subtitle: 'Welcome to the platform!',
      dashboardRoute: '/agent/dashboard',
      dashboardLabel: 'Go to Agent Dashboard',
      gradient: 'from-purple-600 to-pink-600',
      nextSteps: [
        'Complete your agent profile',
        'Add your specializations and coverage areas',
        'Start listing properties',
        'Connect with potential clients',
      ],
    },
  };

  const config = roleConfig[role];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-3xl w-full">
        {/* Success Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border-2 border-white p-8 md:p-12">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center animate-in zoom-in duration-500`}>
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent mb-3`}>
              {config.title}
            </h1>
            <p className="text-xl text-gray-600">
              {config.subtitle}
            </p>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              What happens next?
            </h2>
            <ul className="space-y-3">
              {config.nextSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span className="text-gray-700">{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <GradientButton
              variant="primary"
              className="flex-1"
              icon={LayoutDashboard}
              onClick={() => setLocation(config.dashboardRoute)}
            >
              {config.dashboardLabel}
            </GradientButton>
            <GradientButton
              variant="outline"
              className="flex-1"
              icon={Home}
              onClick={() => setLocation('/')}
            >
              Back to Home
            </GradientButton>
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Need help? Contact our support team at{' '}
              <a href="mailto:support@example.com" className="text-blue-600 hover:text-blue-700 font-medium">
                support@example.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
