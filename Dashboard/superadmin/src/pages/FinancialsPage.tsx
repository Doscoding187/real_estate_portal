import React from 'react';
import { DollarSign, TrendingUp, CreditCard, FileText } from 'lucide-react';

const FinancialsPage: React.FC = () => {
  // Mock data
  const financialSummary = {
    totalRevenue: 'R 124,500',
    monthlyRevenue: 'R 45,800',
    subscriptionsRevenue: 'R 112,300',
    transactionFees: 'R 12,200',
  };

  const revenueByMonth = [
    { month: 'Jan 2025', amount: 'R 38,500' },
    { month: 'Feb 2025', amount: 'R 41,200' },
    { month: 'Mar 2025', amount: 'R 45,800' },
    { month: 'Apr 2025', amount: 'R 42,300' },
    { month: 'May 2025', amount: 'R 47,100' },
    { month: 'Jun 2025', amount: 'R 49,500' },
  ];

  const recentTransactions = [
    {
      id: 1,
      agency: 'PropCity Estates',
      plan: 'Premium',
      amount: 'R 1,299',
      date: '2025-11-12',
      status: 'Completed',
    },
    {
      id: 2,
      agency: 'Cape Town Properties',
      plan: 'Enterprise',
      amount: 'R 2,999',
      date: '2025-11-11',
      status: 'Completed',
    },
    {
      id: 3,
      agency: 'Johannesburg Real Estate',
      plan: 'Basic',
      amount: 'R 499',
      date: '2025-11-10',
      status: 'Completed',
    },
    {
      id: 4,
      agency: 'Durban Homes',
      plan: 'Premium',
      amount: 'R 1,299',
      date: '2025-11-09',
      status: 'Pending',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Financials</h1>
        <p className="text-slate-600">
          Track revenue, transactions, and financial performance
        </p>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Revenue</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {financialSummary.totalRevenue}
              </h3>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Monthly Revenue</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {financialSummary.monthlyRevenue}
              </h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Subscriptions</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {financialSummary.subscriptionsRevenue}
              </h3>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Transaction Fees</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {financialSummary.transactionFees}
              </h3>
            </div>
            <div className="p-3 bg-cyan-100 rounded-full">
              <FileText className="h-6 w-6 text-cyan-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Revenue Trend
          </h2>

          <div className="flex items-end h-64 space-x-2 mt-8">
            {[35, 40, 55, 48, 65, 70].map((height, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div
                  className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition cursor-pointer"
                  style={{ height: `${height}%` }}
                ></div>
                <span className="text-xs text-slate-500 mt-2">
                  {['J', 'F', 'M', 'A', 'M', 'J'][index]}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="font-medium text-slate-900 mb-3">
              Revenue by Month
            </h3>
            <div className="space-y-3">
              {revenueByMonth.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">{item.month}</span>
                  <span className="font-medium text-slate-900">
                    {item.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">
              Recent Transactions
            </h2>
          </div>

          <div className="divide-y divide-slate-200">
            {recentTransactions.map(transaction => (
              <div key={transaction.id} className="px-6 py-4 hover:bg-slate-50">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900">
                      {transaction.agency}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {transaction.plan} Plan
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-900">
                      {transaction.amount}
                    </p>
                    <p className="text-sm text-slate-500">{transaction.date}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <span
                    className={`status-badge ${
                      transaction.status === 'Completed'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-orange-100 text-orange-500'
                    }`}
                  >
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-slate-200">
            <button className="btn-secondary w-full">
              View All Transactions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialsPage;
