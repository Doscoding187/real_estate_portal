// ===== Helper to safely read environment variables =====
function getEnvVar(name: string, fallback: string) {
  // use any cast to avoid TypeScript index type issues with import.meta.env
  const value = (import.meta.env as any)[name];
  if (!value) {
    console.warn(`⚠️ Environment variable ${name} is not defined. Using fallback: ${fallback}`);
    return fallback;
  }
  return value;
}

// ===== App URLs & Settings =====
export const VITE_API_URL = getEnvVar('VITE_API_URL', 'http://localhost:3000');
export const VITE_APP_LOGO = getEnvVar('VITE_APP_LOGO', '/logo.png');
export const VITE_APP_TITLE = getEnvVar('VITE_APP_TITLE', 'Property Listify');

// ===== Aliases for backward compatibility =====
export const APP_TITLE = VITE_APP_TITLE;
export const APP_LOGO = VITE_APP_LOGO;

export const VITE_ANALYTICS_ENDPOINT = getEnvVar(
  'VITE_ANALYTICS_ENDPOINT',
  'http://localhost:3000/analytics',
);
export const VITE_ANALYTICS_WEBSITE_ID = getEnvVar('VITE_ANALYTICS_WEBSITE_ID', 'local-test-site');

// ===== Login URL =====
export const getLoginUrl = (): string => {
  // Use frontend login route instead of backend auth route
  return '/login';
};

// NOTE: Temporary debug logs removed. Use explicit logging where needed.
