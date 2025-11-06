import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Heart, User, ChevronDown } from 'lucide-react';
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
    <nav className="bg-black text-white shadow-md sticky top-0 z-50">
      <div className="container">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="bg-white text-black px-3 py-1 rounded font-bold text-lg">
                NewHomes
              </div>
            </div>
          </Link>

          {/* Navigation Menu */}
          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList className="gap-1">
              {/* City Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-white hover:bg-white/10 data-[state=open]:bg-white/10">
                  City
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[400px] p-4">
                    <div className="mb-3">
                      <h4 className="font-semibold mb-2">Top Cities</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {cities.map(city => (
                        <Link key={city.slug} href={`/city/${city.slug}`}>
                          <NavigationMenuLink className="block p-2 hover:bg-muted rounded-md transition-colors">
                            {city.name}
                          </NavigationMenuLink>
                        </Link>
                      ))}
                    </div>
                    <Link href="/">
                      <Button variant="link" className="mt-3 p-0 h-auto">
                        View All Cities →
                      </Button>
                    </Link>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Buy Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-white hover:bg-white/10 data-[state=open]:bg-white/10">
                  Buy
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[250px] p-2">
                    {buyOptions.map(option => (
                      <Link key={option.href} href={option.href}>
                        <NavigationMenuLink className="block p-3 hover:bg-muted rounded-md transition-colors">
                          {option.label}
                        </NavigationMenuLink>
                      </Link>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Rent Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-white hover:bg-white/10 data-[state=open]:bg-white/10">
                  Rent
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[250px] p-2">
                    {rentOptions.map(option => (
                      <Link key={option.href} href={option.href}>
                        <NavigationMenuLink className="block p-3 hover:bg-muted rounded-md transition-colors">
                          {option.label}
                        </NavigationMenuLink>
                      </Link>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Services Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-white hover:bg-white/10 data-[state=open]:bg-white/10">
                  Services
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[250px] p-2">
                    {servicesOptions.map(option => (
                      <a key={option.href} href={option.href}>
                        <NavigationMenuLink className="block p-3 hover:bg-muted rounded-md transition-colors">
                          {option.label}
                        </NavigationMenuLink>
                      </a>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Resources Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-white hover:bg-white/10 data-[state=open]:bg-white/10">
                  Resources
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[250px] p-2">
                    {resourcesOptions.map(option => (
                      <a key={option.href} href={option.href}>
                        <NavigationMenuLink className="block p-3 hover:bg-muted rounded-md transition-colors">
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
              className="hidden md:flex border-white text-white hover:bg-white hover:text-black"
            >
              Sell or Rent Property
            </Button>

            {/* Favorites */}
            {isAuthenticated && (
              <Link href="/favorites">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
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
                    className="border-white text-white hover:bg-white hover:text-black"
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
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = getLoginUrl())}
                className="border-white text-white hover:bg-white hover:text-black"
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
