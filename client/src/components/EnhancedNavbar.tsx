import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Heart, User, ChevronDown, MapPin, Home, Briefcase, MapPinned, TrendingUp, Calculator } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';

export function EnhancedNavbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    logout();
  };

  const cities = [
    { name: 'Johannesburg', slug: 'johannesburg' },
    { name: 'Cape Town', slug: 'cape-town' },
    { name: 'Durban', slug: 'durban' },
    { name: 'Pretoria', slug: 'pretoria' },
    { name: 'Port Elizabeth', slug: 'port-elizabeth' },
    { name: 'Bloemfontein', slug: 'bloemfontein' },
  ];

  const buyOptions = [
    { label: 'Buy Properties', href: '/properties?listingType=sale' },
    { label: 'New Developments', href: '/developments' },
    {
      label: 'Luxury Homes',
      href: '/properties?listingType=sale&propertyType=villa',
    },
    {
      label: 'Apartments',
      href: '/properties?listingType=sale&propertyType=apartment',
    },
    {
      label: 'Houses',
      href: '/properties?listingType=sale&propertyType=house',
    },
  ];

  const rentOptions = [
    { label: 'Rent Properties', href: '/properties?listingType=rent' },
    {
      label: 'Apartments for Rent',
      href: '/properties?listingType=rent&propertyType=apartment',
    },
    {
      label: 'Houses for Rent',
      href: '/properties?listingType=rent&propertyType=house',
    },
    {
      label: 'Commercial Spaces',
      href: '/properties?listingType=rent&propertyType=commercial',
    },
  ];

  const servicesOptions = [
    { label: 'Home Loans', href: '#' },
    { label: 'Property Valuation', href: '#' },
    { label: 'Legal Services', href: '#' },
    { label: 'Home Insurance', href: '#' },
    { label: 'Interior Design', href: '#' },
  ];

  const resourcesOptions = [
    { label: 'Property Insights', href: '#' },
    { label: 'Market Trends', href: '#' },
    { label: 'Buying Guide', href: '#' },
    { label: 'Selling Guide', href: '#' },
    { label: 'Blog', href: '#' },
  ];

  return (
    <nav className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-200/50">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-md group-hover:shadow-lg transition-all">
                NewHomes
              </div>
            </div>
          </Link>

          {/* Navigation Menu */}
          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList className="gap-1">
              {/* City Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-foreground hover:bg-blue-50 hover:text-blue-600 data-[state=open]:bg-blue-50 data-[state=open]:text-blue-600 font-medium">
                  City
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[500px] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-lg text-slate-800">Top Cities</h4>
                      <Link href="/cities">
                        <span className="text-sm text-blue-600 hover:underline cursor-pointer">View All Cities</span>
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {cities.map(city => (
                        <Link key={city.slug} href={`/city/${city.slug}`}>
                          <NavigationMenuLink className="flex items-center gap-2 p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all group">
                            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-colors">
                              <MapPin className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-slate-600 group-hover:text-blue-700">{city.name}</span>
                          </NavigationMenuLink>
                        </Link>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <h4 className="font-bold text-sm text-slate-800 mb-3">Popular Areas</h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <Link href="/city/sandton"><span className="text-slate-500 hover:text-blue-600 cursor-pointer">Sandton</span></Link>
                        <Link href="/city/midrand"><span className="text-slate-500 hover:text-blue-600 cursor-pointer">Midrand</span></Link>
                        <Link href="/city/centurion"><span className="text-slate-500 hover:text-blue-600 cursor-pointer">Centurion</span></Link>
                        <Link href="/city/umhlanga"><span className="text-slate-500 hover:text-blue-600 cursor-pointer">Umhlanga</span></Link>
                        <Link href="/city/sea-point"><span className="text-slate-500 hover:text-blue-600 cursor-pointer">Sea Point</span></Link>
                        <Link href="/city/fourways"><span className="text-slate-500 hover:text-blue-600 cursor-pointer">Fourways</span></Link>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Buy Mega Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-foreground hover:bg-blue-50 hover:text-blue-600 data-[state=open]:bg-blue-50 data-[state=open]:text-blue-600 font-medium">
                  Buy
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[800px] p-0 overflow-hidden flex">
                    {/* Main Content */}
                    <div className="flex-1 p-6 grid grid-cols-3 gap-8 bg-white">
                      {/* Residential */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <Home className="h-4 w-4 text-blue-600" /> Residential
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li><Link href="/properties?type=house&listingType=sale"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Houses for Sale</span></Link></li>
                          <li><Link href="/properties?type=apartment&listingType=sale"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Apartments / Flats</span></Link></li>
                          <li><Link href="/properties?type=townhouse&listingType=sale"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Townhouses</span></Link></li>
                          <li><Link href="/developments"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">New Developments</span></Link></li>
                        </ul>
                      </div>

                      {/* Commercial */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-blue-600" /> Commercial
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li><Link href="/properties?type=office&listingType=sale"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Office Spaces</span></Link></li>
                          <li><Link href="/properties?type=retail&listingType=sale"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Retail Shops</span></Link></li>
                          <li><Link href="/properties?type=industrial&listingType=sale"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Industrial / Warehouse</span></Link></li>
                        </ul>
                      </div>

                      {/* Land & Plot */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <MapPinned className="h-4 w-4 text-blue-600" /> Land
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li><Link href="/properties?type=land&listingType=sale"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Residential Land</span></Link></li>
                          <li><Link href="/properties?type=commercial-land&listingType=sale"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Commercial Land</span></Link></li>
                          <li><Link href="/properties?type=farm&listingType=sale"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Farms</span></Link></li>
                        </ul>
                      </div>
                    </div>

                    {/* Featured / Insights Sidebar */}
                    <div className="w-64 bg-slate-50 p-6 border-l border-slate-100 flex flex-col justify-center">
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <h5 className="font-bold text-slate-800 mb-1">Market Insights</h5>
                        <p className="text-xs text-slate-500 mb-3">Read our latest analysis on property trends in South Africa.</p>
                        <Button variant="outline" size="sm" className="w-full text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50">
                          Read More
                        </Button>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Rent Mega Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-foreground hover:bg-blue-50 hover:text-blue-600 data-[state=open]:bg-blue-50 data-[state=open]:text-blue-600 font-medium">
                  Rent
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[800px] p-0 overflow-hidden flex">
                    {/* Main Content */}
                    <div className="flex-1 p-6 grid grid-cols-3 gap-8 bg-white">
                      {/* Residential */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <Home className="h-4 w-4 text-blue-600" /> Residential
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li><Link href="/properties?type=apartment&listingType=rent"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Apartments for Rent</span></Link></li>
                          <li><Link href="/properties?type=house&listingType=rent"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Houses for Rent</span></Link></li>
                          <li><Link href="/properties?type=student&listingType=rent"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Student Accommodation</span></Link></li>
                          <li><Link href="/properties?type=room&listingType=rent"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Rooms / Flatshares</span></Link></li>
                        </ul>
                      </div>

                      {/* Commercial */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-blue-600" /> Commercial
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li><Link href="/properties?type=office&listingType=rent"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Offices to Let</span></Link></li>
                          <li><Link href="/properties?type=retail&listingType=rent"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Retail Space</span></Link></li>
                          <li><Link href="/properties?type=industrial&listingType=rent"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Industrial Space</span></Link></li>
                        </ul>
                      </div>

                      {/* Popular Cities */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" /> Popular Cities
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li><Link href="/city/johannesburg?listingType=rent"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Rent in Johannesburg</span></Link></li>
                          <li><Link href="/city/cape-town?listingType=rent"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Rent in Cape Town</span></Link></li>
                          <li><Link href="/city/durban?listingType=rent"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Rent in Durban</span></Link></li>
                        </ul>
                      </div>
                    </div>

                    {/* Featured / Tools Sidebar */}
                    <div className="w-64 bg-slate-50 p-6 border-l border-slate-100 flex flex-col justify-center">
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                          <Calculator className="h-5 w-5 text-blue-600" />
                        </div>
                        <h5 className="font-bold text-slate-800 mb-1">Affordability Calc</h5>
                        <p className="text-xs text-slate-500 mb-3">Calculate how much rent you can afford based on your income.</p>
                        <Button variant="outline" size="sm" className="w-full text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50">
                          Calculate Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Services Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-foreground hover:bg-blue-50 hover:text-blue-600 data-[state=open]:bg-blue-50 data-[state=open]:text-blue-600 font-medium">
                  Services
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[250px] p-2">
                    {servicesOptions.map(option => (
                      <a key={option.href} href={option.href}>
                        <NavigationMenuLink className="block p-3 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
                          {option.label}
                        </NavigationMenuLink>
                      </a>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Resources Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-foreground hover:bg-blue-50 hover:text-blue-600 data-[state=open]:bg-blue-50 data-[state=open]:text-blue-600 font-medium">
                  Resources
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[250px] p-2">
                    {resourcesOptions.map(option => (
                      <a key={option.href} href={option.href}>
                        <NavigationMenuLink className="block p-3 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
                          {option.label}
                        </NavigationMenuLink>
                      </a>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Data Badge - Removed */}
              {/* <NavigationMenuItem>
                <Link href="/explore">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:text-white ml-2"
                  >
                    Data
                  </Button>
                </Link>
              </NavigationMenuItem> */}

              {/* Intelligence Link - Removed */}
              {/* <NavigationMenuItem>
                <Link href="/explore">
                  <NavigationMenuLink className="px-4 py-2 text-white hover:text-white/80 transition-colors">
                    Intelligence
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem> */}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Sell or Rent Property Button */}
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all font-medium"
            >
              List Property
            </Button>

            {/* Favorites */}
            {isAuthenticated && (
              <Link href="/favorites">
                <Button variant="ghost" size="icon" className="text-foreground hover:bg-blue-50 hover:text-blue-600">
                  <Heart className="h-5 w-5" />
                </Button>
              </Link>
            )}

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all font-medium"
                  >
                    <User className="h-4 w-4 mr-2" />
                    {user?.name || 'Account'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem disabled>
                    <div className="flex flex-col">
                      <span className="font-semibold">{user?.name}</span>
                      <span className="text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/favorites">
                      <a className="flex items-center gap-2 w-full">
                        <Heart className="h-4 w-4" />
                        My Favorites
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => (window.location.href = getLoginUrl())}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all font-medium"
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
