import React, { useState } from 'react';
import { useDeveloperContext } from '@/contexts/DeveloperContextProvider';
import { trpc } from '@/lib/trpc';
import { Check, ChevronsUpDown, Building2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CreateBrandProfileDialog } from './CreateBrandProfileDialog';

export const DeveloperContextSelector: React.FC = () => {
  const { selectedBrand, setSelectedBrandId, isLoading } = useDeveloperContext();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: profiles, isLoading: isLoadingProfiles } = trpc.superAdminPublisher.listBrandProfiles.useQuery(
    { search: searchTerm, limit: 20 },
    { keepPreviousData: true }
  );

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">
        Operating As Developer
      </label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full sm:w-[350px] justify-between h-14 px-3 border-2 border-blue-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-blue-900"
          >
            {selectedBrand ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 rounded-md border border-blue-100 bg-white">
                  <AvatarImage src={selectedBrand.logoUrl || ''} alt={selectedBrand.brandName} className="object-cover" />
                  <AvatarFallback className="rounded-md bg-blue-100 text-blue-700">
                    {selectedBrand.brandName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start truncate text-left">
                  <span className="font-bold text-sm truncate w-[200px] text-blue-900">
                    {selectedBrand.brandName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-600 capitalize font-medium">
                      {selectedBrand.brandTier}
                    </span>
                    {selectedBrand.totalLeadsReceived !== undefined && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-200">
                        {selectedBrand.totalLeadsReceived} leads
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-blue-500">
                <div className="h-8 w-8 rounded-md border border-dashed border-blue-200 flex items-center justify-center bg-blue-50">
                  <Building2 className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-sm font-medium">Select a developer brand...</span>
              </div>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-blue-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0 border-blue-100 shadow-md" align="start">
          <Command shouldFilter={false} className="border-blue-100">
            <div className="flex items-center border-b border-blue-50 px-3" cmdk-input-wrapper="">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-blue-400" />
              <input
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-blue-300 text-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Search developer brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <CommandEmpty className="py-6 text-center text-sm text-blue-400">No brand found.</CommandEmpty>
            <CommandList>
              <div className="p-1 border-b border-blue-50">
                 <CreateBrandProfileDialog onSuccess={() => setOpen(false)} />
              </div>
              
              <CommandGroup heading="Available Brands" className="text-blue-400">
                {profiles?.map((brand: any) => (
                  <CommandItem
                    key={brand.id}
                    value={brand.brandName}
                    onSelect={() => {
                      setSelectedBrandId(brand.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 cursor-pointer py-2 aria-selected:bg-blue-50 aria-selected:text-blue-900"
                  >
                    <Avatar className="h-6 w-6 rounded-sm border border-blue-100 bg-white">
                      <AvatarImage src={brand.logoUrl} alt={brand.brandName} />
                      <AvatarFallback className="text-[10px] bg-blue-50 text-blue-600">
                        {brand.brandName.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate font-semibold text-blue-900">{brand.brandName}</span>
                      <span className="text-xs text-blue-500 capitalize truncate">
                        {brand.brandTier} • {brand.slug}
                      </span>
                    </div>

                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-blue-600",
                        selectedBrand?.id === brand.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
