import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from '../Footer';
import { ModernFooter } from '../ModernFooter';
import { SupportContactLinks } from '../SupportContactLinks';

function expectOfficialLinks() {
  expect(
    screen.getAllByRole('link', { name: '064 020 2541' }).some(
      link => link.getAttribute('href') === 'tel:+27640202541',
    ),
  ).toBe(true);
  expect(
    screen.getAllByRole('link', { name: /whatsapp/i }).some(
      link => link.getAttribute('href') === 'https://wa.me/27640202541',
    ),
  ).toBe(true);
  expect(
    screen.getAllByRole('link', { name: 'support@propertylistifysa.co.za' })[0],
  ).toHaveAttribute('href', 'mailto:support@propertylistifysa.co.za');
}

describe('official support contact in public footers', () => {
  it('ModernFooter (HomeLayout) shows email, tel and WhatsApp links', () => {
    render(<ModernFooter />);
    expectOfficialLinks();
  });

  it('Footer shows email, tel and WhatsApp links', () => {
    render(<Footer />);
    expectOfficialLinks();
    expect(document.body.innerHTML).not.toContain('wa.link/mh6juy');
  });

  it('SupportContactLinks shows email, tel and WhatsApp links', () => {
    render(<SupportContactLinks />);
    expectOfficialLinks();
  });
});
