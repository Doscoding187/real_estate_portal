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
  GraduationCap,
  Play,
  CheckCircle,
  Award,
  HelpCircle,
  MessageCircle,
  FileText,
  Clock,
  Search,
  BookOpen,
  Video,
  Trophy,
  Star,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgentTrainingSupport() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('academy');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data
  const courses = [
    {
      id: 1,
      title: 'Real Estate Fundamentals',
      description: 'Master the basics of property sales',
      duration: '2.5 hours',
      progress: 100,
      status: 'completed',
      category: 'Basics',
      lessons: 12,
    },
    {
      id: 2,
      title: 'Advanced Negotiation Skills',
      description: 'Close deals with confidence',
      duration: '3 hours',
      progress: 45,
      status: 'in-progress',
      category: 'Sales',
      lessons: 15,
    },
    {
      id: 3,
      title: 'Digital Marketing for Agents',
      description: 'Boost your online presence',
      duration: '2 hours',
      progress: 0,
      status: 'not-started',
      category: 'Marketing',
      lessons: 10,
    },
    {
      id: 4,
      title: 'Client Relationship Management',
      description: 'Build lasting client relationships',
      duration: '1.5 hours',
      progress: 0,
      status: 'not-started',
      category: 'CRM',
      lessons: 8,
    },
  ];

  const certifications = [
    {
      id: 1,
      name: 'Certified Real Estate Professional',
      earned: true,
      earnedDate: '2024-10-15',
      validUntil: '2025-10-15',
      badge: '🏆',
    },
    {
      id: 2,
      name: 'Luxury Property Specialist',
      earned: false,
      progress: 75,
      requiredCourses: 3,
      completedCourses: 2,
      badge: '💎',
    },
    {
      id: 3,
      name: 'Digital Marketing Expert',
      earned: false,
      progress: 30,
      requiredCourses: 4,
      completedCourses: 1,
      badge: '🚀',
    },
  ];

  const faqs = [
    {
      id: 1,
      category: 'Listings',
      question: 'How do I create a new listing?',
      answer:
        'Navigate to the Listings page and click "Add New Listing". Follow the wizard to enter property details, upload photos, and publish.',
    },
    {
      id: 2,
      category: 'Commissions',
      question: 'When will I receive my commission?',
      answer:
        'Commissions are typically paid 7-10 business days after the deal closes and all paperwork is completed.',
    },
    {
      id: 3,
      category: 'Marketing',
      question: 'How do I upload videos to Explore?',
      answer:
        'Go to Marketing Hub > Explore Feed and click "Upload New Video". You can upload vertical videos up to 60 seconds.',
    },
    {
      id: 4,
      category: 'Account',
      question: 'How do I update my profile information?',
      answer:
        'Visit Settings > Profile to update your personal information, profile photo, and contact details.',
    },
  ];

  const supportTickets = [
    {
      id: 1,
      subject: 'Unable to upload property photos',
      status: 'open',
      priority: 'high',
      createdAt: '2024-12-01',
      lastUpdate: '2024-12-01',
    },
    {
      id: 2,
      subject: 'Commission payment inquiry',
      status: 'in-progress',
      priority: 'medium',
      createdAt: '2024-11-28',
      lastUpdate: '2024-11-30',
    },
    {
      id: 3,
      subject: 'Question about listing approval process',
      status: 'resolved',
      priority: 'low',
      createdAt: '2024-11-25',
      lastUpdate: '2024-11-26',
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

  const coursesCompleted = courses.filter(c => c.status === 'completed').length;
  const certificationsEarned = certifications.filter(c => c.earned).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700';
      case 'not-started':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-700';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'resolved':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

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
              <h1 className="text-3xl font-bold text-gray-900">Training & Support</h1>
              <p className="text-gray-500 mt-1">Learn, grow, and get help when you need it</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="shadow-soft hover:shadow-hover transition-all duration-300 border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Courses Completed</p>
                    <p className="text-2xl font-bold text-gray-900">{coursesCompleted}</p>
                    <p className="text-xs text-blue-600 font-medium mt-2">
                      of {courses.length} total
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft hover:shadow-hover transition-all duration-300 border-l-4 border-l-yellow-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Certifications</p>
                    <p className="text-2xl font-bold text-gray-900">{certificationsEarned}</p>
                    <p className="text-xs text-yellow-600 font-medium mt-2">Earned</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-xl">
                    <Award className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft hover:shadow-hover transition-all duration-300 border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Learning Hours</p>
                    <p className="text-2xl font-bold text-gray-900">12.5</p>
                    <p className="text-xs text-purple-600 font-medium mt-2">This month</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft hover:shadow-hover transition-all duration-300 border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Support Tickets</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {supportTickets.filter(t => t.status !== 'resolved').length}
                    </p>
                    <p className="text-xs text-green-600 font-medium mt-2">Active</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl">
                    <MessageCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-3xl grid-cols-4 p-1 bg-white rounded-xl shadow-soft">
              <TabsTrigger
                value="academy"
                className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                Academy
              </TabsTrigger>
              <TabsTrigger
                value="certifications"
                className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                Certifications
              </TabsTrigger>
              <TabsTrigger
                value="help"
                className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                Help Center
              </TabsTrigger>
              <TabsTrigger
                value="support"
                className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                Support
              </TabsTrigger>
            </TabsList>

            {/* Training Academy Tab */}
            <TabsContent value="academy" className="space-y-4">
              <Card className="shadow-soft">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                      Training Courses
                    </CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search courses..."
                        className="pl-10 w-64 rounded-xl"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {courses.map(course => (
                    <div
                      key={course.id}
                      className="p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              {course.category}
                            </Badge>
                            <Badge className={cn('text-xs', getStatusColor(course.status))}>
                              {course.status.replace('-', ' ')}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1">{course.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{course.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              {course.lessons} lessons
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {course.duration}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant={course.status === 'not-started' ? 'default' : 'outline'}
                          size="sm"
                          className="ml-4 rounded-lg"
                        >
                          {course.status === 'completed' ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Review
                            </>
                          ) : course.status === 'in-progress' ? (
                            <>
                              Continue
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Start Course
                            </>
                          )}
                        </Button>
                      </div>
                      {course.progress > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-semibold text-gray-900">{course.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={cn(
                                'h-2 rounded-full transition-all',
                                course.progress === 100
                                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                                  : 'bg-gradient-to-r from-blue-500 to-blue-600',
                              )}
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Certifications Tab */}
            <TabsContent value="certifications" className="space-y-4">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    Certifications & Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {certifications.map(cert => (
                    <div
                      key={cert.id}
                      className={cn(
                        'p-5 rounded-xl',
                        cert.earned ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : 'bg-gray-50',
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="text-4xl">{cert.badge}</div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{cert.name}</h3>
                            {cert.earned ? (
                              <>
                                <p className="text-sm text-gray-600 mb-2">
                                  Earned on {new Date(cert.earnedDate!).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Valid until {new Date(cert.validUntil!).toLocaleDateString()}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-gray-600 mb-3">
                                  Complete {cert.requiredCourses} required courses to earn this
                                  certification
                                </p>
                                <div className="mb-2">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-600">
                                      {cert.completedCourses} of {cert.requiredCourses} courses
                                    </span>
                                    <span className="font-semibold text-gray-900">
                                      {cert.progress}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
                                      style={{ width: `${cert.progress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        {cert.earned && (
                          <Badge className="bg-green-100 text-green-700">
                            <Star className="h-3 w-3 mr-1" />
                            Certified
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Help Center Tab */}
            <TabsContent value="help" className="space-y-4">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-blue-600" />
                    Frequently Asked Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {faqs.map(faq => (
                    <div key={faq.id} className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                          <HelpCircle className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              {faq.category}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-gray-900 mb-2">{faq.question}</h4>
                          <p className="text-sm text-gray-600">{faq.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Support Tab */}
            <TabsContent value="support" className="space-y-4">
              <Card className="shadow-soft">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Support Tickets</CardTitle>
                    <Button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      New Ticket
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {supportTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{ticket.subject}</h4>
                          <p className="text-sm text-gray-600">
                            Created {new Date(ticket.createdAt).toLocaleDateString()} • Last update{' '}
                            {new Date(ticket.lastUpdate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={cn('text-xs', getTicketStatusColor(ticket.status))}>
                          {ticket.status.replace('-', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-soft bg-gradient-to-r from-blue-50 to-purple-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <MessageCircle className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Need immediate help?</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Our support team is available 24/7 to assist you
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="rounded-lg">
                          Live Chat
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-lg">
                          Email Support
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
