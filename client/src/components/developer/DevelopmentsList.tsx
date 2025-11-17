import React, { useState } from 'react';
import DevelopmentWizard from './DevelopmentWizard';
import { Plus, Search, Filter, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DevelopmentsList: React.FC = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Sample developments data
  const developments = [
    {
      id: 1,
      name: 'Sunset Heights Estate',
      location: 'Cape Town, Western Cape',
      type: 'Luxury Apartments',
      units: 48,
      status: 'active',
      leads: 127,
      views: 1927,
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
    },
    {
      id: 2,
      name: 'Riverside Gardens',
      location: 'Johannesburg, Gauteng',
      type: 'Family Residences',
      units: 24,
      status: 'active',
      leads: 89,
      views: 3081,
      image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400',
    },
    {
      id: 3,
      name: 'Ocean View Villas',
      location: 'Durban, KwaZulu-Natal',
      type: 'Coastal Villas',
      units: 12,
      status: 'active',
      leads: 156,
      views: 2456,
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      id: 4,
      name: 'Mountain Peak Estates',
      location: 'Stellenbosch, Western Cape',
      type: 'Wine Estate Homes',
      units: 18,
      status: 'paused',
      leads: 64,
      views: 1234,
      image: 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=400',
    },
    {
      id: 5,
      name: 'City Center Lofts',
      location: 'Pretoria, Gauteng',
      type: 'Urban Apartments',
      units: 36,
      status: 'draft',
      leads: 12,
      views: 456,
      image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=400',
    },
  ];

  const filteredDevelopments = developments.filter(
    dev =>
      dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dev.location.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const statusColors = {
    active: 'bg-success/20 text-success border-success',
    paused: 'bg-warning/20 text-warning border-warning',
    draft: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Developments</h1>
          <p className="text-muted-foreground">
            Manage all your property developments in one place
          </p>
        </div>
        <Button className="bg-accent hover:bg-accent/90" onClick={() => setShowWizard(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Development
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search developments..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Developments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Development</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Views</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevelopments.map(dev => (
                <TableRow key={dev.id} className="hover:bg-muted/50 cursor-pointer">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={dev.image}
                        alt={dev.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                      <span className="font-semibold text-foreground">{dev.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{dev.location}</TableCell>
                  <TableCell className="text-muted-foreground">{dev.type}</TableCell>
                  <TableCell className="font-medium">{dev.units}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[dev.status as keyof typeof statusColors]}
                    >
                      {dev.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{dev.leads}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {dev.views.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Analytics</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Development Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Add New Development</h3>
              <button
                onClick={() => setShowWizard(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <DevelopmentWizard />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevelopmentsList;
