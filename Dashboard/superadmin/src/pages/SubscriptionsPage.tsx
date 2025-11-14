import React from 'react';
import { CreditCard, Check, Edit, Users } from 'lucide-react';

const SubscriptionsPage: React.FC = () => {
  // Mock data
  const subscriptionPlans = [
    {
      id: 1,
      name: 'Basic',
      price: 'R 499',
      period: '/month',
      listings: 5,
      features: [
        'Up to 5 property listings',
        'Basic analytics',
        'Email support',
        'Standard visibility',
      ],
      users: 78,
      revenue: 'R 39,000',
    },
    {
      id: 2,
      name: 'Premium',
      price: 'R 1,299',
      period: '/month',
      listings: 20,
      features: [
        'Up to 20 property listings',
        'Advanced analytics',
        'Priority support',
        'Featured placement',
        'Property comparison tool',
      ],
      users: 35,
      revenue: 'R 45,465',
    },
    {
      id: 3,
      name: 'Enterprise',
      price: 'R 2,999',
      period: '/month',
      listings: 100,
      features: [
        'Up to 100 property listings',
        'Premium analytics',
        '24/7 dedicated support',
        'Top placement',
        'Property comparison tool',
        'Virtual tour integration',
        'Custom branding',
      ],
      users: 14,
      revenue: 'R 41,986',
    },
  ];

  const activeSubscriptions = [
    {
      id: 1,
      agency: 'PropCity Estates',
      plan: 'Premium',
      listingsUsed: 15,
      listingsLimit: 20,
      nextBilling: '2025-12-01',
      status: 'Active',
    },
    {
      id: 2,
      agency: 'Cape Town Properties',
      plan: 'Enterprise',
      listingsUsed: 85,
      listingsLimit: 100,
      nextBilling: '2025-12-05',
      status: 'Active',
    },
    {
      id: 3,
      agency: 'Johannesburg Real Estate',
      plan: 'Basic',
      listingsUsed: 4,
      listingsLimit: 5,
      nextBilling: '2025-11-20',
      status: 'Limit Reached',
    },
    {
      id: 4,
      agency: 'Durban Homes',
      plan: 'Premium',
      listingsUsed: 18,
      listingsLimit: 20,
      nextBilling: '2025-12-10',
      status: 'Payment Failed',
    },
  ];

  const getPlanColor = (planName: string) => {
    switch (planName) {
      case 'Basic':
        return 'bg-blue-500';
      case 'Premium':
        return 'bg-purple-500';
      case 'Enterprise':
        return 'bg-cyan-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-600';
      case 'Limit Reached':
        return 'bg-orange-100 text-orange-500';
      case 'Payment Failed':
        return 'bg-red-100 text-red-500';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage < 70) return 'bg-green-500';
    if (percentage < 90) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Subscription Management
          </h1>
          <p className="text-slate-600">
            Manage subscription plans and active subscriptions
          </p>
        </div>
        <button className="btn-primary mt-4 md:mt-0 flex items-center">
          <CreditCard className="h-4 w-4 mr-2" />
          Create New Tier
        </button>
      </div>

      {/* Subscription Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {subscriptionPlans.map(plan => (
          <div key={plan.id} className="card overflow-hidden">
            <div className={`${getPlanColor(plan.name)} text-white p-5`}>
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-lg">{plan.period}</span>
              </div>
              <p className="text-sm mt-1">Up to {plan.listings} listings</p>
            </div>

            <div className="p-5">
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="flex justify-between text-sm mb-4">
                <span className="text-slate-600">Active Users:</span>
                <span className="font-medium">{plan.users}</span>
              </div>

              <div className="flex justify-between text-sm mb-6">
                <span className="text-slate-600">Monthly Revenue:</span>
                <span className="font-medium">{plan.revenue}</span>
              </div>

              <div className="flex space-x-2">
                <button className="btn-primary flex-1 flex items-center justify-center">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button className="btn-secondary flex-1 flex items-center justify-center">
                  <Users className="h-4 w-4 mr-1" />
                  View Users
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Subscriptions */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            Active Subscriptions
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  Agency
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  Plan
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  Listings Used
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  Next Billing Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {activeSubscriptions.map(subscription => {
                const usagePercentage =
                  (subscription.listingsUsed / subscription.listingsLimit) *
                  100;
                return (
                  <tr key={subscription.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {subscription.agency}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`status-badge ${getPlanColor(subscription.plan)} text-white`}
                      >
                        {subscription.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full mr-3">
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getUsageColor(usagePercentage)}`}
                              style={{ width: `${usagePercentage}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-sm text-slate-600">
                          {subscription.listingsUsed}/
                          {subscription.listingsLimit}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {subscription.nextBilling}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`status-badge ${getStatusBadgeClass(subscription.status)}`}
                      >
                        {subscription.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        View
                      </button>
                      <button className="text-slate-600 hover:text-slate-900">
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsPage;
