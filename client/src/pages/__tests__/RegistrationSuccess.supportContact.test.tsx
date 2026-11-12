import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RegistrationSuccess from '../RegistrationSuccess';

vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
}));

describe('RegistrationSuccess official support contact', () => {
  it.each(['developer', 'agency', 'agent'] as const)(
    'shows official mailto, tel and WhatsApp links for %s',
    role => {
      render(<RegistrationSuccess role={role} />);
      expect(
        screen.getByRole('link', { name: 'support@propertylistifysa.co.za' }),
      ).toHaveAttribute('href', 'mailto:support@propertylistifysa.co.za');
      expect(screen.getByRole('link', { name: '064 020 2541' })).toHaveAttribute(
        'href',
        'tel:+27640202541',
      );
      expect(screen.getByRole('link', { name: /whatsapp/i })).toHaveAttribute(
        'href',
        'https://wa.me/27640202541',
      );
      expect(document.body.innerHTML).not.toContain('example.com');
    },
  );
});
