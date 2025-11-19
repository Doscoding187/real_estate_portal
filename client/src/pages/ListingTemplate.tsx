import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MapPin,
  Bed,
  Bath,
  Maximize,
  Heart,
  Share2,
  Calendar,
  Car,
  TreePine,
  ShieldCheck,
  Baby,
  ShoppingCart,
  Bus,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Sample property data based on the provided JSON
const sampleProperty = {
  id: 'prop-001',
  title: '2 Bedroom Apartment in Riverlea View',
  description:
    "A modern 2-bedroom apartment located in a secure lifestyle estate featuring landscaped gardens, children's play areas, and close proximity to major transport routes and shopping centers.",
  price: 695000,
  location: {
    address: 'Riverlea View, Johannesburg South, Gauteng',
    latitude: -26.2095,
    longitude: 27.9812,
  },
  media: {
    photos: [
      '/images/sample/property-1.jpg',
      '/images/sample/property-1b.jpg',
      '/images/sample/property-1c.jpg',
    ],
    videos: [],
  },
  specs: {
    bedrooms: 2,
    bathrooms: 1,
    parking: 1,
    floorSize: 58,
    unitType: 'Apartment',
    petFriendly: true,
  },
  amenities: {
    indoor: ['Open-plan kitchen', 'Built-in cupboards'],
    outdoor: ['Kids play area', 'Landscaped gardens'],
    security: ['24/7 Security', 'Biometric access', 'Electric fencing'],
  },
  developer: {
    name: 'Cosmopolitan Projects',
    logo: '/images/sample/cosmo-logo.png',
  },
  agent: {
    name: 'Samantha Nkosi',
    phone: '+27 82 123 4567',
    email: 'samantha@newhomes.co.za',
    photo: '/images/sample/agent-samantha.jpg',
  },
  mortgage: {
    repaymentEstimate: 6200,
    interestRate: 11.75,
    loanTermYears: 30,
  },
  areaInsights: {
    schoolsNearby: 4,
    shoppingCentersNearby: 3,
    transportScore: 8,
    safetyScore: 7,
  },
  similarListings: [
    {
      id: 'prop-002',
      title: '2 Bedroom Unit in Kibler Park',
      price: 715000,
      photos: ['/images/sample/property-2.jpg'],
    },
    {
      id: 'prop-003',
      title: '3 Bedroom Apartment in Naturena',
      price: 795000,
      photos: ['/images/sample/property-3.jpg'],
    },
  ],
};

export default function ListingTemplate() {
  const property = sampleProperty;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with listing wizard link */}
      <div className="bg-primary text-primary-foreground py-4">
        <div className="container flex justify-between items-center">
          <h1 className="text-xl font-bold">Property Listing Template</h1>
          <Link href="/listings/create">
            <Button variant="secondary" className="font-semibold">
              Create Your Listing
            </Button>
          </Link>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="rounded-lg overflow-hidden">
              {property.media.photos.length > 0 ? (
                <img
                  src={property.media.photos[0]}
                  alt={property.title}
                  className="w-full h-[500px] object-cover"
                />
              ) : (
                <div className="w-full h-[500px] bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">No Image Available</span>
                </div>
              )}
            </div>

            {property.media.photos.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {property.media.photos.slice(0, 4).map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Property ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  />
                ))}
              </div>
            )}

            {/* Property Details */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl mb-2">{property.title}</CardTitle>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-5 w-5" />
                      <span>{property.location.address}</span>
                    </div>
                  </div>
                  <Badge variant="secondary">Featured</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 py-4 border-y">
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{property.specs.bedrooms}</span>
                    <span className="text-sm text-muted-foreground">Bedrooms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{property.specs.bathrooms}</span>
                    <span className="text-sm text-muted-foreground">Bathrooms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{property.specs.parking}</span>
                    <span className="text-sm text-muted-foreground">Parking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Maximize className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{property.specs.floorSize}</span>
                    <span className="text-sm text-muted-foreground">m²</span>
                  </div>
                </div>

                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-3">Description</h2>
                  <p className="text-muted-foreground leading-relaxed">{property.description}</p>
                </div>

                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-3">Features & Amenities</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Security
                      </h3>
                      <ul className="space-y-1">
                        {property.amenities.security.map((item, index) => (
                          <li
                            key={index}
                            className="text-sm text-muted-foreground flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <TreePine className="h-4 w-4" />
                        Outdoor
                      </h3>
                      <ul className="space-y-1">
                        {property.amenities.outdoor.map((item, index) => (
                          <li
                            key={index}
                            className="text-sm text-muted-foreground flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <Baby className="h-4 w-4" />
                        Family Friendly
                      </h3>
                      <ul className="space-y-1">
                        {property.amenities.indoor.map((item, index) => (
                          <li
                            key={index}
                            className="text-sm text-muted-foreground flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                            {item}
                          </li>
                        ))}
                        <li className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                          Kids play area
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Property Type:</span>
                    <span className="ml-2 font-semibold">{property.specs.unitType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pet Friendly:</span>
                    <span className="ml-2 font-semibold">
                      {property.specs.petFriendly ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Area Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Area Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="font-semibold">
                      {property.areaInsights.shoppingCentersNearby}
                    </div>
                    <div className="text-sm text-muted-foreground">Shopping Centers</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Bus className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="font-semibold">{property.areaInsights.transportScore}/10</div>
                    <div className="text-sm text-muted-foreground">Transport Score</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Baby className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="font-semibold">{property.areaInsights.schoolsNearby}</div>
                    <div className="text-sm text-muted-foreground">Schools Nearby</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <ShieldCheck className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="font-semibold">{property.areaInsights.safetyScore}/10</div>
                    <div className="text-sm text-muted-foreground">Safety Score</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Similar Listings */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Similar Listings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {property.similarListings.map(listing => (
                  <Card key={listing.id} className="overflow-hidden">
                    <img
                      src={listing.photos[0]}
                      alt={listing.title}
                      className="w-full h-48 object-cover"
                    />
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-1">{listing.title}</h3>
                      <div className="text-primary font-bold">{formatCurrency(listing.price)}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-20">
              <CardContent className="p-6">
                <div className="mb-6">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {formatCurrency(property.price)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {property.specs.unitType} for Sale
                  </div>
                </div>

                <div className="space-y-3">
                  <Button className="w-full" size="lg">
                    Contact Agent
                  </Button>
                  <Button variant="outline" className="w-full" size="lg">
                    <Heart className="h-5 w-5 mr-2" />
                    Save Property
                  </Button>
                  <Button variant="outline" className="w-full" size="lg" onClick={handleShare}>
                    <Share2 className="h-5 w-5 mr-2" />
                    Share Property
                  </Button>
                  <Link href="/listings/create">
                    <Button variant="secondary" className="w-full" size="lg">
                      Create Similar Listing
                    </Button>
                  </Link>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-3">Contact Agent</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={property.agent.photo}
                      alt={property.agent.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold">{property.agent.name}</div>
                      <div className="text-sm text-muted-foreground">Property Specialist</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{property.agent.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{property.agent.email}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-3">Mortgage Estimate</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly Repayment:</span>
                      <span className="font-semibold">
                        {formatCurrency(property.mortgage.repaymentEstimate)}/month
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interest Rate:</span>
                      <span>{property.mortgage.interestRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Loan Term:</span>
                      <span>{property.mortgage.loanTermYears} years</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span>Listed today</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
