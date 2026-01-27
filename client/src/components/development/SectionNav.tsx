import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'units', label: 'Units' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'developer', label: 'Developer' },
  { id: 'location', label: 'Location' },
];

export function SectionNav() {
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const handleScroll = () => {
      // Scroll spy: find which section is in view
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Account for sticky header
      const top = element.offsetTop - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <nav
      className={cn(
        'bg-white border-b border-slate-200 transition-all duration-300',
      )}
    >
      <div className="container max-w-7xl mx-auto px-4">
        <div className="flex overflow-x-auto scrollbar-hide">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                'px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2',
                activeSection === section.id
                  ? 'text-orange-600 border-orange-600'
                  : 'text-slate-600 border-transparent hover:text-slate-900',
              )}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
