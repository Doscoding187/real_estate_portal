import { useState } from 'react';
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
import {
  ExternalLink,
  Globe,
  Handshake,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

type VerificationStatus = 'pending' | 'verified' | 'rejected';

type Partner = {
  id: number;
  userId: number;
  companyName: string;
  description: string | null;
  verificationStatus: VerificationStatus | null;
  trustScore: string | null;
  approvedContentCount: number | null;
  rating: string | null;
  reviewCount: number | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type PartnerFormState = {
  userId: string;
  companyName: string;
  description: string;
  verificationStatus: VerificationStatus;
  websiteUrl: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
};

const emptyForm: PartnerFormState = {
  userId: '',
  companyName: '',
  description: '',
  verificationStatus: 'pending',
  websiteUrl: '',
  contactEmail: '',
  contactPhone: '',
  isActive: true,
};

export default function PartnerNetworkPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState<PartnerFormState>(emptyForm);

  const utils = trpc.useContext();

  const { data, isLoading } = trpc.partners.list.useQuery({
    page: 1,
    limit: 50,
    search: searchTerm || undefined,
  });

  const createMutation = trpc.partners.create.useMutation({
    onSuccess: async () => {
      toast.success('Partner added successfully');
      setIsAddDialogOpen(false);
      setFormData(emptyForm);
      await utils.partners.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const updateMutation = trpc.partners.update.useMutation({
    onSuccess: async () => {
      toast.success('Partner updated successfully');
      setIsEditDialogOpen(false);
      setSelectedPartner(null);
      setFormData(emptyForm);
      await utils.partners.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const deleteMutation = trpc.partners.delete.useMutation({
    onSuccess: async () => {
      toast.success('Partner deleted successfully');
      await utils.partners.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const openCreateDialog = () => {
    setFormData(emptyForm);
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (partner: Partner) => {
    setSelectedPartner(partner);
    setFormData({
      userId: String(partner.userId),
      companyName: partner.companyName,
      description: partner.description ?? '',
      verificationStatus: partner.verificationStatus ?? 'pending',
      websiteUrl: partner.websiteUrl ?? '',
      contactEmail: partner.contactEmail ?? '',
      contactPhone: partner.contactPhone ?? '',
      isActive: partner.isActive === 1,
    });
    setIsEditDialogOpen(true);
  };

  const submitCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    createMutation.mutate({
      userId: Number(formData.userId),
      companyName: formData.companyName,
      description: formData.description,
      verificationStatus: formData.verificationStatus,
      websiteUrl: formData.websiteUrl,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone,
      isActive: formData.isActive,
    });
  };

  const submitUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPartner) return;

    updateMutation.mutate({
      id: selectedPartner.id,
      data: {
        userId: Number(formData.userId),
        companyName: formData.companyName,
        description: formData.description,
        verificationStatus: formData.verificationStatus,
        websiteUrl: formData.websiteUrl,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        isActive: formData.isActive,
      },
    });
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this Partner identity?')) {
      deleteMutation.mutate({ id });
    }
  };

  const partnerRows = (data?.partners ?? []) as Partner[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Handshake className="h-8 w-8 text-primary" />
            Service Partner Network
          </h1>
          <p className="mt-1 text-slate-500">
            Manage canonical Service Partner business identities.
          </p>
        </div>

        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Partner
        </Button>
      </div>

      <GlassCard className="p-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by company or contact email..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500">Loading partners...</div>
        ) : partnerRows.length === 0 ? (
          <div className="py-12 text-center text-slate-500">No partners found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Operational state</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {partnerRows.map(partner => (
                <TableRow key={partner.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{partner.companyName}</span>
                      <span className="text-xs text-slate-500">
                        Trust score: {partner.trustScore ?? '50.00'}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>User #{partner.userId}</TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm text-slate-600">
                      {partner.contactEmail ? (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {partner.contactEmail}
                        </div>
                      ) : null}

                      {partner.contactPhone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {partner.contactPhone}
                        </div>
                      ) : null}

                      {partner.websiteUrl ? (
                        <a
                          href={partner.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Globe className="h-3 w-3" />
                          Website
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        partner.verificationStatus === 'verified'
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : partner.verificationStatus === 'rejected'
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-yellow-200 bg-yellow-50 text-yellow-700'
                      }
                    >
                      {partner.verificationStatus ?? 'pending'}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={
                        partner.isActive === 1
                          ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                      }
                    >
                      {partner.isActive === 1 ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(partner)}
                        aria-label={`Edit ${partner.companyName}`}
                      >
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(partner.id)}
                        aria-label={`Delete ${partner.companyName}`}
                      >
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

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Service Partner</DialogTitle>
            <DialogDescription>
              Create a business identity linked to an existing platform user.
            </DialogDescription>
          </DialogHeader>

          <PartnerForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={submitCreate}
            submitLabel="Create Partner"
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Service Partner</DialogTitle>
            <DialogDescription>
              Update the canonical business identity and verification state.
            </DialogDescription>
          </DialogHeader>

          <PartnerForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={submitUpdate}
            submitLabel="Save Changes"
            isSubmitting={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PartnerForm({
  formData,
  setFormData,
  onSubmit,
  submitLabel,
  isSubmitting,
}: {
  formData: PartnerFormState;
  setFormData: React.Dispatch<React.SetStateAction<PartnerFormState>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  isSubmitting: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="partner-user-id">Owner user ID</Label>
        <Input
          id="partner-user-id"
          type="number"
          min={1}
          required
          value={formData.userId}
          onChange={event =>
            setFormData(current => ({
              ...current,
              userId: event.target.value,
            }))
          }
        />
      </div>

      <div>
        <Label htmlFor="partner-company-name">Company name</Label>
        <Input
          id="partner-company-name"
          required
          value={formData.companyName}
          onChange={event =>
            setFormData(current => ({
              ...current,
              companyName: event.target.value,
            }))
          }
        />
      </div>

      <div>
        <Label htmlFor="partner-contact-email">Contact email</Label>
        <Input
          id="partner-contact-email"
          type="email"
          value={formData.contactEmail}
          onChange={event =>
            setFormData(current => ({
              ...current,
              contactEmail: event.target.value,
            }))
          }
        />
      </div>

      <div>
        <Label htmlFor="partner-contact-phone">Contact phone</Label>
        <Input
          id="partner-contact-phone"
          value={formData.contactPhone}
          onChange={event =>
            setFormData(current => ({
              ...current,
              contactPhone: event.target.value,
            }))
          }
        />
      </div>

      <div>
        <Label htmlFor="partner-website-url">Website URL</Label>
        <Input
          id="partner-website-url"
          type="url"
          value={formData.websiteUrl}
          onChange={event =>
            setFormData(current => ({
              ...current,
              websiteUrl: event.target.value,
            }))
          }
        />
      </div>

      <div>
        <Label htmlFor="partner-verification-status">Verification status</Label>
        <Select
          value={formData.verificationStatus}
          onValueChange={(value: VerificationStatus) =>
            setFormData(current => ({
              ...current,
              verificationStatus: value,
            }))
          }
        >
          <SelectTrigger id="partner-verification-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="partner-description">Description</Label>
        <Textarea
          id="partner-description"
          value={formData.description}
          onChange={event =>
            setFormData(current => ({
              ...current,
              description: event.target.value,
            }))
          }
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={formData.isActive}
          onChange={event =>
            setFormData(current => ({
              ...current,
              isActive: event.target.checked,
            }))
          }
        />
        Active business identity
      </label>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
