export const MOCK_LISTINGS = [
  {
    id: 'mock-1',
    title: 'Luxury 4 Bedroom Villa in Camps Bay',
    price: 18500000,
    location: {
      city: 'Cape Town',
      suburb: 'Camps Bay',
      province: 'Western Cape'
    },
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80'
    ],
    propertyDetails: {
      bedrooms: 4,
      bathrooms: 4.5,
      houseAreaM2: 450,
      erfSizeM2: 850
    },
    propertyType: 'house',
    listingType: 'sale',
    status: 'available',
    features: ['Pool', 'Ocean View', 'Double Garage', 'Security Estate', 'Modern Kitchen'],
    description: "Experience world-class living in this architecturally stunning villa. Featuring panoramic ocean views, a rim-flow pool, and expansive entertainment areas. This property defines luxury coastal living.",
    agent: {
      name: 'Sarah van der Merwe',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80'
    },
    featured: true
  },
  {
    id: 'mock-2',
    title: 'Modern 2 Bed Apartment in Sandton City',
    price: 3200000,
    location: {
      city: 'Sandton',
      suburb: 'Sandown',
      province: 'Gauteng'
    },
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80'
    ],
    propertyDetails: {
      bedrooms: 2,
      bathrooms: 2,
      unitSizeM2: 95
    },
    propertyType: 'apartment',
    listingType: 'sale',
    status: 'available',
    features: ['Gym', 'Concierge', 'Underground Parking', 'Backup Generator', 'High Speed Fibre'],
    description: "Perfect for the executive. This sleek apartment offers direct access to Sandton City, premium finishes, and incredible sunset views over the Sandton skyline.",
    agent: {
      name: 'Thabo Mkhize',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80'
    }
  },
  {
    id: 'mock-3',
    title: 'Spacious Family Home in Durban North',
    price: 4500000,
    location: {
      city: 'Durban',
      suburb: 'Durban North',
      province: 'KwaZulu-Natal'
    },
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80'
    ],
    propertyDetails: {
      bedrooms: 5,
      bathrooms: 3,
      houseAreaM2: 380,
      erfSizeM2: 1200
    },
    propertyType: 'house',
    listingType: 'sale',
    status: 'available',
    features: ['Tropical Garden', 'Staff Quarters', 'Large Pool', 'Entertainment Lapa', 'Close to Schools'],
    description: "A true family haven. This solid home features ample accommodation, a lush tropical garden, and a fantastic entertainment area. Walking distance to top schools.",
    agent: {
      name: 'Priya Naidoo',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80'
    }
  },
  {
    id: 'mock-4',
    title: 'Prime Commercial Office Space in Rosebank',
    price: 12500000,
    location: {
      city: 'Johannesburg',
      suburb: 'Rosebank',
      province: 'Gauteng'
    },
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80'
    ],
    propertyDetails: {
      floorAreaM2: 450,
      bathrooms: 4
    },
    propertyType: 'commercial',
    listingType: 'sale',
    status: 'available',
    features: ['A-Grade Office', 'Boardrooms', 'Reception', '24h Security', 'Walking distance to Gautrain'],
    description: "Ideally located A-grade office space in the heart of Rosebank business district. Flexible layout possibilities and excellent transport links.",
    agent: {
      name: 'James Wright',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80'
    }
  },
  {
    id: 'mock-5',
    title: 'Vacant Land in Zimbali Coastal Estate',
    price: 3950000,
    location: {
      city: 'Ballito',
      suburb: 'Zimbali',
      province: 'KwaZulu-Natal'
    },
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80'
    ],
    propertyDetails: {
      erfSizeM2: 1500
    },
    propertyType: 'land',
    listingType: 'sale',
    status: 'available',
    features: ['Forest Views', 'Gated Estate', 'Golf Course Access', 'Beach Access'],
    description: "Build your dream home on this generous stand within South Africa's premier coastal estate. Surrounded by indigenous forest and offering ultimate privacy.",
    agent: {
      name: 'Priya Naidoo',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80'
    }
  },
  {
    id: 'mock-6',
    title: 'Wine Farm in Stellenbosch',
    price: 45000000,
    location: {
      city: 'Stellenbosch',
      suburb: 'Stellenbosch Farms',
      province: 'Western Cape'
    },
    images: [
      'https://images.unsplash.com/photo-1533519828453-61b6c0e5323a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80'
    ],
    propertyDetails: {
      bedrooms: 6,
      bathrooms: 5,
      houseAreaM2: 800,
      landSizeHa: 25
    },
    propertyType: 'farm',
    listingType: 'sale',
    status: 'available',
    features: ['Working Vineyards', 'Historic Manor House', 'Callar', 'Mountain Views', 'Guest Cottages'],
    description: "A rare opportunity to own a boutique wine farm in the Golden Triangle. Includes a lovingly restored manor house, guest cottages and productive vineyards.",
    agent: {
      name: 'Sarah van der Merwe',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80'
    },
    featured: true
  }
];
