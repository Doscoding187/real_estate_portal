import { DeveloperLayout } from '../components/developer/DeveloperLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Target, TrendingUp, Users, DollarSign } from 'lucide-react';

export default function DeveloperPerformancePage() {
  return (
    <DeveloperLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance</h1>
          <p className="text-gray-600 mt-1">Track your development performance metrics</p>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Lead Conversion', value: '0%', icon: Target, gradient: 'from-blue-500 to-blue-600' },
            { title: 'Sales Growth', value: '0%', icon: TrendingUp, gradient: 'from-green-500 to-green-600' },
            { title: 'Lead Quality', value: '0%', icon: Users, gradient: 'from-purple-500 to-purple-600' },
            { title: 'Revenue', value: 'R0', icon: DollarSign, gradient: 'from-orange-500 to-orange-600' },
          ].map((metric, idx) => (
            <Card key={idx} className="shadow-soft rounded-xl border-gray-100">
              <CardHeader className="pb-2">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${metric.gradient} flex items-center justify-center shadow-soft mb-3`}>
                  <metric.icon className="w-6 h-6 text-white" />
                </div>
                <CardDescription>{metric.title}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-soft rounded-xl border-gray-100">
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
              <CardDescription>Track your key metrics month by month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">Chart placeholder</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft rounded-xl border-gray-100">
            <CardHeader>
              <CardTitle>Development Comparison</CardTitle>
              <CardDescription>Compare performance across developments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">Chart placeholder</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DeveloperLayout>
  );
}
