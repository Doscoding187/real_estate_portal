import { render, screen } from '../../test-utils/render';
import { afterEach, describe, it, expect, vi } from 'vitest';
import PartnerProfile from '../PartnerProfile';

describe('PartnerProfile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when partnerId param is missing', () => {
    const { container } = render(<PartnerProfile />);
    expect(container).toBeEmptyDOMElement();
  });
});
