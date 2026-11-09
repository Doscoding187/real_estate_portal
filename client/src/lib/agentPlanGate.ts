import { useSyncExternalStore } from 'react';

/**
 * Tiny shared store so any Agent surface (sidebar, top nav, listings, leads,
 * dashboard) can open the single PlanGateDialog rendered by the Agent shell.
 */
let open = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(listener => listener());
}

export function openPlanGate() {
  if (open) return;
  open = true;
  emit();
}

export function closePlanGate() {
  if (!open) return;
  open = false;
  emit();
}

export function resetPlanGateForTests() {
  open = false;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePlanGateOpen() {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
}

export const PLAN_PROMPT_SESSION_KEY = 'pl.agent.planPrompt.v1';

function readSession(): string | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage.getItem(PLAN_PROMPT_SESSION_KEY);
  } catch {
    return null;
  }
}

/**
 * Auto-prompt guard: at most once per browser session, and never again after a
 * dismissal. Returns true (and records the prompt) only when it may be shown.
 */
export function claimPlanPrompt(): boolean {
  if (readSession()) return false;
  try {
    window.sessionStorage.setItem(PLAN_PROMPT_SESSION_KEY, 'shown');
  } catch {
    return false;
  }
  return true;
}

/** Manual opens also count as shown so a dismissal is never followed by an auto-prompt. */
export function markPlanPromptSeen() {
  try {
    window.sessionStorage.setItem(PLAN_PROMPT_SESSION_KEY, 'shown');
  } catch {
    /* ignore */
  }
}

export const PLAN_PROMPT_TRIGGER_KEY = 'pl.agent.planPromptTrigger.v1';

/** Call after the profile is saved or the first draft is created. */
export function markPlanPromptTrigger() {
  try {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(PLAN_PROMPT_TRIGGER_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Consume the trigger; true only if one was pending. */
export function consumePlanPromptTrigger(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const pending = window.sessionStorage.getItem(PLAN_PROMPT_TRIGGER_KEY) === '1';
    if (pending) window.sessionStorage.removeItem(PLAN_PROMPT_TRIGGER_KEY);
    return pending;
  } catch {
    return false;
  }
}

/** Journey links to the package page open the in-workspace plan dialog instead. */
export function followAgentJourneyHref(href: string, navigate: (to: string) => void) {
  if (href === '/agent/select-package') {
    openPlanGate();
    return;
  }
  navigate(href);
}
