/**
 * Property Listify Services — bounded visual design language.
 *
 * Services is a controlled vertical with its own identity, so its palette is
 * feature-local rather than a product-wide theme token. The values are taken
 * from the approved Services visual blueprint (deep ink navy, a single
 * emerald action green, and a pale mint tint surface).
 *
 * Contract note: nothing here may imply a capability the Services V1
 * contract does not support. There is no rating colour, no "premium" tier
 * colour, and no sponsored-placement treatment, because the platform does not
 * offer ratings, paid placement, or ranked placement.
 */

export const SERVICES_PALETTE = {
  /** Deepest ink, used for hero gradients and the page footer. */
  ink: '#02111E',
  /** Navy band colour for dark sections. */
  navy: '#071829',
  /** Raised navy panel inside a dark band. */
  navyRaised: '#0D2237',
  /** The single action colour for the whole Services surface. */
  green: '#168363',
  /** Hover/pressed state for the action colour. */
  greenHover: '#116E54',
  /** Soft green wash behind a green label. */
  greenWash: '#E4F2EC',
  /** Pale mint tint used for icon wells and supporting cards. */
  mint: '#EDF8F6',
  /** Hairline border colour. */
  line: '#E3EBF0',
  /** Strong body heading colour on light surfaces. */
  inkText: '#0B1B2A',
  /** Secondary body copy colour. */
  bodyText: '#4B5C6B',
} as const;

/**
 * Reusable class strings for the recurring Services compositions. Keeping them
 * here stops the same emerald/ink combination drifting between surfaces.
 */
export const servicesUi = {
  /** Primary action: the only filled green button in the Services surface. */
  action:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-[#168363] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#116E54] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168363] disabled:cursor-not-allowed disabled:opacity-45',
  /** Secondary action: green outline on a light surface. */
  actionOutline:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-[#168363] bg-white px-5 py-3 text-sm font-semibold text-[#168363] transition hover:bg-[#EDF8F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168363] disabled:cursor-not-allowed disabled:opacity-45',
  /** Neutral action: a hairline outline used for secondary navigation. */
  actionNeutral:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-[#E3EBF0] bg-white px-5 py-3 text-sm font-semibold text-[#0B1B2A] transition hover:border-[#168363] hover:text-[#168363] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168363]',
  /** Small uppercase eyebrow used above section headings. */
  eyebrow: 'text-[11px] font-semibold uppercase tracking-[0.18em] text-[#168363]',
  /** Section heading on a light surface. */
  heading:
    'font-["Sora"] text-3xl font-bold tracking-[-0.035em] text-[#0B1B2A] md:text-[38px] md:leading-[1.08]',
  /** Body copy on a light surface. */
  body: 'text-sm leading-7 text-[#4B5C6B]',
  /** The single hairline used across light Services surfaces. */
  surface: 'rounded-2xl border border-[#E3EBF0] bg-white',
  /** Pale mint supporting panel. */
  tintPanel: 'rounded-2xl border border-[#D8EDE7] bg-[#EDF8F6]',
  /** Dark band container. */
  darkBand: 'bg-[#071829] text-white',
  /** A green label chip, used for verification and status. */
  greenChip:
    'inline-flex items-center gap-1.5 rounded-full bg-[#E4F2EC] px-2.5 py-1 text-[11px] font-semibold text-[#116E54]',
  /** A muted chip for neutral metadata. */
  neutralChip:
    'inline-flex items-center gap-1.5 rounded-full border border-[#E3EBF0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#4B5C6B]',
} as const;

/**
 * A deterministic brand plate for a provider that has not published a logo.
 *
 * The platform has no provider photo library, and inventing stock imagery for
 * a real business would misrepresent it. The plate is decorative only: it is
 * derived from the provider's own name so the same provider always looks the
 * same, and it never implies a photograph of the business.
 */
export function providerBrandPlate(companyName: string): {
  from: string;
  to: string;
  ink: string;
} {
  const palettes = [
    { from: '#0D2237', to: '#168363', ink: '#FFFFFF' },
    { from: '#12303F', to: '#2E6F63', ink: '#EAF6F1' },
    { from: '#1A2B3C', to: '#3E6A8C', ink: '#EAF2F9' },
    { from: '#0B2033', to: '#2C5F4A', ink: '#EAF5EE' },
    { from: '#16283A', to: '#5A6B3F', ink: '#F2F4E8' },
    { from: '#0E2A3D', to: '#1F5F73', ink: '#E6F4F5' },
    { from: '#1C2333', to: '#4A5A7A', ink: '#EDF0F8' },
    { from: '#0C2436', to: '#3F6B58', ink: '#EAF5EE' },
  ];
  let hash = 0;
  for (let index = 0; index < companyName.length; index += 1) {
    hash = (hash * 31 + companyName.charCodeAt(index)) % 100000;
  }
  const palette = palettes[hash % palettes.length]!;
  return palette;
}
