import { Link, useLocation } from 'wouter';

const PRO_NAV_ITEMS = [
  { href: '/service/dashboard', label: 'Dashboard' },
  { href: '/service/profile', label: 'Profile' },
  { href: '/service/explore', label: 'Explore' },
];

export function ProNavigation() {
  const [location] = useLocation();

  return (
    <nav className="flex flex-wrap gap-2 rounded-xl border bg-white p-2">
      {PRO_NAV_ITEMS.map(item => {
        const isActive = location === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
