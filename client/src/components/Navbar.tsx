import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Heart, User, Menu, Home, Plus, Play } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { APP_TITLE } from '@/const';
import { useBranding } from '@/contexts/BrandingContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { branding, isWhiteLabel } = useBranding();
  const [location, setLocation] = useLocation();
  const logoutMutation = trpc.auth.logout.useMutation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    logout();
  };

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/properties', label: 'Properties' },
    { href: '/explore', label: 'Explore', icon: Play },
    { href: '/agents', label: 'Agents' },
    { href: '/listing-template', label: 'Listing Template' },
    { href: '/dashboard', label: 'My Properties', protected: true },
    { href: '/favorites', label: 'Favorites', icon: Heart, protected: true },
  ];

  return (
    <nav className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              {branding?.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.companyName || 'Logo'}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <Home className="h-6 w-6" />
              )}
              <span className="text-xl font-bold">
                {isWhiteLabel ? branding?.companyName || APP_TITLE : APP_TITLE}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => {
              if (link.protected && !isAuthenticated) return null;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 hover:text-secondary transition-colors ${
                    location === link.href ? 'text-secondary font-semibold' : ''
                  }`}
                >
                  {link.icon && <link.icon className="h-4 w-4" />}
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated && (
              <Button
                variant="secondary"
                onClick={() => setLocation('/listings/create')}
                className="font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                List Property
              </Button>
            )}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-primary-foreground hover:text-secondary hover:bg-primary/80"
                  >
                    <User className="h-5 w-5" />
                    <span>{user?.name || 'Account'}</span>
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
                    <Link href="/dashboard" className="flex items-center gap-2 w-full">
                      <Home className="h-4 w-4" />
                      My Properties
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/favorites" className="flex items-center gap-2 w-full">
                      <Heart className="h-4 w-4" />
                      My Favorites
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/listings/create" className="flex items-center gap-2 w-full">
                      <Home className="h-4 w-4" />
                      List Property
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button variant="secondary" className="font-semibold">
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col gap-4 mt-8">
                  {navLinks.map(link => {
                    if (link.protected && !isAuthenticated) return null;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 p-2 rounded hover:bg-muted ${
                          location === link.href ? 'bg-muted font-semibold' : ''
                        }`}
                      >
                        {link.icon && <link.icon className="h-5 w-5" />}
                        {link.label}
                      </Link>
                    );
                  })}

                  <div className="border-t pt-4 mt-4">
                    {isAuthenticated ? (
                      <>
                        <div className="px-2 mb-4">
                          <div className="font-semibold">{user?.name}</div>
                          <div className="text-xs text-muted-foreground">{user?.email}</div>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            handleLogout();
                            setMobileMenuOpen(false);
                          }}
                          className="w-full"
                        >
                          Logout
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="default"
                        onClick={() => {
                          setLocation('/login');
                          setMobileMenuOpen(false);
                        }}
                        className="w-full"
                      >
                        Login
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
