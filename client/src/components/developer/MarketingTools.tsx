import React from 'react';

/**
 * Campaign and boost products are not part of the S3 developer commercial
 * catalog. Keep the workspace honest until a placement product has a real
 * lifecycle, billing authority and measurement contract.
 */
const MarketingTools: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="typ-h2">Marketing Tools</h2>
        <button className="btn btn-secondary" onClick={() => (window.location.href = '/contact')}>
          Contact sales
        </button>
      </div>

      <div className="card border border-amber-200 bg-amber-50">
        <h3 className="typ-h3 mb-2">Assisted marketing products</h3>
        <p className="text-sm text-amber-900">
          Boost and campaign packages are not currently available as self-service products. Property
          Listify will confirm any future placement, price, schedule and reporting terms through an
          approved commercial workflow.
        </p>
      </div>

      <div className="card">
        <h3 className="typ-h3 mb-2">Campaign reporting</h3>
        <p className="text-sm text-gray-600">
          No active paid campaign reporting is available for this account. Generic workspace
          activity is not presented as advertising performance.
        </p>
      </div>
    </div>
  );
};

export default MarketingTools;
