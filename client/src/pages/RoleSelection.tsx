/**
 * Role Selection Page
 * Allows users to choose their role after signup
 * Routes them to the appropriate registration wizard
 */

import { useLocation } from 'wouter';
import { Building2, Users, UserCircle, ArrowRight } from 'lucide-react';
import { GradientButton } from '@/components/ui/GradientButton';

export default function RoleSelection() {
  const [, setLocation] = useLocation();

  const roles = [
    {
      id: 'developer',
      title: 'Property Developer',
      description: 'Register your development company and showcase your projects',
      icon: Building2,
      gradient: 'from-blue-500 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      route: '/developer/setup',
      features: [
        'List your developments',
        'Manage project portfolio',
        'Capture qualified leads',
        'Track sales performance',
      ],
    },
    {
      id: 'agency',
      title: 'Real Estate Agency',
      description: 'Register your agency and manage your team of agents',
      icon: Users,
      gradient: 'from-green-500 to-emerald-600',
      bgGradient: 'from-green-50 to-emerald-50',
      route: '/agency/setup',
      features: [
        'Manage your agency profile',
        'Invite and manage agents',
        'List properties',
        'Track team performance',
      ],
    },
    {
      id: 'agent',
      title: 'Real Estate Agent',
      description: 'Join as an independent agent or request to join an agency',
      icon: UserCircle,
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-50 to-pink-50',
      route: '/agent/setup',
      features: [
        'Create your agent profile',
        'List properties',
        'Manage your listings',
        'Connect with clients',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Choose Your Role
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select how you'd like to use our platform. You can always add more roles later.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.id}
                className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-white p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${role.gradient} flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="text-center mb-6">
                  <h2 className={`text-2xl font-bold bg-gradient-to-r ${role.gradient} bg-clip-text text-transparent mb-3`}>
                    {role.title}
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {role.description}
                  </p>

                  {/* Features */}
                  <div className={`bg-gradient-to-br ${role.bgGradient} rounded-xl p-4 mb-6`}>
                    <ul className="space-y-2 text-left">
                      {role.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Button */}
                <GradientButton
                  variant="primary"
                  className="w-full"
                  onClick={() => setLocation(role.route)}
                >
                  Get Started
                </GradientButton>
              </div>
            );
          })}
        </div>

        {/* Help Text */}
        <div className="text-center">
          <div className="inline-block bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-white p-6 max-w-2xl">
            <p className="text-gray-700">
              <strong>Not sure which role to choose?</strong> No problem! You can explore the platform as a regular user and upgrade to a professional account anytime.
            </p>
            <button
              onClick={() => setLocation('/')}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Continue as a regular user →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
