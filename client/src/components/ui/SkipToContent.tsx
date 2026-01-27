/**
 * Skip to Content Link
 *
 * Allows keyboard users to skip navigation and go directly to main content.
 * Requirements: 5.1, 5.6
 *
 * Features:
 * - Hidden until focused
 * - Keyboard accessible
 * - WCAG AA compliant
 * - Smooth scroll to content
 */

import { useEffect, useState } from 'react';

interface SkipToContentProps {
  targetId?: string;
  label?: string;
}

export function SkipToContent({
  targetId = 'main-content',
  label = 'Skip to main content',
}: SkipToContentProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      className="skip-link"
      style={{
        position: 'absolute',
        top: isVisible ? '0' : '-40px',
        left: '0',
        background: '#6366f1',
        color: 'white',
        padding: '8px 16px',
        textDecoration: 'none',
        borderRadius: '0 0 4px 0',
        fontWeight: '600',
        zIndex: 9999,
        transition: 'top 0.2s ease-out',
      }}
    >
      {label}
    </a>
  );
}

/**
 * Skip Links Container
 *
 * Provides multiple skip links for complex pages.
 */

interface SkipLink {
  targetId: string;
  label: string;
}

interface SkipLinksProps {
  links: SkipLink[];
}

export function SkipLinks({ links }: SkipLinksProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav aria-label="Skip links" className="sr-only-focusable">
      <ul className="flex flex-col gap-2 p-4 bg-white border-b border-gray-200">
        {links.map((link, index) => (
          <li key={link.targetId}>
            <a
              href={`#${link.targetId}`}
              onClick={e => handleClick(e, link.targetId)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              className="skip-link"
              style={{
                position: focusedIndex === index ? 'static' : 'absolute',
                top: focusedIndex === index ? 'auto' : '-40px',
              }}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
