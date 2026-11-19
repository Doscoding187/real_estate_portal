import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ESTATE_TYPE,
  ESTATE_TYPE_OPTIONS,
  OWNERSHIP_OPTIONS,
  SALES_STATUS_OPTIONS,
  SETTING_OPTIONS,
  buildTimelineLine,
  communityTypesForSetting,
  formatMonthYear,
  fromMonthInput,
  ownershipTagLabel,
  salesChoiceOf,
  salesChoicePatch,
  settingTagLabel,
  toMonthInput,
  validateAboutStep,
} from '../wizardBasicsAbout';
import { parseServerTimestamp, draftDisplayName } from '../wizardSaveStatus';

describe('Basics choices', () => {
  it('offers three settings', () => {
    expect(SETTING_OPTIONS.map(o => o.value)).toEqual(['standalone', 'gated', 'estate']);
  });

  it('lists the nine estate kinds with Standard security estate FIRST and as the default', () => {
    expect(ESTATE_TYPE_OPTIONS).toHaveLength(9);
    expect(ESTATE_TYPE_OPTIONS[0].value).toBe('standard');
    expect(ESTATE_TYPE_OPTIONS[0].label).toBe('Standard security estate');
    expect(DEFAULT_ESTATE_TYPE).toBe('standard');
    expect(ESTATE_TYPE_OPTIONS.map(o => o.label)).toEqual([
      'Standard security estate',
      'Lifestyle estate',
      'Golf estate',
      'Eco estate',
      'Equestrian estate',
      'Country estate',
      'Nature or wildlife estate',
      'Coastal estate',
      'Mountain estate',
    ]);
    for (const option of ESTATE_TYPE_OPTIONS) expect(option.description.length).toBeGreaterThan(30);
  });

  it('maps the single answer onto the older community types so existing readers keep working', () => {
    expect(communityTypesForSetting('standalone', undefined)).toEqual(['non_estate']);
    expect(communityTypesForSetting('gated', undefined)).toEqual(['housing_estate_non_security']);
    expect(communityTypesForSetting('estate', undefined)).toEqual(['security_estate_general']);
    expect(communityTypesForSetting('estate', 'standard')).toEqual(['security_estate_general']);
    expect(communityTypesForSetting('estate', 'golf')).toEqual(['golf_estate']);
    expect(communityTypesForSetting('estate', 'nature')).toEqual(['nature_estate']);
    expect(communityTypesForSetting('estate', 'coastal')).toEqual(['coastal_security_estate']);
    expect(communityTypesForSetting(null, undefined)).toEqual([]);
    // Exactly one community type, whatever was picked.
    for (const option of ESTATE_TYPE_OPTIONS) {
      expect(communityTypesForSetting('estate', option.value)).toHaveLength(1);
    }
  });

  it('labels the setting for the preview tag', () => {
    expect(settingTagLabel('standalone', undefined)).toBe('Standalone');
    expect(settingTagLabel('gated', undefined)).toBe('Gated community');
    expect(settingTagLabel('estate', 'standard')).toBe('Security estate');
    expect(settingTagLabel('estate', undefined)).toBe('Security estate');
    expect(settingTagLabel('estate', 'lifestyle')).toBe('Lifestyle estate');
    expect(settingTagLabel(undefined, undefined)).toBeNull();
  });
});

describe('About: sales status', () => {
  it('has four cards', () => {
    expect(SALES_STATUS_OPTIONS.map(o => o.value)).toEqual([
      'launching',
      'off_plan',
      'ready',
      'sold_out',
    ]);
  });

  it('saves each choice as a database status (+ stage for the two "selling" cards)', () => {
    expect(salesChoicePatch('launching')).toEqual({ status: 'launching-soon', salesStage: null });
    expect(salesChoicePatch('off_plan')).toEqual({ status: 'selling', salesStage: 'off_plan' });
    expect(salesChoicePatch('ready')).toEqual({ status: 'selling', salesStage: 'ready' });
    expect(salesChoicePatch('sold_out')).toEqual({ status: 'sold-out', salesStage: null });
  });

  it('reads a choice back, treating an older "selling" development as off-plan', () => {
    expect(salesChoiceOf({ status: 'launching-soon' })).toBe('launching');
    expect(salesChoiceOf({ status: 'selling', salesStage: 'ready' })).toBe('ready');
    expect(salesChoiceOf({ status: 'selling', salesStage: 'off_plan' })).toBe('off_plan');
    expect(salesChoiceOf({ status: 'selling' })).toBe('off_plan');
    expect(salesChoiceOf({ status: 'sold-out' })).toBe('sold_out');
    expect(salesChoiceOf({})).toBeNull();
  });
});

describe('About: ownership', () => {
  it('asks ownership once, including Share block and "Varies by house type"', () => {
    expect(OWNERSHIP_OPTIONS.map(o => o.label)).toEqual([
      'Full title',
      'Sectional title',
      'Life rights',
      'Leasehold',
      'Share block',
      'Varies by house type',
    ]);
    expect(ownershipTagLabel('varies')).toBe('Varies by house type');
    expect(ownershipTagLabel('share-block')).toBe('Share block');
    expect(ownershipTagLabel('full-title')).toBe('Full title');
    expect(ownershipTagLabel('')).toBeNull();
  });
});

