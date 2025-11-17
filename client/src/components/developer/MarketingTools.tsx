import React from 'react';

const MarketingTools: React.FC = () => {
  const boostPackages = [
    {
      id: 1,
      name: 'Starter Boost',
      price: 'R499',
      duration: '7 days',
      features: [
        'Featured placement for 7 days',
        'Priority in search results',
        'Social media promotion',
        'Email campaign to 5,000 subscribers',
      ],
      popular: false,
    },
    {
      id: 2,
      name: 'Professional Boost',
      price: 'R1,299',
      duration: '14 days',
      features: [
        'Featured placement for 14 days',
        'Top priority in search results',
        'Social media promotion',
        'Email campaign to 15,000 subscribers',
        'Dedicated account manager',
        'Performance analytics report',
      ],
      popular: true,
    },
    {
      id: 3,
      name: 'Premium Boost',
      price: 'R2,499',
      duration: '30 days',
      features: [
        'Featured placement for 30 days',
        'Premium positioning in all searches',
        'Extensive social media promotion',
        'Email campaign to 30,000 subscribers',
        'Dedicated account manager',
        'Weekly performance reports',
        'Custom marketing consultation',
      ],
      popular: false,
    },
  ];

  const performanceMetrics = [
    { label: 'Total Views', value: '12,482', change: '+12%' },
    { label: 'Lead Generation', value: '342', change: '+8%' },
    { label: 'Engagement Rate', value: '4.8%', change: '+1.2%' },
    { label: 'Conversion Rate', value: '3.2%', change: '+0.5%' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="typ-h2">Marketing Tools</h2>
        <button className="btn btn-primary">Create Custom Campaign</button>
      </div>

      {/* Performance Overview */}
      <div className="card">
        <h3 className="typ-h3 mb-4">Performance Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {performanceMetrics.map((metric, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-16 text-center">
              <div className="text-2xl font-bold text-blue-600">{metric.value}</div>
              <div className="text-gray-500 mt-1">{metric.label}</div>
              <div className="text-green-500 text-sm mt-1">{metric.change} from last period</div>
            </div>
          ))}
        </div>
      </div>

      {/* Boost Packages */}
      <div>
        <h3 className="typ-h3 mb-4">Featured Boost Packages</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {boostPackages.map(pkg => (
            <div
              key={pkg.id}
              className={`card relative ${
                pkg.popular ? 'border-2 border-blue-500' : 'border border-gray-200'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                  MOST POPULAR
                </div>
              )}
              <div className="text-center mb-6">
                <h4 className="text-xl font-bold">{pkg.name}</h4>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{pkg.price}</span>
                  <span className="text-gray-500"> / {pkg.duration}</span>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {pkg.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button className={`btn w-full ${pkg.popular ? 'btn-primary' : 'btn-secondary'}`}>
                Select Package
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="card">
        <h3 className="typ-h3 mb-4">Recent Campaigns</h3>
        <div className="overflow-x-auto">
          <table className="w-full table-soft">
            <thead>
              <tr>
                <th className="text-left">Campaign</th>
                <th className="text-left">Development</th>
                <th className="text-left">Status</th>
                <th className="text-left">Start Date</th>
                <th className="text-left">Budget</th>
                <th className="text-left">Results</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  name: 'Riverside Apartments Launch',
                  development: 'Riverside Apartments',
                  status: 'Active',
                  startDate: 'Oct 15, 2025',
                  budget: 'R8,500',
                  results: '248 views, 32 leads',
                },
                {
                  name: 'Skyline Towers Promotion',
                  development: 'Skyline Towers',
                  status: 'Completed',
                  startDate: 'Sep 22, 2025',
                  budget: 'R12,000',
                  results: '512 views, 78 leads',
                },
                {
                  name: 'Garden Villas Social',
                  development: 'Garden Villas',
                  status: 'Scheduled',
                  startDate: 'Nov 20, 2025',
                  budget: 'R4,200',
                  results: '0 views, 0 leads',
                },
              ].map((campaign, index) => (
                <tr key={index}>
                  <td className="font-medium">{campaign.name}</td>
                  <td>{campaign.development}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        campaign.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : campaign.status === 'Completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td>{campaign.startDate}</td>
                  <td>{campaign.budget}</td>
                  <td>{campaign.results}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MarketingTools;
