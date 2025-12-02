import { DeveloperLayout } from '../components/developer/DeveloperLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DeveloperTasksPage() {
  return (
    <DeveloperLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600 mt-1">Manage your to-do list and track progress</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-soft rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl border-gray-100">
            <Filter className="w-4 h-4 mr-2" />
            All Tasks
          </Button>
          <Button variant="ghost" className="rounded-xl">My Tasks</Button>
          <Button variant="ghost" className="rounded-xl">Due Today</Button>
          <Button variant="ghost" className="rounded-xl">Overdue</Button>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* To Do */}
          <Card className="shadow-soft rounded-xl border-gray-100">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                To Do (0)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 text-center py-8">No tasks yet</p>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card className="shadow-soft rounded-xl border-gray-100">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                In Progress (0)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 text-center py-8">No tasks yet</p>
            </CardContent>
          </Card>

          {/* Completed */}
          <Card className="shadow-soft rounded-xl border-gray-100">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Completed (0)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 text-center py-8">No tasks yet</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DeveloperLayout>
  );
}
