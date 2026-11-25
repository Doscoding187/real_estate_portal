/**
 * What the wizard captures and the public development page shows, honestly:
 * only what was given. Anything not given is left out (never "R0", never a guess).
 */
import { buildTimelineLine, settingTagLabel } from './wizardBasicsAbout';
import { formatRandAmount } from './wizardHouseTypes';

export type PublishedFacts = {
  /** "Security estate · Lifestyle estate", "Gated community", "Standalone", or null. */
  estateLabel: string | null;
  /** Optional "Phase 2". */
  phaseLabel: string | null;
  /** "First homes handed over from Mar 2027 · final completion Dec 2029", "Launching Mar 2027", or null. */
  timelineLine: string | null;
  /** Each highlight once, in the order the publisher chose. */
  highlights: string[];
  /** Monthly cost lines that were given. */
  costs: Array<{ label: string; value: string }>;
  /** The same amounts as numbers for the cost breakdown; null/false when not given. */
  amounts: {
    ratesAmount: number | null;
    levyAmount: number | null;
    levyLabel: string | null;
    noLevy: boolean;
  };
};

const parse = (value: unknown): Record<string, any> => {
  if (value && typeof value === 'object') return value as Record<string, any>;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const amount = (range: any): number => {
  const min = Number(range?.min ?? 0) || 0;
  const max = Number(range?.max ?? 0) || 0;
  return Math.max(min, max);
};

export function buildPublishedFacts(input: {
  estateSpecs?: unknown;
  highlights?: unknown;
  status?: unknown;
  launchDate?: unknown;
  completionDate?: unknown;
}): PublishedFacts {
  const specs = parse(input.estateSpecs);
  const setting = typeof specs.setting === 'string' ? specs.setting : '';
  const estateType = typeof specs.estateType === 'string' ? specs.estateType : '';
  const tag = settingTagLabel(setting, estateType);
  const estateLabel = !tag
    ? null
    : setting === 'estate' && estateType && estateType !== 'standard'
      ? `Security estate · ${tag}`
      : tag;

  const timelineLine = buildTimelineLine({
    status: input.status,
    salesStage: specs.salesStage,
    launchDate: input.launchDate,
    completionDate: input.completionDate,
    expectedFirstHandoverDate: specs.firstHandoverDate,
    handoverDuringConstruction: specs.handoverInPhases === true,
  });

  const seen = new Set<string>();
  const highlights = (Array.isArray(input.highlights) ? input.highlights : [])
    .map(h => String(h ?? '').trim())
    .filter(h => {
      if (!h || seen.has(h.toLowerCase())) return false;
      seen.add(h.toLowerCase());
      return true;
    });

  const costs: PublishedFacts['costs'] = [];
  const amounts: PublishedFacts['amounts'] = {
    ratesAmount: null,
    levyAmount: null,
    levyLabel: null,
    noLevy: false,
  };
  const rates = amount(specs.rightsAndTaxes);
  if (rates > 0) {
    amounts.ratesAmount = rates;
    costs.push({ label: 'Rates & taxes', value: `${formatRandAmount(rates)} a month (estimate)` });
  }
  if (specs.hasHOA === false) {
    amounts.noLevy = true;
    costs.push({ label: 'Levy', value: 'No levy' });
  } else {
    const levy = amount(specs.levyRange);
    if (levy > 0) {
      const label = specs.governanceType === 'body_corporate' ? 'Body corporate levy' : 'HOA levy';
      amounts.levyAmount = levy;
      amounts.levyLabel = label;
      costs.push({ label, value: `${formatRandAmount(levy)} a month (estimate)` });
    }
  }

  return {
    estateLabel,
    phaseLabel: typeof specs.phaseLabel === 'string' && specs.phaseLabel.trim() ? specs.phaseLabel.trim() : null,
    timelineLine,
    highlights,
    costs,
    amounts,
  };
}
