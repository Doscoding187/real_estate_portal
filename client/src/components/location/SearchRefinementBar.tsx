import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SearchRefinementBarProps {
  onSearch: (filters: any) => void;
  defaultLocation?: string;
}

export function SearchRefinementBar({ onSearch, defaultLocation }: SearchRefinementBarProps) {
  return (
    <div className="bg-white border-b sticky top-16 z-40 shadow-sm">
      <div className="container py-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={`Search properties in ${defaultLocation || 'this area'}...`} 
              className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-primary" 
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full md:w-auto">
            <Select>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="townhouse">Townhouse</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger className="w-full md:w-[130px]">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="search">Any Price</SelectItem>
                <SelectItem value="1m">Under R1m</SelectItem>
                <SelectItem value="2m">R1m - R3m</SelectItem>
                <SelectItem value="5m">R3m - R5m</SelectItem>
                <SelectItem value="luxury">R5m+</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger className="w-full md:w-[130px]">
                <SelectValue placeholder="Bedrooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Beds</SelectItem>
                <SelectItem value="1">1+ Beds</SelectItem>
                <SelectItem value="2">2+ Beds</SelectItem>
                <SelectItem value="3">3+ Beds</SelectItem>
                <SelectItem value="4">4+ Beds</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full md:w-auto bg-primary hover:bg-primary/90">Search</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
