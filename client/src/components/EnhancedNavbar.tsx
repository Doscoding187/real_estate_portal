import { Link, useLocation } from 'wouter';
import { Menu, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/_core/hooks/useAuth';
import { useState } from 'react';

const launchLinks = [
  { href: '/', label: 'Home' },
  { href: '/property-for-sale', label: 'Buy' },
  { href: '/property-to-rent', label: 'Rent' },
  { href: '/new-developments', label: 'Developments' },
  { href: '/agents', label: 'Agents' },
  { href: '/developers', label: 'Developers' },
  { href: '/advertise', label: 'Advertise / List Property' },
];

/**
 * Launch-facing navigation deliberately promotes only verified marketplace
 * surfaces. Deferred journeys remain route-addressable, but are not a public
 * promise until their own launch authorization.
 */
export function EnhancedNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const accountHref = isAuthenticated ? '/dashboard' : '/login';

  const navigate = (href: string) => {
    setMenuOpen(false);
    setLocation(href);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200/60 bg-white shadow-sm">
      <div className="mx-auto flex min-h-16 max-w-screen-2xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 text-lg font-bold tracking-tight text-blue-700 sm:text-xl"
        >
          Property Listify
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
          {launchLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Button variant="outline" onClick={() => setLocation('/property-for-sale')}>
            Search properties
          </Button>
          <Button onClick={() => setLocation(accountHref)}>
            <User className="mr-2 h-4 w-4" />
            {isAuthenticated ? user?.name || 'Account' : 'Sign in'}
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(accountHref)}
            aria-label="Account"
          >
            <User className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(open => !open)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-3 lg:hidden">
          <div className="grid gap-1">
            {launchLinks.map(link => (
              <button
                key={link.href}
                type="button"
                onClick={() => navigate(link.href)}
                className="rounded-md px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              >
                {link.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate('/property-for-sale')}
              className="rounded-md px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              Search properties
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
