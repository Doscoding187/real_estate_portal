import React from 'react';
import PageWrapper from '../components/common/PageWrapper';
import {
  platformStats,
  revenueTrend,
  subscriptionTiers,
  recentActivities,
  quickActions,
} from '../data/mockData';

const MockDataDemoPage: React.FC = () => {
  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mock Data Demo</h1>
        <p className="text-slate-600">Showcase of all mock data structures</p>
      </div>

      {/* Platform Statistics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Platform Statistics
        </h2>
        <div className="card p-6">
          <pre className="text-sm text-slate-700 overflow-x-auto">
            {JSON.stringify(platformStats, null, 2)}
          </pre>
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Revenue Trend (7 months)
        </h2>
        <div className="card p-6">
          <pre className="text-sm text-slate-700 overflow-x-auto">
            {JSON.stringify(revenueTrend, null, 2)}
          </pre>
        </div>
      </div>

      {/* Subscription Distribution */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Subscription Distribution
        </h2>
        <div className="card p-6">
          <pre className="text-sm text-slate-700 overflow-x-auto">
            {JSON.stringify(subscriptionTiers, null, 2)}
          </pre>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Recent Activities
        </h2>
        <div className="card p-6">
          <pre className="text-sm text-slate-700 overflow-x-auto">
            {JSON.stringify(recentActivities, null, 2)}
          </pre>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Quick Actions
        </h2>
        <div className="card p-6">
          <pre className="text-sm text-slate-700 overflow-x-auto">
            {JSON.stringify(quickActions, null, 2)}
          </pre>
        </div>
      </div>
    </PageWrapper>
  );
};

export default MockDataDemoPage;
