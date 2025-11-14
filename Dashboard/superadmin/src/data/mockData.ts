// Mock data for HomeFind.za Super Admin Dashboard
export interface PlatformStats {
  totalRevenue: string;
  monthlyRevenue: string;
  activeAgencies: number;
  pendingApprovals: number;
  activeListings: number;
  totalUsers: number;
}

export interface RevenueTrend {
  month: string;
  year: number;
  revenue: string;
  percentageChange: number;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  agencies: number;
  revenue: string;
  color: string;
}

export interface RecentActivity {
  id: number;
  agency: string;
  action: string;
  target: string;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
}

export interface QuickAction {
  id: string;
  title: string;
  count?: number;
  icon: string;
}

// Platform Statistics
export const platformStats: PlatformStats = {
  totalRevenue: 'R 124,500',
  monthlyRevenue: 'R 45,800',
  activeAgencies: 127,
  pendingApprovals: 8,
  activeListings: 1847,
  totalUsers: 3421,
};

// Revenue Trend Data (Last 7 months)
export const revenueTrend: RevenueTrend[] = [
  {
    month: 'May',
    year: 2025,
    revenue: 'R 32,500',
    percentageChange: 5.2,
  },
  {
    month: 'Jun',
    year: 2025,
    revenue: 'R 35,200',
    percentageChange: 8.3,
  },
  {
    month: 'Jul',
    year: 2025,
    revenue: 'R 37,800',
    percentageChange: 7.4,
  },
  {
    month: 'Aug',
    year: 2025,
    revenue: 'R 40,100',
    percentageChange: 6.1,
  },
  {
    month: 'Sep',
    year: 2025,
    revenue: 'R 42,300',
    percentageChange: 5.5,
  },
  {
    month: 'Oct',
    year: 2025,
    revenue: 'R 43,700',
    percentageChange: 3.3,
  },
  {
    month: 'Nov',
    year: 2025,
    revenue: 'R 45,800',
    percentageChange: 4.8,
  },
];

// Subscription Distribution Data
export const subscriptionTiers: SubscriptionTier[] = [
  {
    id: 'basic',
    name: 'Basic',
    agencies: 78,
    revenue: 'R 39,000',
    color: 'bg-blue-500',
  },
  {
    id: 'premium',
    name: 'Premium',
    agencies: 35,
    revenue: 'R 45,465',
    color: 'bg-purple-500',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    agencies: 14,
    revenue: 'R 41,986',
    color: 'bg-cyan-500',
  },
];

// Recent Activity Data
export const recentActivities: RecentActivity[] = [
  {
    id: 1,
    agency: 'PropCity Estates',
    action: 'Agency Registration Approved',
    target: 'New agency registration',
    timestamp: '2025-11-12 14:30',
    status: 'success',
  },
  {
    id: 2,
    agency: 'Cape Town Properties',
    action: 'Subscription Updated',
    target: 'Premium plan renewal',
    timestamp: '2025-11-12 13:45',
    status: 'success',
  },
  {
    id: 3,
    agency: 'Johannesburg Real Estate',
    action: 'Property Listing Approved',
    target: '3 Bed House in Waterfall',
    timestamp: '2025-11-12 11:20',
    status: 'success',
  },
  {
    id: 4,
    agency: 'Durban Homes',
    action: 'New Property Listing',
    target: '2 Bed Apartment in Umhlanga',
    timestamp: '2025-11-12 09:15',
    status: 'pending',
  },
  {
    id: 5,
    agency: 'Pretoria Property Group',
    action: 'Payment Failed',
    target: 'Enterprise plan subscription',
    timestamp: '2025-11-11 16:30',
    status: 'failed',
  },
];

// Quick Actions Data
export const quickActions: QuickAction[] = [
  {
    id: 'review-agencies',
    title: 'Review Agencies',
    count: 8,
    icon: 'building',
  },
  {
    id: 'moderate-listings',
    title: 'Moderate Listings',
    count: 12,
    icon: 'home',
  },
  {
    id: 'manage-plans',
    title: 'Manage Plans',
    icon: 'credit-card',
  },
  {
    id: 'export-data',
    title: 'Export Data',
    icon: 'download',
  },
];

// South African Agency Names for Mock Data
export const southAfricanAgencies = [
  'PropCity Estates',
  'Cape Town Properties',
  'Johannesburg Real Estate',
  'Durban Homes',
  'Pretoria Property Group',
  'Sandton Luxury Living',
  'Stellenbosch Vineyard Properties',
  'Bloemfontein Housing Solutions',
  'Port Elizabeth Coastal Realty',
  'East London Investment Properties',
  'Kimberley Diamond District Properties',
  'Nelspruit Bushveld Estates',
  'Polokwane Northern Properties',
  'Pietermaritzburg Midlands Realty',
  'Mbombela Riverside Properties',
];

// South African Property Types
export const propertyTypes = [
  'House',
  'Apartment',
  'Townhouse',
  'Farm',
  'Commercial',
  'Vacant Land',
  'Sectional Title',
  'Duplex',
];

// South African Cities
export const southAfricanCities = [
  'Johannesburg',
  'Cape Town',
  'Durban',
  'Pretoria',
  'Port Elizabeth',
  'East London',
  'Bloemfontein',
  'Stellenbosch',
  'Sandton',
  'Umhlanga',
  'Waterfall',
  'Fourways',
  'Centurion',
  'Midrand',
];
