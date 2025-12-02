import { DeveloperLayout } from '../components/developer/DeveloperLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DeveloperReportsPage() {
  return (
    <DeveloperLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600 mt-1">Generate and download performance reports</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-soft rounded-xl">
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>

        {/* Report Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Leads Report', desc: 'Overview of all leads and conversion rates', icon: '📊' },
            { title: 'Sales Report', desc: 'Units sold and revenue breakdown', icon: '💰' },
            { title: 'Marketing Report', desc: 'Campaign performance and ROI', icon: '📈' },
            { title: 'Performance Report', desc: 'Overall development performance metrics', icon: '🎯' },
            { title: 'Affordability Report', desc: 'Lead affordability analysis', icon: '💵' },
            { title: 'Custom Report', desc: 'Build your own custom report', icon: '⚙️' },
          ].map((report, idx) => (
            <Card key={idx} className="shadow-soft rounded-xl border-gray-100 hover:shadow-hover transition-all duration-200 cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="text-3xl mb-2">{report.icon}</div>
                  <Button variant="ghost" size="icon" className="rounded-lg">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
                <CardTitle className="text-lg">{report.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{report.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Reports */}
        <Card className="shadow-soft rounded-xl border-gray-100">
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 text-center py-8">No reports generated yet</p>
          </CardContent>
        </Card>
      </div>
    </DeveloperLayout>
  );
}
