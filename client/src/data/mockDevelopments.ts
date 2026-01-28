import { DevelopmentCardProps } from '@/components/DevelopmentCard';

export const mockDevelopments: DevelopmentCardProps[] = [
  {
    id: 'dev-1',
    title: 'The Polofields',
    rating: 4.8,
    location: 'Waterfall Estate, Midrand',
    description:
      'Luxury apartments with world-class amenities including a lifestyle center, gym, pool, and concierge service. Experience the epitome of modern living in the heart of Waterfall.',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop',
    unitTypes: [
      { bedrooms: 2, label: '2 Bed Luxury', priceFrom: 2200000 },
      { bedrooms: 3, label: '3 Bed Penthouse', priceFrom: 3500000 },
    ],
    highlights: ['Lifestyle Center', 'Gym', 'Pool', 'Concierge', 'Spa'],
    developer: { name: 'Balwin Properties', isFeatured: true },
    imageCount: 24,
    isFeatured: true,
    isNewBooking: true,
  },
  {
    id: 'dev-2',
    title: 'Steyn City - City Centre',
    rating: 4.9,
    location: 'Steyn City, Midrand',
    description:
      'Urban living redefined. The City Centre offers pedestrian-friendly piazzas, high-end retail, and luxury apartments with breathtaking views of the parklands.',
    image:
      'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&auto=format&fit=crop',
    unitTypes: [
      { bedrooms: 1, label: '1 Bed Apartment', priceFrom: 1800000 },
      { bedrooms: 2, label: '2 Bed Apartment', priceFrom: 2900000 },
      { bedrooms: 3, label: '3 Bed Apartment', priceFrom: 4500000 },
      { bedrooms: 4, label: '4 Bed Penthouse', priceFrom: 8500000 },
      { bedrooms: 2, label: '2 Bed Garden', priceFrom: 3200000 },
      { bedrooms: 3, label: '3 Bed Duplex', priceFrom: 5100000 },
      { bedrooms: 1, label: 'Studio Loft', priceFrom: 1600000 },
      { bedrooms: 5, label: 'Sky Villa', priceFrom: 12500000 },
    ],
    highlights: ['Golf Course', 'Lagoon', 'Equestrian Center', 'School', 'Restaurants'],
    developer: { name: 'Steyn City Properties', isFeatured: true },
    imageCount: 35,
    isFeatured: true,
    isNewBooking: false,
  },
  {
    id: 'dev-3',
    title: 'Ellipse Waterfall',
    rating: 4.7,
    location: 'Waterfall City, Midrand',
    description:
      'Iconic high-rise living in the heart of Waterfall City. Ellipse offers executive apartments with sleek finishes and panoramic views of the Gauteng skyline.',
    image:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop',
    unitTypes: [
      { bedrooms: 1, label: 'Executive 1 Bed', priceFrom: 1500000 },
      { bedrooms: 2, label: 'Luxury 2 Bed', priceFrom: 2800000 },
    ],
    highlights: ['High-rise', 'Sky Bar', 'Business Center', 'Concierge', 'Secure Parking'],
    developer: { name: 'Attacq & Tricolt', isFeatured: false },
    imageCount: 18,
    isFeatured: false,
    isNewBooking: true,
  },
  {
    id: 'dev-4',
    title: 'Red Ivory Lane',
    rating: 4.5,
    location: 'Modderfontein, Johannesburg',
    description:
      'Contemporary apartments nestled in the tranquility of Modderfontein. Enjoy spacious living areas, modern kitchens, and access to the nature reserve.',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop',
    unitTypes: [
      { bedrooms: 1, label: '1 Bed Unit', priceFrom: 950000 },
      { bedrooms: 2, label: '2 Bed Unit', priceFrom: 1350000 },
    ],
    highlights: ['Nature Reserve', 'Gas Braai', 'Clubhouse', 'Pool', 'Smart Metering'],
    developer: { name: 'M&T Development', isFeatured: false },
    imageCount: 12,
    isFeatured: false,
    isNewBooking: false,
  },
  {
    id: 'dev-5',
    title: 'The Blyde',
    rating: 4.6,
    location: 'Pretoria East, Pretoria',
    description:
      "A water-lover's paradise. The Blyde features the first Crystal Lagoon in Sub-Saharan Africa, offering a beach lifestyle in Pretoria.",
    image:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop',
    unitTypes: [
      { bedrooms: 1, label: '1 Bed Apartment', priceFrom: 1050000 },
      { bedrooms: 2, label: '2 Bed Apartment', priceFrom: 1650000 },
      { bedrooms: 3, label: '3 Bed Apartment', priceFrom: 2100000 },
    ],
    highlights: ['Crystal Lagoon', 'Beach', 'Cinema', 'Gym', 'Restaurant'],
    developer: { name: 'Balwin Properties', isFeatured: true },
    imageCount: 28,
    isFeatured: true,
    isNewBooking: false,
  },
];
