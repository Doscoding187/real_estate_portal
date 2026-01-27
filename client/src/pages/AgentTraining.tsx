import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap,
  BookOpen,
  Video,
  FileText,
  Award,
  Clock,
  CheckCircle,
  Play,
  Lock,
  TrendingUp,
  Users,
  Star,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  title: string;
  description: string;
  duration: string;
  progress: number;
  status: 'completed' | 'in-progress' | 'locked';
  lessons: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructor: string;
}

function CourseCard({
  title,
  description,
  duration,
  progress,
  status,
  lessons,
  difficulty,
  instructor,
}: CourseCardProps) {
  const difficultyColors = {
    beginner: 'bg-green-50 text-green-700 border-green-200',
    intermediate: 'bg-blue-50 text-blue-700 border-blue-200',
    advanced: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <Card className="shadow-soft hover:shadow-hover transition-all duration-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
            </div>
            {status === 'locked' && (
              <div className="p-2 bg-gray-100 rounded-lg">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(difficultyColors[difficulty])}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </Badge>
            {status === 'completed' && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium text-gray-900">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{duration}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <BookOpen className="h-4 w-4" />
              <span>{lessons} lessons</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant={status === 'locked' ? 'outline' : 'default'}
              size="sm"
              className="flex-1"
              disabled={status === 'locked'}
            >
              {status === 'completed' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Review
                </>
              ) : status === 'locked' ? (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Locked
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {progress > 0 ? 'Continue' : 'Start'}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgentTraining() {
  const [activeTab, setActiveTab] = useState('courses');

  const courses = [
    {
      title: 'Real Estate Fundamentals',
      description: 'Master the basics of property sales, client relationships, and market analysis',
      duration: '4h 30m',
      progress: 100,
      status: 'completed' as const,
      lessons: 12,
      difficulty: 'beginner' as const,
      instructor: 'Sarah Johnson',
    },
    {
      title: 'Digital Marketing for Agents',
      description:
        'Learn how to market properties effectively using social media and online platforms',
      duration: '6h 15m',
      progress: 45,
      status: 'in-progress' as const,
      lessons: 18,
      difficulty: 'intermediate' as const,
      instructor: 'Michael Chen',
    },
    {
      title: 'Advanced Negotiation Techniques',
      description: 'Master the art of negotiation to close more deals and maximize commissions',
      duration: '5h 45m',
      progress: 0,
      status: 'in-progress' as const,
      lessons: 15,
      difficulty: 'advanced' as const,
      instructor: 'David Thompson',
    },
    {
      title: 'Property Valuation Masterclass',
      description: 'Understand property pricing, market trends, and accurate valuations',
      duration: '7h 00m',
      progress: 0,
      status: 'locked' as const,
      lessons: 20,
      difficulty: 'advanced' as const,
      instructor: 'Emily Roberts',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Training & Development</h1>
              <p className="text-sm text-gray-500 mt-1">Enhance your skills and grow your career</p>
            </div>
            <Button variant="outline">
              <Award className="h-4 w-4 mr-2" />
              My Certificates
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Courses Completed</p>
                  <p className="text-3xl font-bold text-gray-900">1</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">In Progress</p>
                  <p className="text-3xl font-bold text-gray-900">2</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Learning Hours</p>
                  <p className="text-3xl font-bold text-gray-900">8.5</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Certificates</p>
                  <p className="text-3xl font-bold text-gray-900">1</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl">
                  <Award className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 p-1 bg-white rounded-xl shadow-soft">
            <TabsTrigger value="courses" className="rounded-lg">
              My Courses
            </TabsTrigger>
            <TabsTrigger value="library" className="rounded-lg">
              Resource Library
            </TabsTrigger>
            <TabsTrigger value="webinars" className="rounded-lg">
              Live Webinars
            </TabsTrigger>
            <TabsTrigger value="achievements" className="rounded-lg">
              Achievements
            </TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {courses.map((course, i) => (
                <CourseCard key={i} {...course} />
              ))}
            </div>
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library" className="space-y-6 mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Learning Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      title: 'Property Market Analysis Guide',
                      type: 'PDF',
                      size: '2.4 MB',
                    },
                    {
                      title: 'Client Communication Templates',
                      type: 'DOCX',
                      size: '890 KB',
                    },
                    {
                      title: 'Real Estate Law Overview',
                      type: 'PDF',
                      size: '1.8 MB',
                    },
                  ].map((resource, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{resource.title}</p>
                          <p className="text-sm text-gray-500">
                            {resource.type} • {resource.size}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webinars Tab */}
          <TabsContent value="webinars" className="space-y-6 mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-blue-600" />
                  Upcoming Webinars
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      title: 'Market Trends 2025: What Agents Need to Know',
                      date: 'Dec 15, 2024',
                      time: '14:00 - 15:30',
                      attendees: 145,
                    },
                    {
                      title: 'Mastering Virtual Property Tours',
                      date: 'Dec 20, 2024',
                      time: '10:00 - 11:00',
                      attendees: 98,
                    },
                  ].map((webinar, i) => (
                    <div
                      key={i}
                      className="p-4 border border-gray-200 rounded-xl hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">{webinar.title}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{webinar.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{webinar.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{webinar.attendees} registered</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        Register Now
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6 mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-600" />
                  Your Certificates & Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 border-2 border-blue-200 bg-blue-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Award className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Real Estate Fundamentals</h3>
                        <p className="text-sm text-gray-600">Completed Nov 28, 2024</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      View Certificate
                    </Button>
                  </div>

                  <div className="p-6 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-center">
                    <div className="text-gray-400">
                      <Award className="h-12 w-12 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">More certificates coming soon</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
