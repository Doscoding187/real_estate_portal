import { describe, expect, it } from 'vitest';
import { generateSteps } from './ProgressIndicator';

describe('generateSteps navigation access', () => {
  it('keeps the next step inaccessible until the current step is valid', () => {
    expect(generateSteps(['Intent', 'Type'], 1, [])[1].isAccessible).toBe(false);
    expect(generateSteps(['Intent', 'Type'], 1, [], undefined, true)[1].isAccessible).toBe(true);
  });

  it('keeps completed steps and backward navigation accessible', () => {
    const steps = generateSteps(['Intent', 'Type', 'Details'], 2, [1]);

    expect(steps[0].isComplete).toBe(true);
    expect(steps[0].isAccessible).toBe(true);
    expect(steps[2].isAccessible).toBe(false);
  });
});
