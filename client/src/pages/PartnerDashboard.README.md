# Partner Dashboard

A comprehensive dashboard for partners in the Explore Partner Marketplace system, providing analytics overview, content management, and lead tracking capabilities.

## Features

### Analytics Overview (Requirements 13.1, 13.2, 13.5)
- **Key Metrics Cards**: Total views, engagement rate, total leads, lead conversions
- **Performance Trends Chart**: Interactive line chart showing views, engagements, and leads over time
- **Quality Score Display**: Visual representation of content quality with star rating
- **Content Library Stats**: Total published content count

### Content Management (Requirement 13.3)
- **Top Performing Content Table**: Lists content ranked by engagement
- **Content Type Indicators**: Visual icons for videos, cards, and shorts
- **Quality Badges**: Color-coded quality indicators (Excellent, Good, Fair, Needs Improvement)
- **Content Actions**: Dropdown menu with view, edit, and boost options

### Lead Management (Requirements 13.4, 9.5, 9.6)
- **Lead List Table**: Comprehensive lead tracking with contact information
- **Status Management**: Visual status indicators and update capabilities
- **Lead Filtering**: Filter by status (new, contacted, converted, disputed) and type
- **Contact Information**: Email and phone details for each lead
- **Lead Actions**: Status updates, contact options, and dispute handling

### Boost Campaign Analytics (Requirement 13.6)
- **ROI Metrics**: Budget, spend, impressions, clicks, leads, and ROI calculations
- **Campaign Performance**: Visual indicators for positive/negative ROI
- **Campaign Management**: Create new campaigns and track existing ones

## Components

### Main Dashboard (`PartnerDashboard.tsx`)
- **Tabbed Interface**: Organized sections for Overview, Content, Leads, and Campaigns
- **Date Range Filtering**: 7-day, 30-day, and 90-day options
- **Export Functionality**: Data export capabilities
- **Responsive Design**: Mobile-friendly layout

### Sub-Components

#### `AnalyticsOverview`
- Metric cards with trend indicators
- Performance trends chart using Recharts
- Quality score visualization
- Content library statistics

#### `ContentList`
- Sortable table of content performance
- Content type icons and badges
- Quality score indicators
- Action dropdown menus

#### `LeadManagement`
- Filterable lead table
- Status update functionality
- Contact information display
- Lead action management

#### `BoostCampaigns`
- Campaign performance metrics
- ROI calculations and indicators
- Campaign creation interface

## Data Integration

### API Endpoints Used
- `GET /api/partner-analytics/:partnerId/dashboard` - Complete dashboard data
- `GET /api/partner-leads/partner/:partnerId` - Partner leads with filtering
- `PUT /api/partner-leads/:leadId/status` - Update lead status

### Data Types
```typescript
interface PartnerAnalyticsSummary {
  totalViews: number;
  engagementRate: number;
  leadConversions: number;
  totalLeads: number;
  totalContent: number;
  averageQualityScore: number;
}

interface ContentPerformance {
  contentId: string;
  title: string;
  type: 'video' | 'card' | 'short';
  views: number;
  engagements: number;
  engagementRate: number;
  qualityScore: number;
  createdAt: Date;
}

interface Lead {
  id: string;
  type: 'quote_request' | 'consultation' | 'eligibility_check';
  status: 'new' | 'contacted' | 'converted' | 'disputed' | 'refunded';
  price: number;
  contactInfo: ContactInfo;
  intentDetails?: string;
  createdAt: string;
}
```

## UI Components Used

### Core Components
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` - Layout structure
- `Button` - Actions and navigation
- `Badge` - Status and type indicators
- `Table` components - Data display
- `Tabs` - Section organization

### Data Visualization
- `ChartContainer`, `ChartTooltip` - Chart wrapper and tooltips
- `LineChart`, `AreaChart`, `BarChart` - Recharts components
- Custom metric cards with trend indicators

### Interactive Elements
- `DropdownMenu` - Action menus
- `Select` - Filtering and date range selection
- `Tabs` - Section navigation

## Styling

### Design System
- Uses consistent spacing and typography from the design system
- Color-coded status indicators (green for success, red for errors, etc.)
- Responsive grid layouts for different screen sizes
- Hover states and interactive feedback

### Accessibility
- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly content

## Demo Implementation

The `PartnerDashboardDemo.tsx` file provides a complete demo with:
- Mock data for all dashboard sections
- Simulated API responses
- Interactive functionality demonstration
- Realistic data scenarios

## Usage

```tsx
import PartnerDashboard from '@/pages/PartnerDashboard';

// Use in routing
<Route path="/partner/dashboard" component={PartnerDashboard} />

// Or render directly
<PartnerDashboard />
```

## Requirements Mapping

- **13.1**: Analytics overview with total views, engagement rate, lead conversions ✅
- **13.2**: Performance trends over time with interactive charts ✅
- **13.3**: Content ranking by performance with detailed metrics ✅
- **13.4**: Lead conversion funnel and management interface ✅
- **13.5**: Tier benchmark comparisons (integrated in analytics) ✅
- **13.6**: Boost campaign ROI metrics and performance tracking ✅

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live metrics
2. **Advanced Filtering**: More granular filtering options
3. **Export Formats**: PDF and Excel export capabilities
4. **Notification Center**: In-app notifications for new leads
5. **Mobile App**: Native mobile dashboard application
6. **Custom Dashboards**: User-configurable dashboard layouts