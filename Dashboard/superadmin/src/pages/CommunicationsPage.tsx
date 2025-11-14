import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Send,
  Bell,
  Mail,
  Eye,
  Reply,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Paperclip,
  BarChart3,
  Edit,
  Building2,
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import TextInput from '../components/common/TextInput';
import Textarea from '../components/common/Textarea';

const CommunicationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tickets');
  const [selectedTicket, setSelectedTicket] = useState<Record<
    string,
    React.ReactNode
  > | null>(null);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);

  // Communication tabs
  const communicationTabs = [
    {
      id: 'tickets',
      name: 'Support Tickets',
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      id: 'broadcast',
      name: 'Broadcast Messages',
      icon: <Send className="h-4 w-4" />,
    },
    {
      id: 'notifications',
      name: 'System Notifications',
      icon: <Bell className="h-4 w-4" />,
    },
    {
      id: 'templates',
      name: 'Email Templates',
      icon: <Mail className="h-4 w-4" />,
    },
  ];

  // Support tickets data
  const ticketsData: Record<string, React.ReactNode>[] = [
    {
      id: 'TKT-2025-001',
      user: 'John Smith',
      subject: 'Unable to upload property images',
      category: 'Technical',
      status: 'Open',
      priority: 'High',
      assigned: 'Sarah Johnson',
      created: '2025-11-12',
      updated: '2025-11-12 14:30',
    },
    {
      id: 'TKT-2025-002',
      user: 'Cape Town Properties',
      subject: 'Billing discrepancy for premium subscription',
      category: 'Billing',
      status: 'In Progress',
      priority: 'Medium',
      assigned: 'Mike Williams',
      created: '2025-11-11',
      updated: '2025-11-12 10:15',
    },
    {
      id: 'TKT-2025-003',
      user: 'Emma Davis',
      subject: 'How to feature my listing?',
      category: 'General',
      status: 'Resolved',
      priority: 'Low',
      assigned: 'Unassigned',
      created: '2025-11-10',
      updated: '2025-11-11 16:45',
    },
  ];

  const ticketColumns = [
    { key: 'id', title: 'Ticket ID', sortable: true },
    { key: 'user', title: 'User Name', sortable: true },
    { key: 'subject', title: 'Subject', sortable: true },
    { key: 'category', title: 'Category', sortable: true },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={
            value === 'Open'
              ? 'error'
              : value === 'In Progress'
                ? 'warning'
                : value === 'Resolved'
                  ? 'success'
                  : 'default'
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: 'priority',
      title: 'Priority',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={
            value === 'Urgent'
              ? 'error'
              : value === 'High'
                ? 'warning'
                : value === 'Medium'
                  ? 'default'
                  : 'success'
          }
        >
          {value}
        </Badge>
      ),
    },
    { key: 'assigned', title: 'Assigned To', sortable: true },
    { key: 'created', title: 'Created Date', sortable: true },
    { key: 'updated', title: 'Last Updated', sortable: true },
    {
      key: 'actions',
      title: 'Actions',
      render: (_value: unknown, record: Record<string, React.ReactNode>) => (
        <div className="flex space-x-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedTicket(record)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <Reply className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Broadcast messages data
  const broadcastData: Record<string, React.ReactNode>[] = [
    {
      id: 'BRC-2025-001',
      subject: 'New Premium Features Available',
      audience: 'All Users',
      delivery: 'Email, In-app',
      status: 'Sent',
      sent: '2025-11-10',
      opens: '68%',
      clicks: '24%',
    },
    {
      id: 'BRC-2025-002',
      subject: 'Maintenance Window Notice',
      audience: 'Agents',
      delivery: 'Email, SMS',
      status: 'Scheduled',
      sent: '2025-11-15',
      opens: '-',
      clicks: '-',
    },
  ];

  const broadcastColumns = [
    { key: 'id', title: 'Broadcast ID', sortable: true },
    { key: 'subject', title: 'Subject', sortable: true },
    { key: 'audience', title: 'Target Audience', sortable: true },
    { key: 'delivery', title: 'Delivery Method', sortable: true },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge variant={value === 'Sent' ? 'success' : 'warning'}>
          {value}
        </Badge>
      ),
    },
    { key: 'sent', title: 'Sent/Scheduled Date', sortable: true },
    { key: 'opens', title: 'Open Rate', sortable: true },
    { key: 'clicks', title: 'Click Rate', sortable: true },
    {
      key: 'actions',
      title: 'Actions',
      render: () => (
        <div className="flex space-x-1">
          <Button variant="secondary" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // System notifications data
  const notificationSettings = [
    {
      id: 1,
      name: 'User Signup Confirmation',
      enabled: true,
      description: 'Sent when a new user registers',
    },
    {
      id: 2,
      name: 'Listing Approval',
      enabled: true,
      description: 'Sent when a property listing is approved',
    },
    {
      id: 3,
      name: 'Payment Confirmation',
      enabled: true,
      description: 'Sent after successful payment processing',
    },
    {
      id: 4,
      name: 'Subscription Renewal Reminder',
      enabled: true,
      description: 'Sent 7 days before subscription expires',
    },
    {
      id: 5,
      name: 'Featured Listing Expiration',
      enabled: false,
      description: 'Sent 3 days before featured placement ends',
    },
    {
      id: 6,
      name: 'New Lead Notification',
      enabled: true,
      description: 'Sent when a new lead is generated',
    },
  ];

  // Email templates data
  const emailTemplates = [
    {
      id: 1,
      name: 'Welcome Email',
      type: 'Transactional',
      lastModified: '2025-11-01',
    },
    {
      id: 2,
      name: 'Password Reset',
      type: 'Transactional',
      lastModified: '2025-10-28',
    },
    {
      id: 3,
      name: 'Property Listing Approved',
      type: 'Transactional',
      lastModified: '2025-11-05',
    },
    {
      id: 4,
      name: 'Monthly Newsletter',
      type: 'Marketing',
      lastModified: '2025-11-01',
    },
  ];

  return (
    <div className="p-3">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Communications</h1>
            <p className="text-slate-600 text-sm">
              Manage all user communications (support, broadcasts,
              notifications)
            </p>
          </div>
          {activeTab === 'broadcast' && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsComposeModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Compose Message
            </Button>
          )}
          {activeTab === 'templates' && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsTemplateEditorOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Template
            </Button>
          )}
        </div>
      </div>

      {/* Communication Tabs */}
      <div className="card p-3 mb-4">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-6">
            {communicationTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.icon}
                <span className="ml-2">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {/* Support Tickets Tab */}
          {activeTab === 'tickets' && (
            <div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-900">
                  Support Tickets
                </h2>
                <div className="flex flex-wrap gap-1 mt-2 md:mt-0">
                  <select className="text-sm border border-slate-300 rounded-lg px-2 py-1">
                    <option>All Statuses</option>
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                    <option>Closed</option>
                  </select>
                  <select className="text-sm border border-slate-300 rounded-lg px-2 py-1">
                    <option>All Priorities</option>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </div>
              </div>
              <Table
                data={ticketsData}
                columns={ticketColumns}
                loading={false}
              />
            </div>
          )}

          {/* Broadcast Messages Tab */}
          {activeTab === 'broadcast' && (
            <div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-900">
                  Broadcast Messages
                </h2>
                <div className="flex flex-wrap gap-1 mt-2 md:mt-0">
                  <select className="text-sm border border-slate-300 rounded-lg px-2 py-1">
                    <option>All Statuses</option>
                    <option>Sent</option>
                    <option>Scheduled</option>
                    <option>Draft</option>
                  </select>
                </div>
              </div>
              <Table
                data={broadcastData}
                columns={broadcastColumns}
                loading={false}
              />
            </div>
          )}

          {/* System Notifications Tab */}
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">
                System Notifications
              </h2>
              <div className="space-y-3">
                {notificationSettings.map(notification => (
                  <div
                    key={notification.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium text-slate-900">
                        {notification.name}
                      </h3>
                      <p className="text-xs text-slate-600">
                        {notification.description}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="secondary" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <button className="relative inline-flex h-5 w-9 items-center rounded-full bg-blue-500">
                        <span className="inline-block h-3 w-3 transform rounded-full bg-white transition translate-x-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email Templates Tab */}
          {activeTab === 'templates' && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">
                Email Templates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {emailTemplates.map(template => (
                  <div
                    key={template.id}
                    className="card p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-slate-900">
                          {template.name}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">
                          {template.type}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Last modified: {template.lastModified}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsTemplateEditorOpen(true)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title={`Ticket: ${selectedTicket.subject as string}`}
          size="lg"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {/* Conversation Thread */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">
                    Conversation
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between">
                        <p className="font-medium text-slate-900">John Smith</p>
                        <p className="text-xs text-slate-500">
                          2025-11-12 10:30
                        </p>
                      </div>
                      <p className="mt-2 text-slate-700 text-sm">
                        I'm having trouble uploading property images. The system
                        keeps showing an error message.
                      </p>
                      <div className="mt-2 flex items-center text-xs text-slate-500">
                        <Paperclip className="h-3 w-3 mr-1" />
                        <span>screenshot-error.png</span>
                      </div>
                    </div>

                    <div className="p-3 border border-slate-200 rounded-lg">
                      <div className="flex justify-between">
                        <p className="font-medium text-slate-900">
                          Sarah Johnson (Support)
                        </p>
                        <p className="text-xs text-slate-500">
                          2025-11-12 11:15
                        </p>
                      </div>
                      <p className="mt-2 text-slate-700 text-sm">
                        Hi John, I'm looking into this issue for you. Could you
                        please tell me what browser you're using and if you've
                        tried clearing your cache?
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reply Form */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">
                    Reply
                  </h3>
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Type your response here..."
                      rows={3}
                    />
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-1">
                        <Button variant="secondary" size="sm">
                          <Paperclip className="h-4 w-4 mr-1" />
                          Attach File
                        </Button>
                        <select className="text-sm border border-slate-300 rounded-lg px-2 py-1">
                          <option>Insert Quick Reply</option>
                          <option>Common Technical Issue</option>
                          <option>Billing Inquiry</option>
                        </select>
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="secondary" size="sm">
                          Save Draft
                        </Button>
                        <Button variant="primary" size="sm">
                          Send Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="space-y-4">
                {/* User Details */}
                <div className="card p-3">
                  <h3 className="font-medium text-slate-900 mb-2">
                    User Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-slate-500 mr-2" />
                      <span className="text-sm">John Smith</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-slate-500 mr-2" />
                      <span className="text-sm">john.smith@email.com</span>
                    </div>
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 text-slate-500 mr-2" />
                      <span className="text-sm">Individual Seller</span>
                    </div>
                  </div>
                </div>

                {/* Ticket Info */}
                <div className="card p-3">
                  <h3 className="font-medium text-slate-900 mb-2">
                    Ticket Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-slate-500">Ticket ID</p>
                      <p className="text-sm font-medium">
                        {selectedTicket.id as string}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Category</p>
                      <p className="text-sm font-medium">
                        {selectedTicket.category as string}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Status</p>
                      <p className="text-sm font-medium">
                        <Badge
                          variant={
                            selectedTicket.status === 'Open'
                              ? 'error'
                              : selectedTicket.status === 'In Progress'
                                ? 'warning'
                                : selectedTicket.status === 'Resolved'
                                  ? 'success'
                                  : 'default'
                          }
                        >
                          {selectedTicket.status as string}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Priority</p>
                      <p className="text-sm font-medium">
                        <Badge
                          variant={
                            selectedTicket.priority === 'Urgent'
                              ? 'error'
                              : selectedTicket.priority === 'High'
                                ? 'warning'
                                : selectedTicket.priority === 'Medium'
                                  ? 'default'
                                  : 'success'
                          }
                        >
                          {selectedTicket.priority as string}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Assigned To</p>
                      <p className="text-sm font-medium">
                        {selectedTicket.assigned as string}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="card p-3">
                  <h3 className="font-medium text-slate-900 mb-2">Actions</h3>
                  <div className="space-y-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Escalate
                    </Button>
                    <Button variant="success" size="sm" className="w-full">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolve Ticket
                    </Button>
                    <Button variant="secondary" size="sm" className="w-full">
                      <Clock className="h-4 w-4 mr-1" />
                      Add Internal Note
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => setSelectedTicket(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Compose Broadcast Modal */}
      <Modal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
        title="Compose Broadcast Message"
        size="lg"
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Subject
            </label>
            <TextInput placeholder="Enter message subject" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Message Body
            </label>
            <div className="border border-slate-300 rounded-lg h-40 flex items-center justify-center">
              <p className="text-slate-500 text-sm">WYSIWYG Editor</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Target Audience
              </label>
              <select className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option>All Users</option>
                <option>Agents</option>
                <option>Agencies</option>
                <option>Buyers</option>
                <option>Premium Subscribers</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Delivery Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded text-blue-600"
                    defaultChecked
                  />
                  <span className="ml-2 text-sm text-slate-700">Email</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded text-blue-600"
                    defaultChecked
                  />
                  <span className="ml-2 text-sm text-slate-700">
                    In-app Notification
                  </span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="rounded text-blue-600" />
                  <span className="ml-2 text-sm text-slate-700">SMS</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Schedule Send Time
            </label>
            <input
              type="datetime-local"
              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3">
            <Button
              variant="secondary"
              onClick={() => setIsComposeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Send Message
            </Button>
          </div>
        </form>
      </Modal>

      {/* Email Template Editor Modal */}
      <Modal
        isOpen={isTemplateEditorOpen}
        onClose={() => setIsTemplateEditorOpen(false)}
        title="Email Template Editor"
        size="lg"
      >
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Template Name
              </label>
              <TextInput placeholder="Enter template name" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Template Type
              </label>
              <select className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option>Transactional</option>
                <option>Marketing</option>
                <option>Support</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Subject
            </label>
            <TextInput placeholder="Enter email subject" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Template Content
            </label>
            <div className="border border-slate-300 rounded-lg h-52 flex items-center justify-center">
              <p className="text-slate-500 text-sm">
                WYSIWYG Editor with variable support: &#123;user_name&#125;,
                &#123;property_title&#125;, etc.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Available Variables
            </label>
            <div className="flex flex-wrap gap-1">
              <Badge variant="default" size="sm">
                &#123;user_name&#125;
              </Badge>
              <Badge variant="default" size="sm">
                &#123;property_title&#125;
              </Badge>
              <Badge variant="default" size="sm">
                &#123;listing_url&#125;
              </Badge>
              <Badge variant="default" size="sm">
                &#123;company_name&#125;
              </Badge>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3">
            <Button
              variant="secondary"
              onClick={() => setIsTemplateEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Template
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CommunicationsPage;
