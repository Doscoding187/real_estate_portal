import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { AgentSidebar } from '@/components/agent/AgentSidebar';
import { AgentTopNav } from '@/components/agent/AgentTopNav';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Menu,
  Calendar,
  CheckCircle,
  Plus,
  Clock,
  Bell,
  MapPin,
  User,
  X,
  Edit,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShowingsCalendar } from '@/components/agent/ShowingsCalendar';

export default function AgentProductivity() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks');
  const [showAddTask, setShowAddTask] = useState(false);

  // Mock tasks data
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Follow up with Sarah about offer',
      dueDate: '2024-12-02',
      priority: 'high',
      completed: false,
      category: 'follow-up',
    },
    {
      id: 2,
      title: 'Upload new photos for Waterfront listing',
      dueDate: '2024-12-02',
      priority: 'medium',
      completed: true,
      category: 'listing',
    },
    {
      id: 3,
      title: 'Prepare market analysis report',
      dueDate: '2024-12-03',
      priority: 'high',
      completed: false,
      category: 'admin',
    },
    {
      id: 4,
      title: 'Schedule viewing for Sandton property',
      dueDate: '2024-12-02',
      priority: 'low',
      completed: true,
      category: 'showing',
    },
    {
      id: 5,
      title: 'Send contract to John Smith',
      dueDate: '2024-12-04',
      priority: 'high',
      completed: false,
      category: 'admin',
    },
    {
      id: 6,
      title: 'Update pricing on 3 listings',
      dueDate: '2024-12-05',
      priority: 'medium',
      completed: false,
      category: 'listing',
    },
  ]);

  // Mock reminders data
  const reminders = [
    { id: 1, title: 'Call back Mike Davis', time: '2:00 PM Today', type: 'call', priority: 'high' },
    {
      id: 2,
      title: 'Send property brochure to Alice',
      time: '4:00 PM Today',
      type: 'email',
      priority: 'medium',
    },
    {
      id: 3,
      title: 'Property inspection follow-up',
      time: 'Tomorrow 10:00 AM',
      type: 'meeting',
      priority: 'high',
    },
  ];

  // Mock upcoming showings
  const upcomingShowings = [
    {
      id: 1,
      property: 'Luxury Villa - Camps Bay',
      date: '2024-12-03',
      time: '10:00 AM',
      client: 'John Smith',
      address: '123 Ocean View Drive, Camps Bay',
      status: 'confirmed',
    },
    {
      id: 2,
      property: 'Modern Apartment - Sandton',
      date: '2024-12-03',
      time: '2:00 PM',
      client: 'Sarah Williams',
      address: '45 Rivonia Road, Sandton',
      status: 'confirmed',
    },
    {
      id: 3,
      property: 'Waterfront Penthouse',
      date: '2024-12-04',
      time: '11:30 AM',
      client: 'Mike Davis',
      address: '78 Waterfront Drive, Cape Town',
      status: 'pending',
    },
  ];

  if (!loading && !isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (!loading && user?.role !== 'agent') {
    setLocation('/dashboard');
    return null;
  }

  const toggleTask = (id: number) => {
    setTasks(tasks.map(task => (task.id === id ? { ...task, completed: !task.completed } : task)));
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'follow-up':
        return 'bg-blue-100 text-blue-700';
      case 'listing':
        return 'bg-purple-100 text-purple-700';
      case 'showing':
        return 'bg-green-100 text-green-700';
      case 'admin':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const tasksCompleted = tasks.filter(t => t.completed).length;
  const tasksTotal = tasks.length;
  const completionRate = Math.round((tasksCompleted / tasksTotal) * 100);

  return (
    <div className="flex min-h-screen bg-[#F4F7FA]">
      <AgentSidebar />

      <Sheet>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <AgentSidebar />
        </SheetContent>
      </Sheet>

      <div className="flex-1 lg:pl-64">
        <AgentTopNav />

        <main className="p-6 max-w-[1600px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Productivity</h1>
              <p className="text-gray-500 mt-1">Manage tasks, calendar, and follow-ups</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="shadow-soft hover:shadow-hover transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Tasks Today</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {tasks.filter(t => !t.completed).length}
                    </p>
                    <p className="text-xs text-blue-600 font-medium mt-2">
                      {tasksCompleted} completed
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft hover:shadow-hover transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Completion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                        style={{ width: `${completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft hover:shadow-hover transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Upcoming Showings</p>
                    <p className="text-2xl font-bold text-gray-900">{upcomingShowings.length}</p>
                    <p className="text-xs text-purple-600 font-medium mt-2">Next: Today 10:00 AM</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <MapPin className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft hover:shadow-hover transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Reminders</p>
                    <p className="text-2xl font-bold text-gray-900">{reminders.length}</p>
                    <p className="text-xs text-orange-600 font-medium mt-2">Pending actions</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <Bell className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-4 p-1 bg-white rounded-xl shadow-soft">
              <TabsTrigger
                value="tasks"
                className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                Tasks
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                Calendar
              </TabsTrigger>
              <TabsTrigger
                value="showings"
                className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                Showings
              </TabsTrigger>
              <TabsTrigger
                value="reminders"
                className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                Reminders
              </TabsTrigger>
            </TabsList>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="space-y-4">
              <Card className="shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Task Manager</CardTitle>
                  <Button
                    onClick={() => setShowAddTask(!showAddTask)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {showAddTask && (
                    <div className="p-4 bg-blue-50 rounded-xl space-y-3 mb-4">
                      <Input placeholder="Task title..." className="bg-white" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input type="date" className="bg-white" />
                        <select className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white">
                          <option>Priority</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1 bg-blue-600 text-white">Save Task</Button>
                        <Button variant="outline" onClick={() => setShowAddTask(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl transition-all duration-200',
                        task.completed
                          ? 'bg-gray-50'
                          : 'bg-white border border-gray-200 hover:shadow-soft',
                      )}
                    >
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={cn(
                          'h-6 w-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                          task.completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-blue-500',
                        )}
                      >
                        {task.completed && <CheckCircle className="h-4 w-4 text-white" />}
                      </button>

                      <div className="flex-1">
                        <p
                          className={cn(
                            'font-medium',
                            task.completed ? 'text-gray-400 line-through' : 'text-gray-900',
                          )}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                          <Badge className={cn('text-xs', getCategoryColor(task.category))}>
                            {task.category}
                          </Badge>
                        </div>
                      </div>

                      <Badge className={cn('text-xs', getPriorityColor(task.priority))}>
                        {task.priority}
                      </Badge>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Calendar Tab */}
            <TabsContent value="calendar">
              <ShowingsCalendar />
            </TabsContent>

            {/* Showings Tab */}
            <TabsContent value="showings" className="space-y-4">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle>Viewing Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {upcomingShowings.map(showing => (
                    <div
                      key={showing.id}
                      className="p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{showing.property}</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {showing.address}
                          </p>
                        </div>
                        <Badge
                          className={
                            showing.status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }
                        >
                          {showing.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Date</p>
                          <p className="font-semibold text-gray-900">
                            {new Date(showing.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Time</p>
                          <p className="font-semibold text-gray-900">{showing.time}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Client</p>
                          <p className="font-semibold text-gray-900 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {showing.client}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reminders Tab */}
            <TabsContent value="reminders" className="space-y-4">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-600" />
                    Follow-up Reminders
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reminders.map(reminder => (
                    <div
                      key={reminder.id}
                      className="p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-orange-200 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-orange-700" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{reminder.title}</p>
                            <p className="text-sm text-gray-600 mt-1">{reminder.time}</p>
                            <Badge
                              className={cn('mt-2 text-xs', getPriorityColor(reminder.priority))}
                            >
                              {reminder.priority} priority
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
