/**
 * Mock Data Service for Testing
 * Provides sample data without requiring database setup
 */

export const mockProperties = [
  {
    id: 1,
    title: 'Modern Family Home',
    description: 'Beautiful 4-bedroom family home in secure estate with garden and pool',
    propertyType: 'house',
    listingType: 'sale',
    transactionType: 'sale',
    price: 2500000,
    bedrooms: 4,
    bathrooms: 3,
    area: 280,
    address: '45 Oak Street, Sandown Estate',
    city: 'Johannesburg',
    province: 'Gauteng',
    zipCode: '2196',
    latitude: '-26.1076',
    longitude: '28.0567',
    amenities: JSON.stringify(['Swimming Pool', 'Garden', 'Security', 'Parking']),
    yearBuilt: 2018,
    status: 'available',
    featured: 1,
    views: 234,
    enquiries: 12,
    agentId: 1,
    developmentId: null,
    ownerId: 1,
    propertySettings: null,
    videoUrl: null,
    virtualTourUrl: null,
    levies: 1500,
    ratesAndTaxes: 2500,
    mainImage: '/properties/35t5znQJ1v9V.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    title: 'Luxury Apartment',
    description: 'Stunning apartment with city views and modern amenities',
    propertyType: 'apartment',
    listingType: 'sale',
    transactionType: 'sale',
    price: 1800000,
    bedrooms: 3,
    bathrooms: 2,
    area: 180,
    address: '123 Marine Drive, Sea Point',
    city: 'Cape Town',
    province: 'Western Cape',
    zipCode: '8005',
    latitude: '-33.9077',
    longitude: '18.3834',
    amenities: JSON.stringify(['Balcony', 'City Views', 'Parking', 'Pool']),
    yearBuilt: 2020,
    status: 'available',
    featured: 1,
    views: 187,
    enquiries: 8,
    agentId: 1,
    developmentId: null,
    ownerId: 1,
    propertySettings: null,
    videoUrl: null,
    virtualTourUrl: null,
    levies: null,
    ratesAndTaxes: 1800,
    mainImage: '/properties/40O7UI0lbxUn.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    title: 'Townhouse for Rent',
    description: 'Cozy 2-bedroom townhouse in quiet neighborhood',
    propertyType: 'townhouse',
    listingType: 'rent',
    transactionType: 'rent',
    price: 25000,
    bedrooms: 2,
    bathrooms: 2,
    area: 120,
    address: '78 Garden Avenue, Rosebank',
    city: 'Johannesburg',
    province: 'Gauteng',
    zipCode: '2196',
    latitude: '-26.1497',
    longitude: '28.0457',
    amenities: JSON.stringify(['Garden', 'Parking', 'Pet Friendly']),
    yearBuilt: 2015,
    status: 'available',
    featured: 0,
    views: 156,
    enquiries: 5,
    agentId: 2,
    developmentId: null,
    ownerId: 1,
    propertySettings: null,
    videoUrl: null,
    virtualTourUrl: null,
    levies: null,
    ratesAndTaxes: null,
    mainImage: '/properties/cb6IeI4pBCAG.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const mockProspect = {
  id: 1,
  sessionId: 'prospect_x05sorl4tycmhkxnz72',
  email: null,
  phone: null,
  income: null,
  incomeRange: null,
  employmentStatus: null,
  combinedIncome: null,
  monthlyExpenses: null,
  monthlyDebts: null,
  dependents: 0,
  savingsDeposit: null,
  creditScore: null,
  hasCreditConsent: 0,
  buyabilityScore: null,
  affordabilityMin: null,
  affordabilityMax: null,
  monthlyPaymentCapacity: null,
  profileProgress: 0,
  badges: null,
  lastActivity: new Date(),
  preferredPropertyType: null,
  preferredLocation: null,
  maxCommuteTime: null,
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  referrer: 'direct',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockAgencies = [
  {
    id: 1,
    name: 'Premium Properties SA',
    slug: 'premium-properties-sa',
    description: 'Leading real estate agency in South Africa',
    logo: '/logos/premium-properties.png',
    website: 'https://premiumproperties.co.za',
    email: 'info@premiumproperties.co.za',
    phone: '+27 11 123 4567',
    address: '123 Main Street, Sandown',
    city: 'Johannesburg',
    province: 'Gauteng',
    subscriptionPlan: 'premium',
    subscriptionStatus: 'active',
    subscriptionExpiry: new Date('2025-12-31'),
    isVerified: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const mockAgents = [
  {
    id: 1,
    userId: 1,
    agencyId: 1,
    firstName: 'Sarah',
    lastName: 'Johnson',
    displayName: 'Sarah Johnson',
    bio: 'Experienced real estate agent specializing in luxury properties',
    profileImage: '/agents/sarah-johnson.jpg',
    phone: '+27 82 123 4567',
    email: 'sarah@premiumproperties.co.za',
    whatsapp: '+27821234567',
    specialization: JSON.stringify(['Luxury Properties', 'Investment Properties']),
    role: 'agent',
    licenseNumber: 'REA-001',
    yearsExperience: 8,
    areasServed: JSON.stringify(['Sandton', 'Rosebank', 'Hyde Park']),
    languages: JSON.stringify(['English', 'Afrikaans']),
    rating: 4.8,
    reviewCount: 127,
    totalSales: 45,
    isVerified: 1,
    isFeatured: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export function getMockProperties(filters: any = {}) {
  let filtered = [...mockProperties];

  if (filters.province) {
    filtered = filtered.filter(p => p.province === filters.province);
  }

  if (filters.listingType) {
    filtered = filtered.filter(p => p.listingType === filters.listingType);
  }

  if (filters.propertyType) {
    filtered = filtered.filter(p => p.propertyType === filters.propertyType);
  }

  if (filters.minPrice) {
    filtered = filtered.filter(p => p.price >= filters.minPrice);
  }

  if (filters.maxPrice) {
    filtered = filtered.filter(p => p.price <= filters.maxPrice);
  }

  if (filters.limit) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}

export function getMockProspects(sessionId: string) {
  return mockProspect.sessionId === sessionId ? mockProspect : null;
}

export function getMockRecentlyViewed(sessionId: string) {
  // Mock recently viewed properties
  return [];
}

export function getMockProspectFavorites(sessionId: string) {
  // Mock prospect favorites
  return [];
}
