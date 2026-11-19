import { describe, expect, it } from 'vitest';
import { getVisibleSteps, WORKFLOWS } from '../workflows';
import { residentialSaleWorkflow } from '../workflows/residential-sale';
import { residentialRentWorkflow } from '../workflows/residential-rent';

const completeAbout = {
  name: 'Baltimore Lifestyle Estate',
  status: 'selling',
  salesStage: 'off_plan',
  ownershipTypes: ['varies'],
  description: 'A secure estate of modern freestanding homes in North Riding, Johannesburg.',
  highlights: ['Clubhouse', 'Pool', 'Backup power'],
  setting: 'estate',
};

describe.each([
  ['sale', residentialSaleWorkflow, 'for_sale'],
  ['rent', residentialRentWorkflow, 'for_rent'],
] as const)('residential %s workflow', (_label, workflow, transactionType) => {
  const data = { transactionType } as any;

  it('has the eight steps in order and no separate Marketing Summary', () => {
    const steps = getVisibleSteps(workflow, data);
    expect(steps.map(s => s.title)).toEqual([
      'Basics',
      'About',
      'Location',
      'Monthly costs',
      'Amenities',
      'Media',
      'House types',
      'Review & publish',
    ]);
    // Same step ids drafts and published developments already use.
    expect(steps.map(s => s.id)).toEqual([
      'configuration',
      'identity_market',
      'location',
      'governance_finances',
      'amenities_features',
      'development_media',
      'unit_types',
      'review_publish',
    ]);
    expect(steps.some(s => s.id === 'marketing_summary')).toBe(false);
  });

  it('Basics only asks for the setting', () => {
    const basics = workflow.steps[0];
    expect(basics.validate!({ ...data }).errors?.map(e => e.field)).toEqual(['setting']);
    expect(basics.validate!({ ...data, setting: 'standalone' }).valid).toBe(true);
  });

  it('About carries description and highlights, and accepts "varies" ownership', () => {
    const about = workflow.steps[1];
    expect(about.validate!({ ...data, ...completeAbout }).valid).toBe(true);
    expect(about.validate!({ ...data }).errors?.map(e => e.field)).toEqual([
      'name',
      'status',
      'ownershipTypes',
      'description',
      'highlights',
    ]);
  });
});

describe('workflow registry', () => {
  it('still serves sale and rent', () => {
    expect(WORKFLOWS.residential_sale).toBe(residentialSaleWorkflow);
    expect(WORKFLOWS.residential_rent).toBe(residentialRentWorkflow);
  });
});
