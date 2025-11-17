import React from 'react';

const AnalyticsPanel: React.FC = () => {
  // Sample data for the charts
  const leadsOverTimeData = [
    { month: 'Jan', leads: 45 },
    { month: 'Feb', leads: 52 },
    { month: 'Mar', leads: 48 },
    { month: 'Apr', leads: 61 },
    { month: 'May', leads: 55 },
    { month: 'Jun', leads: 67 },
  ];

  const leadsPerDevelopmentData = [
    { development: 'Riverside Apartments', leads: 124 },
    { development: 'Downtown Lofts', leads: 98 },
    { development: 'Garden Villas', leads: 87 },
    { development: 'Skyline Towers', leads: 112 },
    { development: 'Harbor Views', leads: 76 },
  ];

  const conversionFunnelData = [
    { stage: 'Views', count: 1240, percentage: 100 },
    { stage: 'Inquiries', count: 310, percentage: 25 },
    { stage: 'Showings', count: 155, percentage: 12.5 },
    { stage: 'Offers', count: 62, percentage: 5 },
    { stage: 'Sales', count: 43, percentage: 3.5 },
  ];

  const trafficSourcesData = [
    { source: 'Direct', visitors: 1240, percentage: 40 },
    { source: 'Search', visitors: 870, percentage: 28 },
    { source: 'Social', visitors: 620, percentage: 20 },
    { source: 'Referral', visitors: 310, percentage: 10 },
    { source: 'Email', visitors: 62, percentage: 2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="typ-h2">Analytics Overview</h2>
        <div className="flex gap-3">
          <select className="input w-auto">
            <option>Last 30 Days</option>
            <option>Last 7 Days</option>
            <option>Last 90 Days</option>
            <option>Year to Date</option>
          </select>
          <button className="btn btn-primary">Export Report</button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card flex flex-col">
          <div className="text-gray-500 mb-2">Total Leads</div>
          <div className="typ-numeric-xl text-blue-600">1,240</div>
          <div className="text-green-500 text-sm mt-1">↑ 12% from last period</div>
        </div>
        <div className="card flex flex-col">
          <div className="text-gray-500 mb-2">Conversion Rate</div>
          <div className="typ-numeric-xl text-blue-600">3.5%</div>
          <div className="text-green-500 text-sm mt-1">↑ 0.8% from last period</div>
        </div>
        <div className="card flex flex-col">
          <div className="text-gray-500 mb-2">Avg. Deal Size</div>
          <div className="typ-numeric-xl text-blue-600">R2.4M</div>
          <div className="text-red-500 text-sm mt-1">↓ 2% from last period</div>
        </div>
        <div className="card flex flex-col">
          <div className="text-gray-500 mb-2">Properties Sold</div>
          <div className="typ-numeric-xl text-blue-600">43</div>
          <div className="text-green-500 text-sm mt-1">↑ 8% from last period</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads Over Time */}
        <div className="card">
          <h3 className="typ-h3 mb-4">Leads Over Time</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-16">
            <div className="text-center">
              <div className="text-gray-400 mb-2">Chart Visualization</div>
              <div className="text-sm text-gray-500">
                {leadsOverTimeData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-1">
                    <span className="w-16">{item.month}</span>
                    <div 
                      className="bg-blue-500 h-6 rounded-full mr-2"
                      style={{ width: `${item.leads * 2}px` }}
                    ></div>
                    <span className="w-8">{item.leads}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Leads per Development */}
        <div className="card">
          <h3 className="typ-h3 mb-4">Leads per Development</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-16">
            <div className="text-center">
              <div className="text-gray-400 mb-2">Bar Chart Visualization</div>
              <div className="text-sm text-gray-500">
                {leadsPerDevelopmentData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-1">
                    <span className="w-32 text-left truncate">{item.development}</span>
                    <div 
                      className="bg-green-500 h-6 rounded-full mr-2"
                      style={{ width: `${item.leads / 2}px` }}
                    ></div>
                    <span className="w-8">{item.leads}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="card">
          <h3 className="typ-h3 mb-4">Conversion Funnel</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-16">
            <div className="text-center w-full">
              <div className="text-gray-400 mb-2">Funnel Visualization</div>
              <div className="px-4">
                {conversionFunnelData.map((item, index) => (
                  <div key={index} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{item.stage}</span>
                      <span>{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="card">
          <h3 className="typ-h3 mb-4">Traffic Sources</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-16">
            <div className="text-center">
              <div className="text-gray-400 mb-2">Pie Chart Visualization</div>
              <div className="text-sm text-gray-500">
                {trafficSourcesData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-1">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index] }}
                      ></div>
                      <span className="w-16">{item.source}</span>
                    </div>
                    <span>{item.visitors}</span>
                    <span className="w-12">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;