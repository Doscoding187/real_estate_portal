import { Link } from 'wouter';
import { Home } from 'lucide-react';
import { SERVICE_CATEGORIES } from '@/features/services/catalog';
import { toServiceCategorySlug } from '@/features/services/catalog';

const platformLinks = [
  { label: 'Buy', href: '/property-for-sale' },
  { label: 'Rent', href: '/property-to-rent' },
  { label: 'Developments', href: '/new-developments' },
  { label: 'Land', href: '/plots-and-land' },
  { label: 'Commercial', href: '/commercial' },
  { label: 'Services', href: '/services' },
];

const companyLinks = [
  { label: 'About us', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Help & support', href: '/help' },
  { label: 'Privacy policy', href: '/legal/privacy' },
  { label: 'Terms of service', href: '/legal/terms' },
];

/**
 * The Services footer.
 *
 * It is deliberately a footer, not a second global navigation authority: every
 * destination is an existing platform route. The Services column points only
 * at the canonical service categories.
 *
 * The approved visual blueprint includes a newsletter capture. The platform has
 * no newsletter endpoint, so shipping a form that cannot submit would be a
 * dead control. It is recorded as a proposed capability instead.
 */
export function ServicesSiteFooter() {
  return (
    <footer className="bg-[#061729] text-slate-300">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#168363]">
                <Home className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <span className="text-lg font-bold tracking-tight">Property Listify</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
              More than a property portal. A complete home and lifestyle ecosystem.
            </p>
          </div>

          <nav aria-label="Property Listify links">
            <h2 className="text-sm font-semibold text-white">Property Listify</h2>
            <ul className="mt-4 space-y-2.5">
              {platformLinks.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Service category links">
            <h2 className="text-sm font-semibold text-white">Services</h2>
            <ul className="mt-4 space-y-2.5">
              {SERVICE_CATEGORIES.map(category => (
                <li key={category.value}>
                  <Link
                    href={`/services/${toServiceCategorySlug(category.value)}`}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {category.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/service/profile"
                  className="text-sm text-slate-400 transition hover:text-white"
                >
                  List your business
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Company links">
            <h2 className="text-sm font-semibold text-white">Company</h2>
            <ul className="mt-4 space-y-2.5">
              {companyLinks.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Property Listify. All rights reserved.</span>
          <span>
            Services is a curated provider cohort. Publication is reviewed by the platform.
          </span>
        </div>
      </div>
    </footer>
  );
}
