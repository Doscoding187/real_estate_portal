import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Download,
  Trash2,
  Edit,
  Mail,
  Phone,
  MoreHorizontal,
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Eye,
  Plus,
  Search,
  Filter,
  CheckCircle,
  X,
  Settings,
  RefreshCw,
  Copy,
} from 'lucide-react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { publisherTheme, animations, cardElevation } from '@/lib/publisherTheme';
import { format } from 'date-fns';

// Mock data for demonstration
const mockBulkData = [
  {
    id: 1,
    name: 'John Smith',
    email: 'john@example.com',
    phone: '082-123-4567',
    status: 'new',
    value: 450000,
  },
  {
    id: 2,
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '083-987-6543',
    status: 'qualified',
    value: 780000,
  },
  {
    id: 3,
    name: 'Bob Johnson',
    email: 'bob@example.com',
    phone: '081-555-1234',
    status: 'contacted',
    value: 320000,
  },
  {
    id: 4,
    name: 'Alice Brown',
    email: 'alice@example.com',
    phone: '084-222-3333',
    status: 'captured',
    value: 650000,
  },
];

const mockChartData = {
  leads: [
    { date: '2024-01', count: 120 },
    { date: '2024-02', count: 156 },
    { date: '2024-03', count: 189 },
    { date: '2024-04', count: 145 },
    { date: '2024-05', count: 198 },
    { date: '2024-06', count: 234 },
  ],
  conversion: {
    new: 45,
    qualified: 23,
    captured: 18,
    lost: 4,
  },
  sources: [
    { source: 'Website', count: 156, percentage: 39 },
    { source: 'Referral', count: 98, percentage: 25 },
    { source: 'Social Media', count: 67, percentage: 17 },
    { source: 'Direct', count: 78, percentage: 20 },
  ],
};

