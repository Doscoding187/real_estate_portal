import { Building2, Users, TrendingUp, Home, Plus } from 'lucide-react';
import Card, { Widget } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Page() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="typ-h1">Ikhaya Dashboard</h1>
            <p className="typ-body-m text-gray-600">Clean, modern, soft neumorphism-inspired UI</p>
          </div>
          <Button leftIcon={<Plus />}>New Listing</Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard icon={Users} value="1,248" label="Active Leads" />
          <MetricCard icon={TrendingUp} value="$1.24M" label="Revenue" />
          <MetricCard icon={Home} value="82" label="Active Listings" />
          <MetricCard icon={Building2} value="12" label="Developments" />
        </div>

        {/* Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Widget className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="typ-h3">Recent Leads</div>
              <div className="w-64">
                <Input placeholder="Search leads..." />
              </div>
            </div>
            <div className="overflow-auto -mx-6">
              <table className="table-soft table-soft--comfortable w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['John Smith', 'Hot', 'Website', '2h ago'],
                    ['Sarah Johnson', 'Warm', 'Referral', '5h ago'],
                    ['Mike Brown', 'Cold', 'Social', '1d ago'],
                    ['Emily Davis', 'Warm', 'Event', '2d ago'],
                  ].map((row, i) => (
                    <tr key={i}>
                      {row.map((c, j) => (
                        <td key={j}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Widget>
          <Widget>
            <div className="typ-h3 mb-4">Quick Actions</div>
            <div className="space-y-3">
              <Button className="w-full">Add Development</Button>
              <Button className="w-full" variant="secondary">
                Invite Team Member
              </Button>
              <Button className="w-full" variant="secondary">
                Export CSV
              </Button>
            </div>
          </Widget>
        </div>
      </div>
    </main>
  );
}
