/** Basic contact syntax only; accepts local and international phone formats. */
export function agentProfilePhoneError(value?: string | null): string | null {
  const phone = value?.trim() || '';
  if (!phone) return 'Please enter your phone number.';
  const digits = phone.replace(/\D/g, '');
  if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
    return 'Enter a valid phone number, for example 082 123 4567 or +27 82 123 4567.';
  }
  return null;
}
