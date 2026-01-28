import { render, screen } from '@testing-library/react';
import { HeroLocation } from '../HeroLocation';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom'; // or wouter if used, but HeroLocation uses generic Breadcrumbs?
// Checking HeroLocation imports: import { Breadcrumbs } from '@/components/search'; which uses wouter Link.
// So we need a router context. Wouter uses its own, but let's check what wrappers are needed.
import { Router } from 'wouter';

describe('HeroLocation', () => {
  const defaultProps = {
    title: 'Cape Town',
    subtitle: 'The Mother City',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Cape Town', href: '/cape-town' },
    ],
    stats: {
      totalListings: 1500,
      avgPrice: 2500000,
    },
  };

  it('renders title and subtitle correctly', () => {
    render(
      <Router>
        <HeroLocation {...defaultProps} />
      </Router>,
    );

    expect(screen.getByRole('heading', { name: 'Cape Town', level: 1 })).toBeDefined();
    expect(screen.getByText('The Mother City')).toBeDefined();
  });

  it('renders stats correctly', () => {
    render(
      <Router>
        <HeroLocation {...defaultProps} />
      </Router>,
    );

    expect(screen.getByText(/1.*500/)).toBeDefined();
    // Avg price regex
    expect(screen.getByText(/2.*500.*000/)).toBeDefined();
  });

  it('renders background image when provided', () => {
    const propsWithImage = {
      ...defaultProps,
      backgroundImage: 'https://example.com/image.jpg',
    };

    render(
      <Router>
        <HeroLocation {...propsWithImage} />
      </Router>,
    );

    const img = screen.getByAltText('Cape Town') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('example.com/image.jpg');
  });
});
