import React, { useState } from 'react';
import { Plus, MapPin, Phone, Search, Filter, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const AgenciesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<Record<string, any> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock data for agencies
  const agenciesData: Record<string, any>[] = [
    {
      id: 1,
      name: 'PropCity Estates',
      location: 'Sandton, Johannesburg',
      properties: 124,
      agents: 12,
      status: 'Active',
      contact: '+27 11 123 4567',
    },
    {
      id: 2,
      name: 'Cape Town Properties',
      location: 'Cape Town CBD',
      properties: 89,
      agents: 8,
      status: 'Active',
      contact: '+27 21 987 6543',
    },
    {
      id: 3,
      name: 'Durban Homes',
      location: 'Durban Central',
      properties: 67,
      agents: 6,
      status: 'Pending',
      contact: '+27 31 555 1234',
    },
  ];

  const handleViewAgency = (agency: Record<string, any>) => {
    setSelectedAgency(agency);
    setIsModalOpen(true);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Pending':
        return 'secondary';
      default:
        return 'destructive';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agency Management</h1>
          <p className="text-muted-foreground">Manage real estate agencies and their listings</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Agency
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="w-full md:w-60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agencies..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select className="border border-input rounded-md px-3 py-2 text-sm">
                <option>All Statuses</option>
                <option>Active</option>
                <option>Pending</option>
                <option>Suspended</option>
              </select>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agencies Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Properties Listed</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agenciesData.map(agency => (
                <TableRow key={agency.id}>
                  <TableCell className="font-medium">{agency.name}</TableCell>
                  <TableCell>{agency.location}</TableCell>
                  <TableCell>{agency.properties}</TableCell>
                  <TableCell>{agency.agents}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(agency.status)}>{agency.status}</Badge>
                  </TableCell>
                  <TableCell>{agency.contact}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewAgency(agency)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Agency Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedAgency?.name}</DialogTitle>
          </DialogHeader>
          {selectedAgency && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Agency Name</p>
                    <p className="font-medium">{selectedAgency.name}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                      {selectedAgency.location}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Properties Listed</p>
                    <p className="font-medium">{selectedAgency.properties}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Agents</p>
                    <p className="font-medium">{selectedAgency.agents}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium">
                      <Badge variant={getStatusVariant(selectedAgency.status)}>
                        {selectedAgency.status}
                      </Badge>
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Contact</p>
                    <p className="font-medium flex items-center">
                      <Phone className="h-4 w-4 mr-1 text-muted-foreground" />
                      {selectedAgency.contact}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Close
                </Button>
                <Button>Edit Agency</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgenciesPage;