const BulkActions: React.FC<{
  selectedItems: number[];
  onAction: (action: string) => void;
  disabled?: boolean;
}> = ({ selectedItems, onAction, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || selectedItems.length === 0}
          className="h-8 gap-2"
        >
          Bulk Actions
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onAction('export')}>
          <Download className="w-4 h-4 mr-2" />
          Export Selected ({selectedItems.length})
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('email')}>
          <Mail className="w-4 h-4 mr-2" />
          Send Email ({selectedItems.length})
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAction('delete')} className="text-red-600">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Selected ({selectedItems.length})
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAction('assign')}>
          <Users className="w-4 h-4 mr-2" />
          Assign to Agent
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const SimpleChart: React.FC<{
  data: Array<{ date: string; count: number }>;
  title: string;
  color: string;
}> = ({ data, title, color }) => {
  const maxValue = Math.max(...data.map(d => d.count));

  return (
    <Card className={cardElevation.medium}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-end space-x-2">
          {data.map((point, index) => (
            <div
              key={index}
              className="flex-1 flex flex-col items-center"
              title={`${point.date}: ${point.count}`}
            >
              <div
                className="w-full bg-gradient-to-t from-gray-100 to-gray-50 rounded-t"
                style={{ height: `${(point.count / maxValue) * 100}%` }}
              />
              <div
                className="w-3 rounded-t"
                style={{
                  height: '6px',
                  backgroundColor: color,
                }}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const PieChart: React.FC<{
  data: Array<{ label: string; value: number; percentage?: number }>;
  title: string;
}> = ({ data, title }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <Card className={cardElevation.medium}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-6">
          {/* Pie Chart Visualization */}
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 32 32" className="w-full h-full">
              {data.map((item, index) => {
                const percentage = (item.value / total) * 100;
                const angle = (percentage / 100) * 360;
                const startAngle =
                  index === 0
                    ? 0
                    : data.slice(0, index).reduce((sum, prevItem) => {
                        return sum + (prevItem.value / total) * 360;
                      }, 0);

                return (
                  <g key={index}>
                    <path
                      d={`M 16 16 L 16 16 A 16 16 0 ${startAngle >= angle ? 1 : 0} ${angle} ${startAngle < angle ? 1 : 0} ${startAngle} Z`}
                      fill={colors[index % colors.length]}
                      stroke="white"
                      strokeWidth="1"
                    />
                    <text
                      x={
                        16 +
                        (index < 2 ? 8 : 12) *
                          Math.cos((((startAngle + angle) / 2) * Math.PI) / 180)
                      }
                      y={
                        16 +
                        (index < 2 ? 8 : 12) *
                          Math.sin((((startAngle + angle) / 2) * Math.PI) / 180)
                      }
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="3"
                      fill="white"
                    >
                      {percentage > 8 ? `${Math.round(percentage)}%` : ''}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-sm text-gray-600">
                  {item.value} ({Math.round((item.value / total) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const BulkOperationsAndDataVisualization: React.FC = () => {
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    return mockBulkData.filter(
      item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleSelectAll = useCallback(() => {
    if (selectedItems.length === paginatedData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(paginatedData.map(item => item.id));
    }
  }, [selectedItems, paginatedData]);

  const handleSelectItem = useCallback((id: number) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id],
    );
  }, []);

  const handleBulkAction = useCallback(
    (action: string) => {
      console.log(`Bulk action: ${action} for items:`, selectedItems);
      // Handle bulk actions here
    },
    [selectedItems],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Bulk Operations & Analytics
          </h2>
          <p className="text-gray-600">
            Manage multiple items simultaneously with advanced data visualizations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Data Visualization Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SimpleChart data={mockChartData.leads} title="Lead Trends" color="#4f46e5" />
        <SimpleChart data={mockChartData.leads} title="Conversion Funnel" color="#10b981" />
        <PieChart data={mockChartData.sources} title="Lead Sources" />
        <PieChart data={mockChartData.conversion} title="Conversion Status" />
      </div>

      {/* Bulk Operations Table */}
      <Card className={cardElevation.high}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Lead Management ({filteredData.length} total)
            </CardTitle>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 text-sm border-2 border-gray-200 rounded-xl"
                />
              </div>

              {selectedItems.length > 0 && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  {selectedItems.length} selected
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Actions Bar */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedItems.length === paginatedData.length}
                onCheckedChange={handleSelectAll}
                className="h-4 w-4"
              />
              <span className="text-sm">Select all ({paginatedData.length} on this page)</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedItems([])}
                className="h-7"
              >
                <X className="w-3 h-3 mr-1" />
                Clear Selection
              </Button>

              <BulkActions
                selectedItems={selectedItems}
                onAction={handleBulkAction}
                disabled={selectedItems.length === 0}
              />
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.length === paginatedData.length}
                      onCheckedChange={handleSelectAll}
                      className="h-4 w-4"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item, index) => (
                  <TableRow
                    key={item.id}
                    className={cn(
                      'hover:bg-blue-50 transition-colors duration-150',
                      selectedItems.includes(item.id) && 'bg-blue-100',
                    )}
                  >
                    <TableCell className="w-12">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => handleSelectItem(item.id)}
                        className="h-4 w-4"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{item.email}</TableCell>
                    <TableCell className="text-sm text-gray-600">{item.phone}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          'text-xs',
                          item.status === 'new'
                            ? 'bg-green-100 text-green-700'
                            : item.status === 'qualified'
                              ? 'bg-blue-100 text-blue-700'
                              : item.status === 'contacted'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-700',
                        )}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      ${item.value.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 w-7">
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="h-8 w-8"
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {selectedItems.length > 0 && (
        <Card className={cn(cardElevation.medium, 'border-l-4 border-blue-500 bg-blue-50')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-800 mb-1">
                  {selectedItems.length} Items Selected
                </h3>
                <div className="text-sm text-blue-600">
                  Total value: $
                  {selectedItems
                    .reduce((sum, id) => {
                      const item = mockBulkData.find(d => d.id === id);
                      return sum + (item?.value || 0);
                    }, 0)
                    .toLocaleString()}
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                  <Mail className="w-4 h-4 mr-2" />
                  Email All
                </Button>
                <Button size="sm" className="bg-green-600 text-white hover:bg-green-700">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
