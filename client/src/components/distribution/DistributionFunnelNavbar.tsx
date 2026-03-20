import { Link, useLocation } from 'wouter';
import { Building2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

const REFERRAL_APPLY_PATH = '/distribution-network/apply';

export function DistributionFunnelNavbar() {
  const [, setLocation] = useLocation();

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/">
          <span className="flex cursor-pointer items-center gap-2 text-lg font-bold text-slate-900">
            <Building2 className="h-5 w-5 text-blue-600" />
            Property Listify
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="hidden border-slate-300 bg-white text-slate-700 sm:inline-flex"
            onClick={() => setLocation('/book-strategy')}
          >
            Book Strategy Call
          </Button>
          <Button
            size="sm"
            className="border-0 bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-white hover:opacity-95"
            onClick={() => setLocation(REFERRAL_APPLY_PATH)}
          >
            Apply to Join
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-slate-600 hover:text-slate-900"
            aria-label="Sign in"
            onClick={() => setLocation('/login')}
          >
            <LogIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
