import { Link, useLocation } from 'wouter';
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
  Key,
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

export function ModernFooter() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Handle newsletter subscription
      console.log('Subscribe:', email);
      setEmail('');
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const footerSections = [
    {
      title: 'Property',
      icon: Home,
      links: [
        { label: 'Houses for Sale', href: '/property-for-sale?propertyType=house' },
        { label: 'Apartments for Sale', href: '/property-for-sale?propertyType=apartment' },
        { label: 'Townhouses for Sale', href: '/property-for-sale?propertyType=townhouse' },
        { label: 'Houses to Rent', href: '/property-to-rent?propertyType=house' },
        { label: 'Apartments to Rent', href: '/property-to-rent?propertyType=apartment' },
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
      {/* Newsletter Section */}
      <section className="border-b border-slate-800">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-4">Stay Updated with Latest Property Trends</h3>
            <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
              Get exclusive property listings, market insights, and expert tips delivered to your
              inbox.
            </p>

            <form
              onSubmit={handleSubscribe}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-blue-500"
                required
              />
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Subscribe Now
              </Button>
            </form>

            <p className="text-xs text-slate-400 mt-3">
              By subscribing, you agree to our Privacy Policy and Terms of Service.
            </p>
          </div>
        </div>
      </section>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8">
          {/* Footer Sections */}
          {footerSections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <div key={index} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-white">{section.title}</h4>
                </div>

                <ul className="space-y-2">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link href={link.href}>
                        <a className="text-slate-300 hover:text-blue-400 transition-colors text-sm">
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

        {/* Popular Cities */}
        <div className="border-t border-slate-800 mt-12 pt-8">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Popular Cities
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {popularCities.map((city, index) => (
              <Link
                key={index}
                href={`/property-for-sale/${city.province.toLowerCase().replace(/\s+/g, '-')}/${city.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <a className="text-slate-300 hover:text-blue-400 transition-colors text-sm">
                  {city.name}
                </a>
              </Link>
            ))}
          </div>
        </div>

        {/* Contact Info & Social Links */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-800 mt-12 pt-8">
          {/* Contact Information */}
          <div>
            <h4 className="font-semibold text-white mb-4">Get in Touch</h4>
            <div className="space-y-3">
              {contactInfo.map((contact, index) => {
                const IconComponent = contact.icon;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center">
                      <IconComponent className="w-4 h-4 text-blue-400" />
                    </div>
                    {contact.href.startsWith('tel:') || contact.href.startsWith('mailto:') ? (
                      <a
                        href={contact.href}
                        className="text-slate-300 hover:text-blue-400 transition-colors text-sm"
                      >
                        {contact.label}
                      </a>
                    ) : (
                      <span className="text-slate-300 text-sm">{contact.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Follow Us</h4>
            <p className="text-slate-300 text-sm mb-4">
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
                    className="w-10 h-10 bg-slate-800 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
                  >
                    <IconComponent className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* App Download Section */}
        <div className="bg-slate-800 rounded-xl p-6 mt-12">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="flex-1 text-center lg:text-left">
              <h4 className="text-xl font-bold text-white mb-2">Get the Property Listify App</h4>
              <p className="text-slate-300">
                Search for properties on the go. Available on iOS and Android.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="bg-slate-900 border-slate-600 text-white hover:bg-slate-700"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-white rounded-sm"></div>
                  <div className="text-left">
                    <div className="text-xs">Download on the</div>
                    <div className="text-sm font-semibold">App Store</div>
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="bg-slate-900 border-slate-600 text-white hover:bg-slate-700"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-white rounded-sm"></div>
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

      {/* Bottom Bar */}
      <div className="border-t border-slate-800 bg-slate-950">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-slate-400 text-sm text-center md:text-left">
              © 2026 Property Listify. All rights reserved. Made with{' '}
              <Heart className="w-3 h-3 inline fill-red-500 text-red-500" /> in South Africa.
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-slate-400 text-sm">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span>Rated 4.8/5 by 10,000+ users</span>
              </div>

              <button
                onClick={scrollToTop}
                className="w-8 h-8 bg-slate-800 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
                aria-label="Scroll to top"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
