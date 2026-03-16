import { inArray, sql } from 'drizzle-orm';
import { affordabilityConfig } from '../../drizzle/schema';
import { getDb } from '../db';

export type AffordabilityConfig = {
  annualInterestRatePercent: number;
  termMonths: number;
  maxIncomeRepaymentRatio: number;
  disposableRepaymentRatio: number;
  affordabilityMinFactor: number;
  verifiedRequiredDocuments: number;
};

export const AFFORDABILITY_DEFAULT_CONFIG: AffordabilityConfig = {
  annualInterestRatePercent: 13.25,
  termMonths: 240,
  maxIncomeRepaymentRatio: 0.33,
  disposableRepaymentRatio: 0.55,
  affordabilityMinFactor: 0.82,
  verifiedRequiredDocuments: 3,
};

export const AFFORDABILITY_CONFIG_KEYS = [
  'annual_interest_rate_percent',
  'term_months',
  'max_income_repayment_ratio',
  'disposable_repayment_ratio',
  'affordability_min_factor',
  'verified_required_documents',
] as const;

type AffordabilityConfigKey = (typeof AFFORDABILITY_CONFIG_KEYS)[number];
type AffordabilityConfigField = keyof AffordabilityConfig;
type AffordabilityValueType = 'number' | 'integer';

type ConfigMeta = {
  field: AffordabilityConfigField;
  valueType: AffordabilityValueType;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
};

const CONFIG_META: Record<AffordabilityConfigKey, ConfigMeta> = {
  annual_interest_rate_percent: {
    field: 'annualInterestRatePercent',
    valueType: 'number',
    label: 'Annual Interest Rate (%)',
    description: 'Stress-tested annual interest rate used for affordability projection.',
    min: 0,
    max: 100,
    step: 0.01,
  },
  term_months: {
    field: 'termMonths',
    valueType: 'integer',
    label: 'Loan Term (Months)',
    description: 'Default bond term in months.',
    min: 12,
    max: 600,
    step: 1,
  },
  max_income_repayment_ratio: {
    field: 'maxIncomeRepaymentRatio',
    valueType: 'number',
    label: 'Max Income Repayment Ratio',
    description: 'Maximum housing repayment share from gross income.',
    min: 0.05,
    max: 1,
    step: 0.01,
  },
  disposable_repayment_ratio: {
    field: 'disposableRepaymentRatio',
    valueType: 'number',
    label: 'Disposable Repayment Ratio',
    description: 'Share of disposable income that can be allocated to housing repayment.',
    min: 0.05,
    max: 1,
    step: 0.01,
  },
  affordability_min_factor: {
    field: 'affordabilityMinFactor',
    valueType: 'number',
    label: 'Affordability Min Factor',
    description: 'Lower bound factor applied to projected max affordability.',
    min: 0.1,
    max: 1,
    step: 0.01,
  },
  verified_required_documents: {
    field: 'verifiedRequiredDocuments',
    valueType: 'integer',
    label: 'Verified Required Documents',
    description: 'Minimum uploaded documents required for verified readiness.',
    min: 1,
    max: 20,
    step: 1,
  },
};

export type AffordabilityConfigEntry = {
  key: AffordabilityConfigKey;
  field: AffordabilityConfigField;
  valueType: AffordabilityValueType;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  isActive: boolean;
  label: string;
  description: string;
  updatedAt: string | null;
  updatedByUserId: number | null;
  source: 'default' | 'db';
};

function cloneDefaults(): AffordabilityConfig {
  return {
    annualInterestRatePercent: AFFORDABILITY_DEFAULT_CONFIG.annualInterestRatePercent,
    termMonths: AFFORDABILITY_DEFAULT_CONFIG.termMonths,
    maxIncomeRepaymentRatio: AFFORDABILITY_DEFAULT_CONFIG.maxIncomeRepaymentRatio,
    disposableRepaymentRatio: AFFORDABILITY_DEFAULT_CONFIG.disposableRepaymentRatio,
    affordabilityMinFactor: AFFORDABILITY_DEFAULT_CONFIG.affordabilityMinFactor,
    verifiedRequiredDocuments: AFFORDABILITY_DEFAULT_CONFIG.verifiedRequiredDocuments,
  };
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || typeof value === 'undefined') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function normalizeConfigValue(meta: ConfigMeta, value: number): number {
  const clamped = Math.max(meta.min, Math.min(meta.max, value));
  if (meta.valueType === 'integer') {
    return Math.round(clamped);
  }
  return Number(clamped.toFixed(6));
}

function normalizeFallbackValue(field: AffordabilityConfigField): number {
  return Number(AFFORDABILITY_DEFAULT_CONFIG[field] || 0);
}

