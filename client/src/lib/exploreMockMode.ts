const STORAGE_KEY = 'explore.mock.mode';

function readQueryFlag(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const flag = params.get('exploreMock');
  return flag === '1' || flag === 'true';
}

export function isExploreMockMode(): boolean {
  if (import.meta.env.VITE_EXPLORE_MOCK_MODE === '1') return true;
  if (readQueryFlag()) return true;
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

export function setExploreMockMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
}
