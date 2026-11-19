import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { LogoUploadZone } from './LogoUploadZone';

// Mimics the publisher dialogs: logoUrl is only committed when the upload succeeds.
function Harness({ succeed }: { succeed: boolean }) {
  const [logoUrl, setLogoUrl] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  return (
    <div>
      <LogoUploadZone
        value={logoUrl}
        uploading={uploading}
        onChange={file => {
          if (!file) return;
          setUploading(true);
          setTimeout(() => {
            if (succeed) setLogoUrl('https://example.test/logo.png');
            setUploading(false);
          }, 20);
        }}
      />
      <output data-testid="logo-url">{logoUrl}</output>
    </div>
  );
}

const pickFile = () => {
  const input = screen.getByLabelText('File input') as HTMLInputElement;
  const file = new File(['x'], 'logo.png', { type: 'image/png' });
  fireEvent.change(input, { target: { files: [file] } });
};

describe('LogoUploadZone failed upload', () => {
  it('clears the preview and leaves logoUrl empty when the upload fails', async () => {
    render(<Harness succeed={false} />);
    pickFile();
    await waitFor(() => expect(screen.getByAltText('Logo preview')).toBeTruthy());
    await waitFor(() => expect(screen.queryByAltText('Logo preview')).toBeNull(), {
      timeout: 2000,
    });
    expect(screen.getByTestId('logo-url').textContent).toBe('');
  });

  it('keeps the preview when the upload succeeds', async () => {
    render(<Harness succeed />);
    pickFile();
    await waitFor(() =>
      expect(screen.getByTestId('logo-url').textContent).toBe('https://example.test/logo.png'),
    );
    expect(screen.getByAltText('Logo preview')).toBeTruthy();
  });
});
