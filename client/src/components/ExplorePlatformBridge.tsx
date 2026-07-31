import { ArrowLeft, Home } from 'lucide-react';
import { Link } from 'wouter';

type ExplorePlatformBridgeProps = {
  variant?: 'standard' | 'immersive';
  showExploreReturn?: boolean;
};

export function ExplorePlatformBridge({
  variant = 'standard',
  showExploreReturn = false,
}: ExplorePlatformBridgeProps) {
  const immersive = variant === 'immersive';

  return (
    <nav
      aria-label="Explore platform navigation"
      className={
        immersive
          ? 'pointer-events-auto flex items-center gap-2'
          : 'flex items-center gap-2 text-sm font-semibold text-slate-600'
      }
    >
      <Link
        href="/"
        aria-label="Back to Property Listify"
        className={
          immersive
            ? 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-black/45 px-3 text-sm font-semibold text-white shadow-xl backdrop-blur-xl transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
            : 'inline-flex min-h-9 items-center gap-2 rounded-md px-1 text-primary transition hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
        }
      >
        <Home className="size-4" aria-hidden="true" />
        <span className={immersive ? 'hidden sm:inline' : undefined}>Property Listify</span>
      </Link>

      {!immersive ? <span aria-hidden="true">/</span> : null}
      {!immersive ? <span className="text-slate-900">Explore</span> : null}

      {showExploreReturn ? (
        <Link
          href="/explore"
          aria-label="Back to Explore"
          className={
            immersive
              ? 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-black/45 px-3 text-sm font-semibold text-white shadow-xl backdrop-blur-xl transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
              : 'inline-flex min-h-9 items-center gap-2 rounded-md px-1 text-primary transition hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
          }
        >
          <ArrowLeft className={immersive ? 'size-5' : 'size-4'} aria-hidden="true" />
          <span className={immersive ? 'hidden md:inline' : undefined}>Back to Explore</span>
        </Link>
      ) : null}
    </nav>
  );
}
