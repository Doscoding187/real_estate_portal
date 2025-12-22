import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Home,
  Heart,
  Building2,
  Hotel,
  MapPin,
  Briefcase,
  Users,
  Search,
  Mic,
  MapPinned,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { generatePropertyUrl } from '@/lib/urlUtils';
import { LocationAutosuggest } from './LocationAutosuggest';


export function EnhancedHero() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  const [budget, setBudget] = useState('');
  
  // Filter panel state
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter values
  const [filters, setFilters] = useState({
    // Buy filters
    propertyIntent: '',
    propertyTypes: [] as string[],
    priceMin: '',
    priceMax: '',
    
    // Rental filters
    furnished: false,
    leaseTerm: '',
    budgetMin: '',
    budgetMax: '',
    
    // Development filters
    developmentType: '',
    developmentStatus: '',
    
    // Plot & Land filters
    landType: '',
    sizeMin: '',
    sizeMax: '',
    
    // Commercial filters
    commercialUseType: '',
    saleOrRent: 'sale',
    lotSizeMin: '',
    lotSizeMax: '',
    zoning: '',
    parkingSpaces: '',
    
    // Shared Living filters
    roomType: '',
    billsIncluded: false,
    genderPreference: '',
    
    // Agent filters
    agentName: '',
    agency: '',
  });

  // Filter configuration
  const filterConfig = {
    buy: {
      intents: ['Residential', 'Commercial', 'Land & Plots', 'Farms & Smallholdings'],
      propertyTypes: {
        Residential: ['House', 'Apartment', 'Townhouse', 'Cluster', 'Penthouse', 'Duplex', 'Villa'],
        Commercial: ['Office', 'Retail', 'Industrial', 'Warehouse', 'Mixed-Use'],
        'Land & Plots': ['Residential Stand', 'Commercial Stand', 'Agricultural Land'],
        'Farms & Smallholdings': ['Farm', 'Smallholding', 'Game Farm', 'Lifestyle Farm'],
      },
    },
    rental: {
      intents: ['Residential', 'Commercial', 'Shared Living'],
      propertyTypes: {
        Residential: ['House', 'Apartment', 'Townhouse', 'Cluster', 'Room', 'Studio'],
        Commercial: ['Office', 'Retail', 'Industrial', 'Warehouse'],
        'Shared Living': ['Room in Apartment', 'Room in House', 'Co-Living Space', 'Student Accommodation'],
      },
      leaseTerms: ['Month-to-month', '6 months', '12 months', '24+ months'],
    },
    projects: {
      types: ['Full Title', 'Sectional Title', 'Security Estate', 'Retirement', 'Co-Living', 'Luxury', 'Affordable Housing'],
      statuses: ['Off-Plan', 'Under Construction', 'Completed', 'Launching Soon'],
    },
    plot: {
      types: ['Residential', 'Commercial', 'Agricultural', 'Industrial'],
    },
    commercial: {
      useTypes: ['Office', 'Retail', 'Industrial', 'Warehouse', 'Medical', 'Mixed-Use'],
    },
    pg: {
      roomTypes: ['Room in Apartment', 'Room in House', 'Co-Living', 'Student Accommodation'],
      genderOptions: ['Male Only', 'Female Only', 'Mixed'],
    },
  };

  // ... (lines 120-350 remain unchanged)

                  {/* BUY FILTERS */}
                  {activeTab === 'buy' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property Category</Label>
                        <Select 
                          value={filters.propertyIntent} 
                          onValueChange={(val) => handleFilterChange('propertyIntent', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Category</SelectItem>
                            {filterConfig.buy.intents.map(intent => (
                              <SelectItem key={intent} value={intent}>{intent}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">Choose the main type of property you’re looking for</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property Type</Label>
                        <Select 
                          value={filters.propertyTypes[0] || ''} 
                          onValueChange={(val) => handleFilterChange('propertyTypes', [val])}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Type</SelectItem>
                            {(filters.propertyIntent && filterConfig.buy.propertyTypes[filters.propertyIntent as keyof typeof filterConfig.buy.propertyTypes] 
                              ? filterConfig.buy.propertyTypes[filters.propertyIntent as keyof typeof filterConfig.buy.propertyTypes]
                              : Object.values(filterConfig.buy.propertyTypes).flat()
                            ).map((type: string) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min Price</Label>
                        <Select 
                          value={filters.priceMin} 
                          onValueChange={(val) => handleFilterChange('priceMin', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="No Min" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">R 0</SelectItem>
                            <SelectItem value="500000">R 500,000</SelectItem>
                            <SelectItem value="1000000">R 1,000,000</SelectItem>
                            <SelectItem value="2000000">R 2,000,000</SelectItem>
                            <SelectItem value="5000000">R 5,000,000</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Price</Label>
                        <Select 
                          value={filters.priceMax} 
                          onValueChange={(val) => handleFilterChange('priceMax', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="No Max" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1000000">R 1,000,000</SelectItem>
                            <SelectItem value="2000000">R 2,000,000</SelectItem>
                            <SelectItem value="5000000">R 5,000,000</SelectItem>
                            <SelectItem value="10000000">R 10,000,000</SelectItem>
                            <SelectItem value="50000000">R 50,000,000+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* RENTAL FILTERS */}
                  {activeTab === 'rental' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property Type</Label>
                        <Select 
                          value={filters.propertyTypes[0] || ''} 
                          onValueChange={(val) => handleFilterChange('propertyTypes', [val])}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Type</SelectItem>
                            {Object.values(filterConfig.rental.propertyTypes).flat().map((type: string) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lease Term</Label>
                        <Select 
                          value={filters.leaseTerm} 
                          onValueChange={(val) => handleFilterChange('leaseTerm', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Term" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Term</SelectItem>
                            {filterConfig.rental.leaseTerms.map(term => (
                              <SelectItem key={term} value={term}>{term}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Budget</Label>
                        <Select 
                          value={filters.budgetMax} 
                          onValueChange={(val) => handleFilterChange('budgetMax', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Budget" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5000">R 5,000</SelectItem>
                            <SelectItem value="10000">R 10,000</SelectItem>
                            <SelectItem value="20000">R 20,000</SelectItem>
                            <SelectItem value="50000">R 50,000+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2 h-10 mt-6">
                        <Checkbox 
                          id="furnished" 
                          checked={filters.furnished}
                          onCheckedChange={(checked) => handleFilterChange('furnished', checked)}
                        />
                        <Label htmlFor="furnished" className="font-normal cursor-pointer">Furnished Only</Label>
                      </div>
                    </>
                  )}

                  {/* DEVELOPMENTS FILTERS */}
                  {activeTab === 'projects' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Development Type</Label>
                        <Select 
                          value={filters.developmentType} 
                          onValueChange={(val) => handleFilterChange('developmentType', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Type</SelectItem>
                            {filterConfig.projects.types.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
                        <Select 
                          value={filters.developmentStatus} 
                          onValueChange={(val) => handleFilterChange('developmentStatus', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Status</SelectItem>
                            {filterConfig.projects.statuses.map(status => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min Price</Label>
                        <Input 
                          type="number" 
                          placeholder="R Min" 
                          className="h-10 bg-gray-50/50 border-gray-200"
                          value={filters.priceMin}
                          onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Price</Label>
                        <Input 
                          type="number" 
                          placeholder="R Max" 
                          className="h-10 bg-gray-50/50 border-gray-200"
                          value={filters.priceMax}
                          onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {/* PLOT & LAND FILTERS */}
                  {activeTab === 'plot' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Land Type</Label>
                        <Select 
                          value={filters.landType} 
                          onValueChange={(val) => handleFilterChange('landType', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Type</SelectItem>
                            {filterConfig.plot.types.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min Size (m²)</Label>
                        <Input 
                          type="number" 
                          placeholder="Min m²" 
                          className="h-10 bg-gray-50/50 border-gray-200"
                          value={filters.sizeMin}
                          onChange={(e) => handleFilterChange('sizeMin', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Price</Label>
                        <Select 
                          value={filters.priceMax} 
                          onValueChange={(val) => handleFilterChange('priceMax', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Price" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="500000">R 500k</SelectItem>
                            <SelectItem value="1000000">R 1M</SelectItem>
                            <SelectItem value="5000000">R 5M</SelectItem>
                            <SelectItem value="10000000">R 10M+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* COMMERCIAL FILTERS */}
                  {activeTab === 'commercial' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">I want to</Label>
                        <div className="flex p-1 bg-gray-100 rounded-lg h-10">
                          <button
                            onClick={() => handleFilterChange('saleOrRent', 'sale')}
                            className={`flex-1 rounded-md text-sm font-medium transition-all ${filters.saleOrRent === 'sale' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                          >
                            Buy
                          </button>
                          <button
                            onClick={() => handleFilterChange('saleOrRent', 'rent')}
                            className={`flex-1 rounded-md text-sm font-medium transition-all ${filters.saleOrRent === 'rent' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                          >
                            Rent
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Use Type</Label>
                        <Select 
                          value={filters.commercialUseType} 
                          onValueChange={(val) => handleFilterChange('commercialUseType', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Use" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Use</SelectItem>
                            {filterConfig.commercial.useTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min Size (m²)</Label>
                        <Input 
                          type="number" 
                          placeholder="Min m²" 
                          className="h-10 bg-gray-50/50 border-gray-200"
                          value={filters.lotSizeMin}
                          onChange={(e) => handleFilterChange('lotSizeMin', e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {/* SHARED LIVING FILTERS */}
                  {activeTab === 'pg' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Room Type</Label>
                        <Select 
                          value={filters.roomType} 
                          onValueChange={(val) => handleFilterChange('roomType', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Room" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Room</SelectItem>
                            {filterConfig.pg.roomTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gender Preference</Label>
                        <Select 
                          value={filters.genderPreference} 
                          onValueChange={(val) => handleFilterChange('genderPreference', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any</SelectItem>
                            {filterConfig.pg.genderOptions.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Budget</Label>
                        <Select 
                          value={filters.budgetMax} 
                          onValueChange={(val) => handleFilterChange('budgetMax', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Budget" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3000">R 3,000</SelectItem>
                            <SelectItem value="5000">R 5,000</SelectItem>
                            <SelectItem value="8000">R 8,000</SelectItem>
                            <SelectItem value="10000">R 10,000+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                </div>
              </div>
            )}

            {/* Popular Provinces */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-foreground font-medium">Popular Locations:</span>
                {[
                  { name: 'Gauteng', slug: 'gauteng' },
                  { name: 'Western Cape', slug: 'western-cape' },
                  { name: 'KwaZulu-Natal', slug: 'kwazulu-natal' },
                  { name: 'Eastern Cape', slug: 'eastern-cape' },
                  { name: 'Free State', slug: 'free-state' },
                  { name: 'Limpopo', slug: 'limpopo' },
                ].map((province) => (
                  <Link
                    key={province.slug}
                    href={`/${province.slug}`}
                    className="px-4 py-1.5 rounded-full bg-blue-100 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 text-blue-900 hover:text-white font-medium transition-all border border-blue-200 hover:border-transparent shadow-sm hover:shadow-md cursor-pointer"
                  >
                    {province.name}
                  </Link>
                ))}
            </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