describe('months and the timeline line', () => {
  it('round-trips a month input without time zone drift', () => {
    expect(fromMonthInput('2027-03')).toBe('2027-03-01');
    expect(toMonthInput('2027-03-01')).toBe('2027-03');
    expect(toMonthInput(new Date('2027-03-01T00:00:00Z'))).toBe('2027-03');
    expect(toMonthInput('2027-12-01T00:00:00.000Z')).toBe('2027-12');
    expect(fromMonthInput('')).toBeNull();
    expect(fromMonthInput('March')).toBeNull();
    expect(toMonthInput(null)).toBe('');
    expect(formatMonthYear('2027-03-01')).toBe('Mar 2027');
    expect(formatMonthYear('nope')).toBe('');
  });

  it('shows the phased handover wording', () => {
    expect(
      buildTimelineLine({
        status: 'selling',
        salesStage: 'off_plan',
        handoverDuringConstruction: true,
        expectedFirstHandoverDate: '2027-03-01',
        completionDate: '2029-12-01',
      }),
    ).toBe('First homes handed over from Mar 2027 · final completion Dec 2029');
  });

  it('shows one expected completion when not phased', () => {
    expect(
      buildTimelineLine({
        status: 'selling',
        salesStage: 'off_plan',
        handoverDuringConstruction: false,
        completionDate: '2028-06-01',
      }),
    ).toBe('Expected completion Jun 2028');
  });

  it('shows the launch month, and nothing for ready-to-move-in or sold out', () => {
    expect(buildTimelineLine({ status: 'launching-soon', launchDate: '2027-02-01' })).toBe(
      'Launching Feb 2027',
    );
    expect(buildTimelineLine({ status: 'launching-soon' })).toBeNull();
    expect(
      buildTimelineLine({ status: 'selling', salesStage: 'ready', completionDate: '2027-01-01' }),
    ).toBeNull();
    expect(buildTimelineLine({ status: 'sold-out' })).toBeNull();
  });
});

describe('About: what blocks Continue / publish matches what the wizard asks', () => {
  const complete = {
    name: 'Baltimore Lifestyle Estate',
    status: 'selling',
    salesStage: 'off_plan',
    ownershipTypes: ['full-title'],
    description: 'A secure estate of modern freestanding homes in North Riding, Johannesburg.',
    highlights: ['Clubhouse', 'Pool', 'Backup power'],
  };

  it('passes a complete About step', () => {
    expect(validateAboutStep(complete)).toEqual([]);
  });

  it('accepts "Varies by house type" and "Share block" as ownership', () => {
    expect(validateAboutStep({ ...complete, ownershipTypes: ['varies'] })).toEqual([]);
    expect(validateAboutStep({ ...complete, ownershipTypes: ['share-block'] })).toEqual([]);
  });

  it('asks for what is missing, by field', () => {
    const fields = validateAboutStep({}).map(e => e.field);
    expect(fields).toEqual(['name', 'status', 'ownershipTypes', 'description', 'highlights']);
  });

  it('does not ask for dates the wizard does not require', () => {
    // Launch month, final completion and expected completion are optional.
    expect(validateAboutStep({ ...complete, completionDate: null, launchDate: null })).toEqual([]);
  });

  it('requires the first handover month only when homes are handed over in phases', () => {
    expect(
      validateAboutStep({ ...complete, handoverDuringConstruction: true }).map(e => e.field),
    ).toEqual(['expectedFirstHandoverDate']);
    expect(
      validateAboutStep({
        ...complete,
        handoverDuringConstruction: true,
        expectedFirstHandoverDate: '2027-03-01',
      }),
    ).toEqual([]);
    // Switched to "ready to move in": phased handover no longer applies.
    expect(
      validateAboutStep({ ...complete, salesStage: 'ready', handoverDuringConstruction: true }),
    ).toEqual([]);
  });

  it('keeps the 50-character description and 3-highlight minimums', () => {
    expect(validateAboutStep({ ...complete, description: 'Too short' }).map(e => e.field)).toEqual([
      'description',
    ]);
    expect(validateAboutStep({ ...complete, highlights: ['One', 'Two'] }).map(e => e.field)).toEqual(
      ['highlights'],
    );
  });
});

describe('draft times and names (C20 follow-ups)', () => {
  it('parses the server "YYYY-MM-DD HH:mm:ss" timestamp as UTC', () => {
    expect(parseServerTimestamp('2026-11-19 10:00:00')?.toISOString()).toBe(
      '2026-11-19T10:00:00.000Z',
    );
    expect(parseServerTimestamp('2026-11-19T10:00:00.000Z')?.toISOString()).toBe(
      '2026-11-19T10:00:00.000Z',
    );
    expect(parseServerTimestamp(null)).toBeNull();
    expect(parseServerTimestamp('garbage')).toBeNull();
  });

  it('shows Untitled when a draft has no name', () => {
    expect(draftDisplayName('')).toBe('Untitled');
    expect(draftDisplayName('   ')).toBe('Untitled');
    expect(draftDisplayName(undefined)).toBe('Untitled');
    expect(draftDisplayName('Baltimore')).toBe('Baltimore');
  });
});
