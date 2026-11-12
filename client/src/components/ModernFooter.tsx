import { Link } from 'wouter';
import { isHomepageHeroJourneyEnabled } from '@/lib/publicNavigation';
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL_HREF,
  SUPPORT_WHATSAPP_URL,
} from '@shared/supportContact';

const marketplaceLinks = [
  { label: 'Home', href: '/' },
  { label: 'Buy', href: '/property-for-sale' },
  ...(isHomepageHeroJourneyEnabled('rent') ? [{ label: 'Rent', href: '/property-to-rent' }] : []),
  ...(isHomepageHeroJourneyEnabled('developments')
    ? [{ label: 'Developments', href: '/new-developments' }]
    : []),
  { label: 'Agents', href: '/agents' },
  ...(isHomepageHeroJourneyEnabled('developments')
    ? [{ label: 'Developers', href: '/developers' }]
    : []),
  { label: 'Advertise / List Property', href: '/advertise' },
];

const legalLinks = [
  { label: 'Privacy', href: '/legal/privacy' },
  { label: 'Terms', href: '/legal/terms' },
  { label: 'Cookies', href: '/legal/cookies' },
];

/**
 * Public launch footer. It deliberately mirrors the verified marketplace
 * boundary instead of advertising deferred services, tools, feeds, or apps.
 */
export function ModernFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
      <div className="container mx-auto px-4 py-10 md:py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <Link href="/" className="text-xl font-bold tracking-tight text-white">
              Property Listify
            </Link>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Find property, connect with verified listing contacts, and advertise your property.
            </p>
          </div>

          <nav aria-label="Marketplace footer navigation">
            <h2 className="mb-3 text-sm font-semibold text-white">Marketplace</h2>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
              {marketplaceLinks.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-blue-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-8 border-t border-slate-800 pt-6 text-sm text-slate-400">
          Support:{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-slate-300 transition-colors hover:text-blue-400"
          >
            {SUPPORT_EMAIL}
          </a>{' '}
          |{' '}
          <a
            href={SUPPORT_PHONE_TEL_HREF}
            className="text-slate-300 transition-colors hover:text-blue-400"
          >
            {SUPPORT_PHONE_DISPLAY}
          </a>{' '}
          |{' '}
          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-300 transition-colors hover:text-blue-400"
          >
            WhatsApp
          </a>
        </p>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Property Listify. All rights reserved.</span>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {legalLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-blue-400"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
