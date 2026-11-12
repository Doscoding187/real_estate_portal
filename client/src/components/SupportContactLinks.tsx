import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL_HREF,
  SUPPORT_WHATSAPP_URL,
} from '@shared/supportContact';

/** Official support contact: email, call (tel:) and WhatsApp links. */
export function SupportContactLinks({ className = 'underline' }: { className?: string }) {
  return (
    <>
      <a className={className} href={`mailto:${SUPPORT_EMAIL}`}>
        {SUPPORT_EMAIL}
      </a>
      , call{' '}
      <a className={className} href={SUPPORT_PHONE_TEL_HREF}>
        {SUPPORT_PHONE_DISPLAY}
      </a>{' '}
      or{' '}
      <a className={className} href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
        WhatsApp
      </a>
    </>
  );
}
