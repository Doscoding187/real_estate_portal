import React, { useState } from 'react';
import {
  Plus,
  Edit,
  Eye,
  Copy,
  Trash2,
  Search,
  BarChart3,
  ExternalLink,
  Link,
  Hash,
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import TextInput from '../components/common/TextInput';

const ContentManagerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('blog');
  const [selectedContent, setSelectedContent] = useState<Record<
    string,
    React.ReactNode
  > | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Content types
  const contentTypes = [
    { id: 'blog', name: 'Blog Posts' },
    { id: 'announcements', name: 'Announcements' },
    { id: 'guides', name: 'Educational Guides' },
    { id: 'press', name: 'Press Releases' },
    { id: 'faq', name: 'FAQ' },
  ];

  // Content table data
  const contentData: Record<string, React.ReactNode>[] = [
    {
      id: 1,
      title: 'Top 10 Areas to Invest in South Africa 2025',
      type: 'Blog Post',
      author: 'Sarah Johnson',
      status: 'Published',
      published: '2025-11-01',
      views: 2450,
      engagement: '142 likes, 24 shares, 36 comments',
      seo: '87%',
      category: 'Investment',
    },
    {
      id: 2,
      title: 'New Property Regulations Effective January 2026',
      type: 'Announcement',
      author: 'Mike Williams',
      status: 'Published',
      published: '2025-11-05',
      views: 3120,
      engagement: '89 likes, 15 shares, 22 comments',
      seo: '92%',
      category: 'Regulations',
    },
    {
      id: 3,
      title: 'Complete Guide to Buying Your First Home',
      type: 'Educational Guide',
      author: 'Emma Davis',
      status: 'Draft',
      published: '-',
      views: 0,
      engagement: '0 likes, 0 shares, 0 comments',
      seo: '0%',
      category: 'Buying Process',
    },
    {
      id: 4,
      title: 'HomeFind.za Q3 2025 Performance Report',
      type: 'Press Release',
      author: 'James Wilson',
      status: 'Scheduled',
      published: '2025-11-15',
      views: 0,
      engagement: '0 likes, 0 shares, 0 comments',
      seo: '78%',
      category: 'Company News',
    },
  ];

  const contentColumns = [
    { key: 'title', title: 'Title', sortable: true },
    { key: 'type', title: 'Type', sortable: true },
    { key: 'author', title: 'Author', sortable: true },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={
            value === 'Published'
              ? 'success'
              : value === 'Draft'
                ? 'default'
                : 'warning'
          }
        >
          {value}
        </Badge>
      ),
    },
    { key: 'published', title: 'Published Date', sortable: true },
    { key: 'views', title: 'Views', sortable: true },
    { key: 'engagement', title: 'Engagement', sortable: true },
    {
      key: 'seo',
      title: 'SEO Score',
      sortable: true,
      render: (value: string) => {
        const score = parseInt(value);
        return (
          <div className="flex items-center">
            <span className="mr-2 text-sm">{value}</span>
            <div className="w-16 bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  score >= 80
                    ? 'bg-green-500'
                    : score >= 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${score}%` }}
              ></div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: unknown, record: Record<string, React.ReactNode>) => (
        <div className="flex space-x-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedContent(record)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="danger" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // SEO Performance data
  const seoPerformance = {
    keywords: [
      { keyword: 'property investment south africa', ranking: 3, volume: 1240 },
      { keyword: 'buy first home south africa', ranking: 5, volume: 2100 },
      { keyword: 'real estate market trends 2025', ranking: 12, volume: 890 },
    ],
    traffic: 5420,
    backlinks: 24,
    shares: 89,
    timeOnPage: '3m 24s',
  };

  return (
    <div className="p-3">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Content Manager
            </h1>
            <p className="text-slate-600 text-sm">
              Manage blog, announcements, and educational content
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsEditorOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Content
          </Button>
        </div>
      </div>

      {/* Content Types Tabs */}
      <div className="card p-3 mb-4">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            {contentTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setActiveTab(type.id)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === type.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {type.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Search and Filters */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="w-full md:w-60">
            <TextInput
              placeholder="Search content..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4 text-slate-400" />}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <select className="text-sm border border-slate-300 rounded-lg px-2 py-1">
              <option>All Statuses</option>
              <option>Draft</option>
              <option>Published</option>
              <option>Scheduled</option>
            </select>
            <select className="text-sm border border-slate-300 rounded-lg px-2 py-1">
              <option>All Authors</option>
              <option>Sarah Johnson</option>
              <option>Mike Williams</option>
              <option>Emma Davis</option>
            </select>
          </div>
        </div>

        {/* Content Table */}
        <div className="mt-4">
          <Table data={contentData} columns={contentColumns} loading={false} />
        </div>
      </div>

      {/* Content Details Modal */}
      {selectedContent && (
        <Modal
          isOpen={!!selectedContent}
          onClose={() => setSelectedContent(null)}
          title={selectedContent.title as string}
          size="lg"
        >
          <div className="space-y-4">
            {/* Content Info */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Content Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Title</p>
                  <p className="font-bold text-slate-900">
                    {selectedContent.title as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Type</p>
                  <p className="font-bold text-slate-900">
                    {selectedContent.type as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Author</p>
                  <p className="font-bold text-slate-900">
                    {selectedContent.author as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Status</p>
                  <p className="font-bold text-slate-900">
                    <Badge
                      variant={
                        selectedContent.status === 'Published'
                          ? 'success'
                          : selectedContent.status === 'Draft'
                            ? 'default'
                            : 'warning'
                      }
                    >
                      {selectedContent.status as string}
                    </Badge>
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Published Date</p>
                  <p className="font-bold text-slate-900">
                    {selectedContent.published as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Category</p>
                  <p className="font-bold text-slate-900">
                    {selectedContent.category as string}
                  </p>
                </div>
              </div>
            </div>

            {/* SEO Performance */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                SEO Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="card p-3">
                  <div className="flex items-center">
                    <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
                    <p className="text-sm text-slate-600">Organic Traffic</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {seoPerformance.traffic.toLocaleString()}
                  </p>
                </div>
                <div className="card p-3">
                  <div className="flex items-center">
                    <Link className="h-5 w-5 text-green-500 mr-2" />
                    <p className="text-sm text-slate-600">Backlinks</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {seoPerformance.backlinks}
                  </p>
                </div>
                <div className="card p-3">
                  <div className="flex items-center">
                    <Hash className="h-5 w-5 text-purple-500 mr-2" />
                    <p className="text-sm text-slate-600">Social Shares</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {seoPerformance.shares}
                  </p>
                </div>
              </div>

              <div className="card p-3">
                <h4 className="font-medium text-slate-900 mb-2">
                  Keyword Rankings
                </h4>
                <div className="space-y-2">
                  {seoPerformance.keywords.map((keyword, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 border border-slate-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-slate-900 text-sm">
                          {keyword.keyword}
                        </p>
                        <p className="text-xs text-slate-600">
                          Monthly Volume: {keyword.volume}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <Badge variant="success" size="sm">
                          #{keyword.ranking}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Engagement Metrics */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Engagement Metrics
              </h3>
              <div className="card p-3">
                <p className="text-sm text-slate-600 mb-1">Engagement</p>
                <p className="font-bold text-slate-900">
                  {selectedContent.engagement as string}
                </p>
                <p className="text-sm text-slate-600 mt-2">Time on Page</p>
                <p className="font-bold text-slate-900">
                  {seoPerformance.timeOnPage}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
              <Button variant="primary" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit Content
              </Button>
              <Button variant="secondary" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
              <Button variant="secondary" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                View Live
              </Button>
              <Button variant="danger" size="sm">
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setSelectedContent(null)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Content Editor Modal */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title="Create New Content"
        size="lg"
      >
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Title
              </label>
              <TextInput placeholder="Enter content title" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Slug (URL)
              </label>
              <TextInput placeholder="auto-generated-from-title" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Content
            </label>
            <div className="border border-slate-300 rounded-lg h-56 flex items-center justify-center">
              <p className="text-slate-500">WYSIWYG Editor</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Featured Image
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg h-28 flex items-center justify-center">
                <p className="text-slate-500 text-sm">Upload Image</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option>Select Category</option>
                  <option>Investment</option>
                  <option>Buying Process</option>
                  <option>Regulations</option>
                  <option>Market Trends</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tags
                </label>
                <TextInput placeholder="Add tags (comma separated)" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Meta Description (SEO)
            </label>
            <textarea
              rows={3}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Enter meta description for SEO..."
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Schedule Publishing
              </label>
              <input
                type="date"
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Target Audience
              </label>
              <select className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option>All Users</option>
                <option>Agents</option>
                <option>Buyers</option>
                <option>Sellers</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3">
            <Button variant="secondary" onClick={() => setIsEditorOpen(false)}>
              Save as Draft
            </Button>
            <Button variant="primary" type="submit">
              Publish
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ContentManagerPage;
