
import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { GlassCard } from '@/components/ui/glass-card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Handshake, Plus, Search, Pencil, Trash2, Globe, Mail, Phone, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

type Partner = {
  id: number;
  name: string;
  category: 'mortgage_broker' | 'lawyer' | 'photographer' | 'inspector' | 'mover' | 'other';
  description?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  status: 'active' | 'inactive' | 'pending';
  isVerified: number;
};

const PartnerNetworkPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'other',
    description: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    status: 'active',
    isVerified: false,
  });

  const utils = trpc.useContext();

  const { data, isLoading } = trpc.partners.list.useQuery({
    search: searchTerm,
    category: categoryFilter !== 'all' ? (categoryFilter as any) : undefined,
  });

  const createMutation = trpc.partners.create.useMutation({
    onSuccess: () => {
      toast.success('Partner added successfully');
      setIsAddDialogOpen(false);
      resetForm();
      utils.partners.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.partners.update.useMutation({
    onSuccess: () => {
      toast.success('Partner updated successfully');
      setIsEditDialogOpen(false);
      setSelectedPartner(null);
      resetForm();
      utils.partners.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.partners.delete.useMutation({
    onSuccess: () => {
      toast.success('Partner deleted successfully');
      utils.partners.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'other',
      description: '',
      contactPerson: '',
      email: '',
      phone: '',
      website: '',
      status: 'active',
      isVerified: false,
    });
  };

  const handleEdit = (partner: Partner) => {
    setSelectedPartner(partner);
    setFormData({
      name: partner.name,
      category: partner.category,
      description: partner.description || '',
      contactPerson: partner.contactPerson || '',
      email: partner.email || '',
      phone: partner.phone || '',
      website: partner.website || '',
      status: partner.status,
      isVerified: Boolean(partner.isVerified),
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this partner?')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleSubmit = (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    const payload = {
      ...formData,
      category: formData.category as any,
      status: formData.status as any,
    };

    if (isEdit && selectedPartner) {
      updateMutation.mutate({
        id: selectedPartner.id,
        data: payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const CATEGORIES = [
    { value: 'mortgage_broker', label: 'Mortgage Broker' },
    { value: 'lawyer', label: 'Lawyer / Conveyancer' },
    { value: 'photographer', label: 'Photographer' },
    { value: 'inspector', label: 'Home Inspector' },
    { value: 'mover', label: 'Moving Company' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Handshake className="h-8 w-8 text-primary" />
            Partner Network
          </h1>
          <p className="text-slate-500">Manage service providers and strategic partners.</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Partner
        </Button>
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search partners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500">Loading partners...</div>
        ) : data?.partners.length === 0 ? (
          <div className="py-12 text-center text-slate-500">No partners found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.partners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{partner.name}</span>
                      {partner.isVerified ? (
                        <Badge variant="secondary" className="w-fit text-[10px] mt-1 bg-blue-100 text-blue-700 hover:bg-blue-100">Verified</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {partner.category.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm text-slate-600">
                      {partner.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {partner.email}
                        </div>
                      )}
                      {partner.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {partner.phone}
                        </div>
                      )}
                      {partner.website && (
                        <a
                          href={partner.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Globe className="h-3 w-3" /> Website <ExternalLink className="h-2 w-2" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        partner.status === 'active'
                          ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : partner.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                      }
                    >
                      {partner.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(partner as any)}>
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(partner.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Partner</DialogTitle>
            <DialogDescription>Add a strategic partner to the network.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
            <div>
              <Label>Partner Name</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Website</Label>
              <Input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isLoading}>
                {createMutation.isLoading ? 'Creating...' : 'Create Partner'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Partner</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
            <div>
              <Label>Partner Name</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="verified"
                  className="rounded border-gray-300"
                  checked={formData.isVerified}
                  onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                />
                <Label htmlFor="verified">Verified Partner</Label>
              </div>
            </div>
            <div>
              <Label>Website</Label>
              <Input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isLoading}>
                {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerNetworkPage;
