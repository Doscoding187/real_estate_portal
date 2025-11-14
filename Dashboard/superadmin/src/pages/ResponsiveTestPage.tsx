import React from 'react';
import PageWrapper from '../components/common/PageWrapper';

const ResponsiveTestPage: React.FC = () => {
  return (
    <PageWrapper>
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">
          Responsive Test Page
        </h1>
        <p className="text-slate-600 mb-6">
          This page tests the responsive behavior of the layout components.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Card 1
            </h2>
            <p className="text-slate-600">
              This is a responsive card component.
            </p>
          </div>
          <div className="card p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Card 2
            </h2>
            <p className="text-slate-600">
              This is a responsive card component.
            </p>
          </div>
          <div className="card p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Card 3
            </h2>
            <p className="text-slate-600">
              This is a responsive card component.
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default ResponsiveTestPage;
