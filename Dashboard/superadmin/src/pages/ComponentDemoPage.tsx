import React, { useState } from 'react';
import PageWrapper from '../components/common/PageWrapper';
import StatCard from '../components/common/StatCard';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import TextInput from '../components/common/TextInput';
import Select from '../components/common/Select';
import Textarea from '../components/common/Textarea';
import Modal from '../components/common/Modal';
import Toast from '../components/common/Toast';
import {
  DollarSign,
  TrendingUp,
  Building2,
  Home,
  User,
  Mail,
  Phone,
} from 'lucide-react';

const ComponentDemoPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);
  const [tableLoading, setTableLoading] = useState(false);

  // Mock data for table
  const tableColumns = [
    { key: 'name', title: 'Name', sortable: true },
    { key: 'email', title: 'Email', sortable: true },
    { key: 'role', title: 'Role', sortable: true },
    { key: 'status', title: 'Status', sortable: true },
  ];

  const tableData = [
    {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Admin',
      status: <Badge variant="success">Active</Badge>,
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'User',
      status: <Badge variant="warning">Pending</Badge>,
    },
    {
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'Editor',
      status: <Badge variant="error">Inactive</Badge>,
    },
  ];

  const handleShowToast = (
    variant: 'success' | 'error' | 'warning' | 'info'
  ) => {
    const messages = {
      success: 'Operation completed successfully!',
      error: 'An error occurred while processing your request.',
      warning: 'Please review the information before proceeding.',
      info: 'This is an informational message.',
    };

    setToast({ message: messages[variant], variant });
  };

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    console.log(`Sorting by ${key} in ${direction} order`);
  };

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Component Demo</h1>
        <p className="text-slate-600">Showcase of all reusable components</p>
      </div>

      {/* Stat Cards */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Stat Cards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<DollarSign className="h-6 w-6 text-green-600" />}
            value="R 45,800"
            label="Monthly Revenue"
            trend="up"
            change="+12.5%"
            color="bg-green-100"
          />
          <StatCard
            icon={<Building2 className="h-6 w-6 text-purple-600" />}
            value="127"
            label="Active Agencies"
            trend="up"
            change="+5 this month"
            color="bg-purple-100"
          />
          <StatCard
            icon={<Home className="h-6 w-6 text-cyan-600" />}
            value="1,847"
            label="Active Listings"
            trend="up"
            change="+42 today"
            color="bg-cyan-100"
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6 text-orange-600" />}
            value="8"
            label="Pending Approvals"
            trend="up"
            change="+2 this week"
            color="bg-orange-100"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Buttons</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="success">Success</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>

      {/* Badges */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="default">Default</Badge>
        </div>
      </div>

      {/* Table */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Table</h2>
        <div className="flex gap-2 mb-4">
          <Button onClick={() => setTableLoading(true)}>Load Data</Button>
          <Button onClick={() => setTableLoading(false)}>Show Data</Button>
        </div>
        <Table
          columns={tableColumns}
          data={tableData}
          onSort={handleSort}
          loading={tableLoading}
        />
      </div>

      {/* Form Inputs */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Form Inputs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <TextInput
              label="Name"
              placeholder="Enter your name"
              icon={<User className="h-4 w-4" />}
            />
          </div>
          <div>
            <TextInput
              label="Email"
              placeholder="Enter your email"
              type="email"
              icon={<Mail className="h-4 w-4" />}
            />
          </div>
          <div>
            <TextInput
              label="Phone"
              placeholder="Enter your phone"
              icon={<Phone className="h-4 w-4" />}
            />
          </div>
          <div>
            <Select
              label="Role"
              options={[
                { value: 'admin', label: 'Administrator' },
                { value: 'user', label: 'User' },
                { value: 'editor', label: 'Editor' },
              ]}
            />
          </div>
          <div className="md:col-span-2">
            <Textarea
              label="Message"
              placeholder="Enter your message"
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* Modal */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Modal</h2>
        <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Sample Modal"
        >
          <p className="text-slate-600 mb-4">This is a sample modal content.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>Confirm</Button>
          </div>
        </Modal>
      </div>

      {/* Toasts */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Toasts</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleShowToast('success')}>
            Show Success
          </Button>
          <Button onClick={() => handleShowToast('error')}>Show Error</Button>
          <Button onClick={() => handleShowToast('warning')}>
            Show Warning
          </Button>
          <Button onClick={() => handleShowToast('info')}>Show Info</Button>
        </div>
      </div>

      {/* Toast Container */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast
            message={toast.message}
            variant={toast.variant}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </PageWrapper>
  );
};

export default ComponentDemoPage;
