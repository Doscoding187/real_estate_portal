import { describe, expect, it } from 'vitest';
import { hasHomePropertyPhoto } from '../homePropertyPhoto';

describe('homepage photo eligibility', () => {
  it('accepts delivered photos and rejects missing media, placeholders and unsafe URLs', () => {
    expect(hasHomePropertyPhoto('https://media.example.com/home.jpg')).toBe(true);
    expect(hasHomePropertyPhoto('/api/media/photo.jpg')).toBe(true);
    for (const value of [
      undefined,
      null,
      '',
      ' ',
      '/placeholder-property.jpg',
      '/assets/placeholder-home.jpg',
      '/logo.png',
      'javascript:alert(1)',
      '//other.example.com/photo.jpg',
    ]) {
      expect(hasHomePropertyPhoto(value)).toBe(false);
    }
  });
});
