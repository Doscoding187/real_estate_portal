import { useEffect, useCallback, useRef } from 'react';

const DRAFT_KEY = 'agency_onboarding_draft';
const DRAFT_EXPIRY_HOURS = 72;

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export interface OnboardingDraftData {
  basicInfo?: any;
  branding?: any;
  teamSetup?: any;
  planSelection?: any;
}

interface DraftStorage {
  data: OnboardingDraftData;
  step: number;
  savedAt: string;
  expiresAt: string;
}

export function useOnboardingDraft() {
  const saveDraft = useCallback(
    debounce((data: Partial<OnboardingDraftData>, step: number) => {
      const draft: DraftStorage = {
        data,
        step,
        savedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + DRAFT_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
      };

      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (error) {
        console.error('Failed to save onboarding draft:', error);
      }
    }, 1000),
    [],
  );

  const loadDraft = useCallback((): DraftStorage | null => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (!stored) return null;

      const draft = JSON.parse(stored) as DraftStorage;

      // Check if expired
      if (new Date(draft.expiresAt) < new Date()) {
        localStorage.removeItem(DRAFT_KEY);
        return null;
      }

      return draft;
    } catch (error) {
      console.error('Failed to load onboarding draft:', error);
      return null;
    }
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.error('Failed to clear onboarding draft:', error);
    }
  }, []);

  return { saveDraft, loadDraft, clearDraft };
}