export async function getAffordabilityConfigSnapshot(): Promise<{
  config: AffordabilityConfig;
  entries: AffordabilityConfigEntry[];
}> {
  const config = cloneDefaults();
  const db = await getDb();
  if (!db) {
    return {
      config,
      entries: AFFORDABILITY_CONFIG_KEYS.map(key => {
        const meta = CONFIG_META[key];
        const defaultValue = normalizeFallbackValue(meta.field);
        return {
          key,
          field: meta.field,
          valueType: meta.valueType,
          value: defaultValue,
          defaultValue,
          min: meta.min,
          max: meta.max,
          step: meta.step,
          isActive: true,
          label: meta.label,
          description: meta.description,
          updatedAt: null,
          updatedByUserId: null,
          source: 'default' as const,
        };
      }),
    };
  }

  const rows = await db
    .select({
      configKey: affordabilityConfig.configKey,
      valueType: affordabilityConfig.valueType,
      valueNumber: affordabilityConfig.valueNumber,
      label: affordabilityConfig.label,
      description: affordabilityConfig.description,
      isActive: affordabilityConfig.isActive,
      updatedAt: affordabilityConfig.updatedAt,
      updatedByUserId: affordabilityConfig.updatedByUserId,
    })
    .from(affordabilityConfig)
    .where(inArray(affordabilityConfig.configKey, [...AFFORDABILITY_CONFIG_KEYS]));

  const rowByKey = new Map<AffordabilityConfigKey, (typeof rows)[number]>();
  for (const row of rows) {
    const key = String(row.configKey || '') as AffordabilityConfigKey;
    if ((AFFORDABILITY_CONFIG_KEYS as readonly string[]).includes(key)) {
      rowByKey.set(key, row);
    }
  }

  const entries = AFFORDABILITY_CONFIG_KEYS.map(key => {
    const meta = CONFIG_META[key];
    const row = rowByKey.get(key);
    const defaultValue = normalizeFallbackValue(meta.field);
    const rawValue = toFiniteNumber(row?.valueNumber);
    const isActive = row ? Number(row.isActive || 0) === 1 : true;
    const useDbValue = Boolean(row && isActive && rawValue !== null);
    const resolvedValue = useDbValue
      ? normalizeConfigValue(meta, rawValue as number)
      : normalizeConfigValue(meta, defaultValue);

    config[meta.field] = resolvedValue;

    return {
      key,
      field: meta.field,
      valueType: meta.valueType,
      value: resolvedValue,
      defaultValue,
      min: meta.min,
      max: meta.max,
      step: meta.step,
      isActive,
      label: String(row?.label || meta.label),
      description: String(row?.description || meta.description),
      updatedAt: row?.updatedAt ? String(row.updatedAt) : null,
      updatedByUserId:
        row?.updatedByUserId === null || typeof row?.updatedByUserId === 'undefined'
          ? null
          : Number(row.updatedByUserId),
      source: useDbValue ? ('db' as const) : ('default' as const),
    } satisfies AffordabilityConfigEntry;
  });

  return { config, entries };
}

export async function listAffordabilityConfigEntries() {
  const snapshot = await getAffordabilityConfigSnapshot();
  return snapshot.entries;
}

export async function updateAffordabilityConfigEntry(input: {
  key: AffordabilityConfigKey;
  value: number;
  updatedByUserId: number;
  label?: string | null;
  description?: string | null;
  isActive?: boolean;
}) {
  const meta = CONFIG_META[input.key];
  const numericValue = toFiniteNumber(input.value);
  if (numericValue === null) {
    throw new Error('Config value must be a finite number.');
  }

  const normalizedValue = normalizeConfigValue(meta, numericValue);
  const label = String(input.label || meta.label).trim().slice(0, 120) || meta.label;
  const description = String(input.description || meta.description).trim().slice(0, 1000);

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .insert(affordabilityConfig)
    .values({
      configKey: input.key,
      valueType: meta.valueType,
      valueNumber: normalizedValue.toString(),
      valueJson: null,
      label,
      description: description || null,
      isActive: input.isActive === false ? 0 : 1,
      updatedByUserId: Number(input.updatedByUserId),
    } as any)
    .onDuplicateKeyUpdate({
      set: {
        valueType: meta.valueType,
        valueNumber: normalizedValue.toString(),
        valueJson: null,
        label,
        description: description || null,
        isActive: input.isActive === false ? 0 : 1,
        updatedByUserId: Number(input.updatedByUserId),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      } as any,
    });

  const entries = await listAffordabilityConfigEntries();
  const updated = entries.find(entry => entry.key === input.key);
  if (!updated) {
    throw new Error(`Failed to load updated config row for key ${input.key}.`);
  }
  return updated;
}
