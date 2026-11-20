/**
 * Which published development document is which (public pages).
 *
 * Documents saved by the wizard carry a `documentType` (brochure, site_plan,
 * spec_sheet, price_list). Older documents have none, so for those only the file
 * name or title is used, and never "the first document of any kind".
 */
type DocItem = unknown;

const meta = (item: DocItem): string =>
  item && typeof item === 'object'
    ? [
        (item as any).fileName,
        (item as any).filename,
        (item as any).name,
        (item as any).title,
        (item as any).label,
        (item as any).url,
        typeof (item as any).key === 'string' ? (item as any).key : '',
      ]
        .filter((v): v is string => typeof v === 'string' && v !== '')
        .join(' ')
    : typeof item === 'string'
      ? item
      : '';

const typeOf = (item: DocItem): string | null => {
  const t = item && typeof item === 'object' ? (item as any).documentType : null;
  return typeof t === 'string' && t ? t : null;
};

const pick = (
  items: DocItem[],
  resolveUrl: (item: DocItem) => string | null,
  typed: string,
  legacy: RegExp,
): string | null => {
  for (const item of items) {
    const url = resolveUrl(item);
    if (!url) continue;
    const type = typeOf(item);
    if (type ? type === typed : legacy.test(meta(item))) return url;
  }
  return null;
};

/** Brochure button: only a brochure (typed, or an untyped legacy file named like one). */
export const pickBrochureUrl = (
  items: DocItem[],
  resolveUrl: (item: DocItem) => string | null,
): string | null => pick(items, resolveUrl, 'brochure', /brochure/i);

/** Spec sheet link: typed spec sheet, or an untyped legacy file named like one. */
export const pickSpecSheetUrl = (
  items: DocItem[],
  resolveUrl: (item: DocItem) => string | null,
): string | null => pick(items, resolveUrl, 'spec_sheet', /spec(?:ification)?|finish(?:es)?|fitting/i);
