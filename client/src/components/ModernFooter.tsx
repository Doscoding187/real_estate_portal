import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Building2,
  Home,
  TrendingUp,
  Users,
  Calculator,
  BookOpen,
  Shield,
  Star,
  Heart,
  ArrowUp,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { generatePropertyUrl, slugify } from '@/lib/urlUtils';

export function ModernFooter() {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      console.log('Subscribe:', email);
      setEmail('');
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildPropertySearchHref = (listingType: 'sale' | 'rent', propertyType?: string) =>
    generatePropertyUrl({
      listingType,
      ...(propertyType ? { propertyType } : {}),
    });

  const buildCityHref = (province: string, city: string) =>
    generatePropertyUrl({
      listingType: 'sale',
      province: slugify(province),
      city: slugify(city),
    });

  const footerSections = [
    {
      title: 'Property',
      icon: Home,
      links: [
        { label: 'Houses for Sale', href: buildPropertySearchHref('sale', 'house') },
        { label: 'Apartments for Sale', href: buildPropertySearchHref('sale', 'apartment') },
        { label: 'Townhouses for Sale', href: buildPropertySearchHref('sale', 'townhouse') },
        { label: 'Houses to Rent', href: buildPropertySearchHref('rent', 'house') },
        { label: 'Apartments to Rent', href: buildPropertySearchHref('rent', 'apartment') },
        { label: 'New Developments', href: '/new-developments' },
      ],
    },
    {
      title: 'Services',
      icon: Building2,
      links: [
        { label: 'Find Estate Agents', href: '/agents' },
        { label: 'Find Agencies', href: '/agencies' },
        { label: 'Property Valuation', href: '#' },
        { label: 'Home Loans', href: '#' },
        { label: 'Property Insurance', href: '#' },
        { label: 'Legal Services', href: '#' },
      ],
    },
    {
      title: 'Tools & Resources',
      icon: Calculator,
      links: [
        { label: 'Affordability Calculator', href: '#' },
        { label: 'Bond Calculator', href: '#' },
        { label: 'Property Reports', href: '#' },
        { label: 'Market Trends', href: '#' },
        { label: 'Area Guides', href: '#' },
        { label: 'Sold Properties', href: '#' },
      ],
    },
    {
      title: 'Company',
      icon: Users,
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Contact Us', href: '/contact' },
        { label: 'Careers', href: '/careers' },
        { label: 'Press & Media', href: '/press' },
        { label: 'Partner with Us', href: '/partners' },
        { label: 'Advertise with Us', href: '/advertise' },
      ],
    },
    {
      title: 'Support',
      icon: BookOpen,
      links: [
        { label: 'Help Center', href: '/help' },
        { label: 'Buying Guide', href: '#' },
        { label: 'Selling Guide', href: '#' },
        { label: 'Renting Guide', href: '#' },
        { label: 'Safety Tips', href: '/safety' },
        { label: 'FAQs', href: '/faq' },
      ],
    },
    {
      title: 'Legal',
      icon: Shield,
      links: [
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Cookie Policy', href: '/cookies' },
        { label: 'Compliance', href: '/compliance' },
        { label: 'Consumer Rights', href: '#' },
        { label: 'Dispute Resolution', href: '#' },
      ],
    },
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Youtube, href: '#', label: 'YouTube' },
  ];

  const popularCities = [
    { name: 'Johannesburg', province: 'Gauteng' },
    { name: 'Cape Town', province: 'Western Cape' },
    { name: 'Durban', province: 'KwaZulu-Natal' },
    { name: 'Pretoria', province: 'Gauteng' },
    { name: 'Port Elizabeth', province: 'Eastern Cape' },
    { name: 'Bloemfontein', province: 'Free State' },
  ];

  const contactInfo = [
    { icon: Phone, label: '+27 11 234 5678', href: 'tel:+27112345678' },
    { icon: Mail, label: 'info@propertylistify.co.za', href: 'mailto:info@propertylistify.co.za' },
    { icon: MapPin, label: '123 Main St, Johannesburg, 2001', href: '#' },
  ];

  return (
    <footer className="bg-slate-900 text-white">
      <section className="border-b border-slate-800">
        <div className="container mx-auto px-4 py-7 md:py-12">
          <div className="mx-auto max-w-4xl rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 px-4 py-5 text-center shadow-[0_24px_64px_rgba(2,6,23,0.35)] sm:px-6 md:px-8 md:py-8">
            <div className="mb-2.5 inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200">
              Weekly market brief
            </div>
            <h3 className="mb-2.5 text-lg font-bold leading-tight sm:text-2xl">
              Stay Updated with Latest Property Trends
            </h3>
            <p className="mx-auto mb-4 max-w-2xl text-[13px] leading-5 text-slate-300 md:mb-6 md:text-sm md:leading-6">
              Get exclusive property listings, market insights, and expert tips delivered to your
              inbox.
            </p>

            <form
              onSubmit={handleSubscribe}
              className="mx-auto flex max-w-md flex-col gap-2.5 sm:flex-row"
            >
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-11 rounded-full border-slate-700 bg-slate-800 px-4 text-white placeholder:text-slate-400 focus:border-blue-500"
                required
              />
              <Button
                type="submit"
                className="h-11 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Subscribe Now
              </Button>
            </form>

            <p className="mt-3 text-xs text-slate-400">
              By subscribing, you agree to our Privacy Policy and Terms of Service.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 md:py-12">
        <div className="space-y-2.5 md:hidden">
          {footerSections.map((section, index) => {
            const IconComponent = section.icon;

            return (
              <details
                key={index}
                className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-800/70"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="font-semibold text-white">{section.title}</h4>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="border-t border-slate-800 px-4 py-3">
                  <ul className="space-y-3">
                    {section.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <Link href={link.href}>
                          <a className="text-sm text-slate-300 transition-colors hover:text-blue-400">
                            {link.label}
                          </a>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            );
          })}
        </div>

        <div className="hidden grid-cols-1 gap-8 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {footerSections.map((section, index) => {
            const IconComponent = section.icon;

            return (
              <div key={index} className="space-y-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                    <IconComponent className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-white">{section.title}</h4>
                </div>

                <ul className="space-y-2">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link href={link.href}>
                        <a className="text-sm text-slate-300 transition-colors hover:text-blue-400">
                          {link.label}
                        </a>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-8 border-t border-slate-800 pt-7 md:mt-12">
          <h4 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <TrendingUp className="h-4 w-4" />
            Popular Cities
          </h4>
          <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-3 md:overflow-visible md:px-0 lg:grid-cols-6">
            {popularCities.map((city, index) => (
              <Link key={index} href={buildCityHref(city.province, city.name)}>
                <a className="inline-flex min-w-max rounded-full border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-blue-500/50 hover:text-blue-400 md:min-w-0 md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0">
                  {city.name}
                </a>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 border-t border-slate-800 pt-7 lg:mt-12 lg:grid-cols-2 lg:gap-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-5 lg:border-0 lg:bg-transparent lg:p-0">
            <h4 className="mb-4 font-semibold text-white">Get in Touch</h4>
            <div className="space-y-3">
              {contactInfo.map((contact, index) => {
                const IconComponent = contact.icon;

                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800">
                      <IconComponent className="h-4 w-4 text-blue-400" />
                    </div>
                    {contact.href.startsWith('tel:') || contact.href.startsWith('mailto:') ? (
                      <a
                        href={contact.href}
                        className="text-sm text-slate-300 transition-colors hover:text-blue-400"
                      >
                        {contact.label}
                      </a>
                    ) : (
                      <span className="text-sm text-slate-300">{contact.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-5 lg:border-0 lg:bg-transparent lg:p-0">
            <h4 className="mb-4 font-semibold text-white">Follow Us</h4>
            <p className="mb-4 text-sm text-slate-300">
              Stay connected for the latest updates and property news.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social, index) => {
                const IconComponent = social.icon;

                return (
                  <a
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 transition-colors hover:bg-blue-600"
                  >
                    <IconComponent className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[1.5rem] bg-slate-800 p-4 md:mt-12 md:p-6">
          <div className="flex flex-col items-center gap-5 lg:flex-row lg:gap-6">
            <div className="flex-1 text-center lg:text-left">
              <h4 className="mb-2 text-lg font-bold text-white md:text-xl">
                Get the Property Listify App
              </h4>
              <p className="text-sm text-slate-300 md:text-base">
                Search for properties on the go. Available on iOS and Android.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                variant="outline"
                className="h-auto justify-start rounded-2xl border-slate-600 bg-slate-900 px-4 py-2.5 text-white hover:bg-slate-700"
              >
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-sm bg-white"></div>
                  <div className="text-left">
                    <div className="text-xs">Download on the</div>
                    <div className="text-sm font-semibold">App Store</div>
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start rounded-2xl border-slate-600 bg-slate-900 px-4 py-2.5 text-white hover:bg-slate-700"
              >
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-sm bg-white"></div>
                  <div className="text-left">
                    <div className="text-xs">Get it on</div>
                    <div className="text-sm font-semibold">Google Play</div>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 bg-slate-950">
        <div className="container mx-auto px-4 py-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <div className="flex flex-col items-center justify-between gap-3 md:flex-row md:gap-4">
            <div className="text-center text-sm text-slate-400 md:text-left">
              © 2026 Property Listify. All rights reserved. Made with{' '}
              <Heart className="inline h-3 w-3 fill-red-500 text-red-500" /> in South Africa.
            </div>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
              <div className="flex items-center gap-1 text-sm text-slate-400">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span>Rated 4.8/5 by 10,000+ users</span>
              </div>

              <button
                onClick={scrollToTop}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 transition-colors hover:bg-blue-600"
                aria-label="Scroll to top"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
