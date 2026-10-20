import { describe, expect, it } from 'vitest';
import {
  defaultPropertyEnquiryMessage,
  propertyEnquiryMessageText,
} from './propertyEnquiryMessage';
describe('property enquiry message presentation', () => {
  it('names the selected property in ready-to-edit enquiry and viewing messages', () => {
    expect(defaultPropertyEnquiryMessage('Garden home', 'general')).toBe(
      "Hi, I'm interested in Garden home. Is it still available?",
    );
    expect(defaultPropertyEnquiryMessage('Garden home', 'viewing')).toContain(
      'arrange a viewing of Garden home',
    );
  });
  it.each(['[GENERAL ENQUIRY] ', '[VIEWING REQUEST] '])(
    'hides only the system prefix %s',
    prefix => {
      expect(propertyEnquiryMessageText(prefix + 'Please call after 5.')).toBe(
        'Please call after 5.',
      );
    },
  );
  it('preserves buyer text containing meaningful brackets', () => {
    expect(propertyEnquiryMessageText('[BUDGET R2m] Is this home available?')).toBe(
      '[BUDGET R2m] Is this home available?',
    );
    expect(propertyEnquiryMessageText('Is [GENERAL ENQUIRY] displayed here?')).toBe(
      'Is [GENERAL ENQUIRY] displayed here?',
    );
  });
  it('handles absent messages without inventing buyer text', () => {
    expect(propertyEnquiryMessageText(null)).toBe('');
  });
});
