import React, { useState } from 'react';
import {
  Plus,
  Building2,
  CheckCircle,
  Clock,
  TrendingUp,
  Eye,
  Edit,
  FileCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const DevelopersPage: React.FC = () => {
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedDeveloper, setSelectedDeveloper] = useState<Record<string, any> | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Developer dashboard cards data
  const developerStats = [
    {
      title: 'Total Developers',
      value: '24',
      change: '+3 this month',
      icon: <Building2 className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-100',
    },
    {
      title: 'Active Projects',
      value: '67',
      change: '+8 this month',
      icon: <TrendingUp className="h-6 w-6 text-green-600" />,
      color: 'bg-green-100',
    },
    {
      title: 'Total Units Listed',
      value: '2,847',
      change: '+142 this month',
      icon: <TrendingUp className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-100',
    },
    {
      title: 'Developer Revenue',
      value: 'R 124,500',
      change: '+15.2%',
      icon: <TrendingUp className="h-6 w-6 text-cyan-600" />,
      color: 'bg-cyan-100',
    },
  ];

  // Developer table data
  const developerData: Record<string, any>[] = [
    {
      id: 1,
      name: 'Century Properties',
      registration: '2025/123456/07',
      subscription: 'Premium',
      projects: 5,
      units: 240,
      soldRented: 180,
      status: 'Active',
      joined: '2025-01-15',
    },
    {
      id: 2,
      name: 'Sandton Developments',
      registration: '2024/987654/07',
      subscription: 'Enterprise',
      projects: 3,
      units: 180,
      soldRented: 142,
      status: 'Active',
      joined: '2024-11-22',
    },
    {
      id: 3,
      name: 'Cape Town Builders',
      registration: '2025/456789/07',
      subscription: 'Basic',
      projects: 2,
      units: 95,
      soldRented: 68,
      status: 'Active',
      joined: '2025-03-10',
    },
    {
      id: 4,
      name: 'Durban Housing Co',
      registration: '2025/321654/07',
      subscription: 'Premium',
      projects: 4,
      units: 156,
      soldRented: 98,
      status: 'Pending',
      joined: '2025-10-05',
    },
  ];

  // Projects management data
  const projectData: Record<string, any>[] = [
    {
      id: 1,
      name: 'Sandton Heights',
      location: 'Sandton, Johannesburg',
      totalUnits: 120,
      availableUnits: 42,
      priceRange: 'R 1.2M - R 3.5M',
      status: 'Under Construction',
      launchDate: '2025-09-15',
    },
    {
      id: 2,
      name: 'Cape Residences',
      location: 'Cape Town',
      totalUnits: 80,
      availableUnits: 18,
      priceRange: 'R 850K - R 2.1M',
      status: 'Completed',
      launchDate: '2025-06-20',
    },
    {
      id: 3,
      name: 'Durban Waterfront',
      location: 'Durban',
      totalUnits: 140,
      availableUnits: 75,
      priceRange: 'R 950K - R 2.8M',
      status: 'Planning',
      launchDate: '2026-01-10',
    },
  ];

  // Approval requirements
  const approvalRequirements = [
    {
      name: 'Company registration (CIPC)',
      status: 'Completed',
      verified: true,
    },
    {
      name: 'NHBRC registration (SA-specific!)',
      status: 'Pending',
      verified: false,
    },
    { name: 'Tax clearance', status: 'Completed', verified: true },
    { name: 'Project portfolio', status: 'Completed', verified: true },
    { name: 'Sales team details', status: 'Pending', verified: false },
  ];

  const handleViewDeveloper = (developer: Record<string, any>) => {
    setSelectedDeveloper(developer);
    setIsDetailsModalOpen(true);
  };

  const handleApproveDeveloper = (developer: Record<string, any>) => {
    setSelectedDeveloper(developer);
    setIsApprovalModalOpen(true);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Active':
      case 'Completed':
        return 'default';
      case 'Pending':
      case 'Under Construction':
        return 'secondary';
      case 'Planning':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Developers Module</h1>
          <p className="text-muted-foreground">
            Manage property developer accounts (separate from agencies)
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Developer
        </Button>
      </div>

      {/* Developer Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {developerStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-muted-foreground text-sm font-medium">{stat.title}</h3>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Developer Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <h2 className="text-lg font-bold">Developers</h2>
            <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
              <select className="border border-input rounded-md px-3 py-2 text-sm">
                <option>All Statuses</option>
                <option>Active</option>
                <option>Pending</option>
                <option>Suspended</option>
              </select>
              <select className="border border-input rounded-md px-3 py-2 text-sm">
                <option>All Subscriptions</option>
                <option>Basic</option>
                <option>Premium</option>
                <option>Enterprise</option>
              </select>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Developer Name</TableHead>
                <TableHead>Company Registration (CIPC)</TableHead>
                <TableHead>Subscription Tier</TableHead>
                <TableHead>Active Projects</TableHead>
                <TableHead>Total Units</TableHead>
                <TableHead>Units Sold/Rented</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {developerData.map(developer => (
                <TableRow key={developer.id}>
                  <TableCell className="font-medium">{developer.name}</TableCell>
                  <TableCell>{developer.registration}</TableCell>
                  <TableCell>{developer.subscription}</TableCell>
                  <TableCell>{developer.projects}</TableCell>
                  <TableCell>{developer.units}</TableCell>
                  <TableCell>{developer.soldRented}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(developer.status)}>{developer.status}</Badge>
                  </TableCell>
                  <TableCell>{developer.joined}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDeveloper(developer)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {developer.status === 'Pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApproveDeveloper(developer)}
                        >
                          <FileCheck className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Projects Management */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <h2 className="text-lg font-bold">Projects Management</h2>
            <div className="flex gap-2 mt-2 md:mt-0">
              <select className="border border-input rounded-md px-3 py-2 text-sm">
                <option>All Statuses</option>
                <option>Planning</option>
                <option>Under Construction</option>
                <option>Completed</option>
              </select>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Total Units</TableHead>
                <TableHead>Available Units</TableHead>
                <TableHead>Price Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Launch Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectData.map(project => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.location}</TableCell>
                  <TableCell>{project.totalUnits}</TableCell>
                  <TableCell>{project.availableUnits}</TableCell>
                  <TableCell>{project.priceRange}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(project.status)}>{project.status}</Badge>
                  </TableCell>
                  <TableCell>{project.launchDate}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        Feature
                      </Button>
                      <Button variant="outline" size="sm">
                        Reports
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Developer Approval Modal */}
      <Dialog open={isApprovalModalOpen} onOpenChange={setIsApprovalModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Developer Approval Process</DialogTitle>
          </DialogHeader>
          {selectedDeveloper && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-bold">{selectedDeveloper.name}</h3>
                <p className="text-muted-foreground">
                  Company Registration: {selectedDeveloper.registration}
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Approval Requirements</h4>
                {approvalRequirements.map((req, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span className="text-sm">{req.name}</span>
                    <div className="flex items-center">
                      {req.verified ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      ) : (
                        <Clock className="h-5 w-5 text-orange-500 mr-2" />
                      )}
                      <Badge variant={req.verified ? 'default' : 'secondary'}>{req.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setIsApprovalModalOpen(false)}>
                  Cancel
                </Button>
                <Button>Approve Developer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Developer Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Developer Details: {selectedDeveloper?.name}</DialogTitle>
          </DialogHeader>
          {selectedDeveloper && (
            <div className="space-y-6">
              {/* Developer Information */}
              <div>
                <h3 className="text-lg font-bold mb-4">Developer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Company Name</p>
                      <p className="text-lg font-bold">{selectedDeveloper.name}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Company Registration (CIPC)</p>
                      <p className="text-lg font-bold">{selectedDeveloper.registration}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Subscription Tier</p>
                      <p className="text-lg font-bold">{selectedDeveloper.subscription}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="text-lg font-bold">
                        <Badge variant={getStatusVariant(selectedDeveloper.status)}>
                          {selectedDeveloper.status}
                        </Badge>
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Project Summary */}
              <div>
                <h3 className="text-lg font-bold mb-4">Project Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Active Projects</p>
                      <p className="text-2xl font-bold">{selectedDeveloper.projects}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Units</p>
                      <p className="text-2xl font-bold">{selectedDeveloper.units}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Units Sold/Rented</p>
                      <p className="text-2xl font-bold">{selectedDeveloper.soldRented}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Projects List */}
              <div>
                <h3 className="text-lg font-bold mb-4">Projects</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project Name</TableHead>
                        <TableHead>Units</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Sandton Heights</TableCell>
                        <TableCell>120 units</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Under Construction</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Premium Residences</TableCell>
                        <TableCell>80 units</TableCell>
                        <TableCell>
                          <Badge variant="default">Completed</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button>Edit Developer</Button>
                <Button variant="outline">View All Projects</Button>
                <Button variant="outline">Send Message</Button>
                {selectedDeveloper.status === 'Pending' && (
                  <Button
                    variant="default"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setIsApprovalModalOpen(true);
                    }}
                  >
                    Approve Developer
                  </Button>
                )}
                <Button variant="destructive">Suspend Developer</Button>
              </div>

              <div className="mt-6 flex justify-end">
                <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DevelopersPage;
