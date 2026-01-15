import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Upload, TrendingUp, ArrowRight } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

const steps: Step[] = [
  {
    id: 1,
    title: 'Create Profile',
    description: 'Sign up in seconds and set up your professional partner profile.',
    icon: UserPlus,
  },
  {
    id: 2,
    title: 'Post Listing or Ad',
    description: 'Upload your properties or create targeted ad campaigns with our easy tools.',
    icon: Upload,
  },
  {
    id: 3,
    title: 'Receive Leads',
    description: 'Get verified, high-intent leads directly to your dashboard and inbox.',
    icon: TrendingUp,
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section className="py-20 md:py-28 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-64 h-64 bg-blue-50 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute top-1/4 right-0 w-64 h-64 bg-purple-50 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600">
            Get started in under 2 minutes. Our streamlined process helps you reach buyers faster.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-gray-200 via-blue-100 to-gray-200 z-0" />

          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 rounded-2xl bg-white shadow-lg mb-6 flex items-center justify-center border border-gray-100 relative group transition-transform hover:-translate-y-1 duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <step.icon className="w-10 h-10 text-blue-600 relative z-10" />
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                  {step.id}
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <a
            href="/register/partner"
            className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Start Now
            <ArrowRight className="ml-2 w-5 h-5" />
          </a>
          <p className="mt-4 text-sm text-gray-500">
            No credit card required for signup
          </p>
        </div>
      </div>
    </section>
  );
};