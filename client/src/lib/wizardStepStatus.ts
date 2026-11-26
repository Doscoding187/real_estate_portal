/**
 * What the step list shows for each step. A step gets the green "done" tick
 * only when it was visited AND its validation passes right now; a visited step
 * that fails validation shows an amber "needs attention" dot instead.
 */
export interface StepStatus {
  done: boolean;
  issues: boolean;
}

export function stepStatus(opts: { visited: boolean; valid: boolean }): StepStatus {
  return { done: opts.visited && opts.valid, issues: opts.visited && !opts.valid };
}
