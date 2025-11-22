import { Button } from './ui/button';
import { Search, Mic, Menu, User, ChevronDown, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { useLocation } from 'wouter';
import { useState } from 'react';

export function ListingNavbar() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#005ca8] h-16 flex items-center px-4 md:px-8 shadow-md">
      {/* Logo Section */}
      <div 
        className="flex items-center gap-2 cursor-pointer mr-8" 
        onClick={() => setLocation('/')}
      >
        <h1 className="text-2xl font-bold text-white tracking-tight">Property Listify</h1>
      </div>

      {/* Central Search Bar */}
      <div className="hidden md:flex flex-1 max-w-3xl mx-auto">
        <div className="flex w-full bg-white rounded-md overflow-hidden h-10 items-center">
          {/* Buy Dropdown */}
          <div className="flex items-center px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-50 h-full">
            <span className="text-sm text-gray-700 font-medium">Buy</span>
            <ChevronDown className="h-4 w-4 ml-1 text-gray-500" />
          </div>

          {/* City Tag */}
          <div className="flex items-center pl-2">
            <div className="flex items-center bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-100">
              <span>Johannesburg Central</span>
              <X className="h-3 w-3 ml-1 cursor-pointer hover:text-blue-900" />
            </div>
          </div>

          {/* Input */}
          <input
            type="text"
            placeholder="Add more..."
            className="flex-1 px-3 py-2 text-sm outline-none text-gray-700 placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Icons */}
          <div className="flex items-center px-2 gap-2">
            <Mic className="h-5 w-5 text-blue-500 cursor-pointer hover:text-blue-600" />
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <Search className="h-5 w-5 text-gray-600 cursor-pointer hover:text-gray-800" />
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 ml-auto">
        <Button 
          variant="secondary" 
          className="hidden md:flex bg-white hover:bg-gray-100 text-gray-900 font-medium text-sm h-9 px-4 gap-2"
          onClick={() => setLocation('/listings/create')}
        >
          Post property
          <Badge className="bg-green-600 hover:bg-green-700 text-[10px] px-1 py-0 h-4 rounded text-white border-0">
            FREE
          </Badge>
        </Button>

        <div className="relative cursor-pointer">
          <User className="h-6 w-6 text-white" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-[#005ca8]"></span>
        </div>

        <Menu className="h-6 w-6 text-white cursor-pointer" />
      </div>
    </div>
  );
}
