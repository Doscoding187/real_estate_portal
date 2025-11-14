import React from 'react';
import ColorTest from '../components/common/ColorTest';

const TestPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">
        Routing Test Page
      </h1>
      <p className="text-slate-600 mb-6">
        This page tests that routing is working correctly.
      </p>
      <ColorTest />
    </div>
  );
};

export default TestPage;
