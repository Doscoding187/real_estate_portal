/**
 * Skip Link Component for Keyboard Navigation
 *
 * Provides skip links for keyboard users to bypass navigation
 * and jump directly to main content areas.
 */

import React from 'react';

interface SkipLinkProps {
  targetId: string;
  children: React.ReactNode;
}

export function SkipLink({ targetId, children }: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] 
        focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md 
        focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 
        focus:ring-offset-blue-600 transition-all"
    >
      {children}
    </a>
  );
}

interface SkipLinksProps {
  links?: Array<{ targetId: string; label: string }>;
}

export function SkipLinks({ links }: SkipLinksProps) {
  const defaultLinks = [
    { targetId: 'main-content', label: 'Skip to main content' },
    { targetId: 'main-navigation', label: 'Skip to navigation' },
  ];

  const skipLinks = links || defaultLinks;

  return (
    <nav aria-label="Skip links" className="skip-links">
      {skipLinks.map(link => (
        <SkipLink key={link.targetId} targetId={link.targetId}>
          {link.label}
        </SkipLink>
      ))}
    </nav>
  );
}

export default SkipLink;
