import { CommissionTracker } from '@/components/agent/CommissionTracker';

export default function AgentCommission() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Commission Tracker</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track your earnings and commission payments
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <CommissionTracker />
      </main>
    </div>
  );
}
