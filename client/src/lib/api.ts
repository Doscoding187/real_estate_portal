/**
 * Get the API URL for a given endpoint
 * Uses relative path to leverage Vite proxy
 */
export const getApiUrl = (endpoint: string) => {
  const baseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return baseUrl ? `${baseUrl}/${cleanEndpoint}` : `/api/${cleanEndpoint}`;
};

/**
 * Custom error class for API responses
 */
export class ApiError extends Error {
  status: number;
  body: any;

  constructor(status: number, message: string, body: any = null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/**
 * Centralized API fetch wrapper with comprehensive error handling
 */
export async function apiFetch<T = any>(endpoint: string, init?: RequestInit): Promise<T> {
  const url = getApiUrl(endpoint);

  console.log(`[API] ${init?.method || 'GET'} ${url}`);

  const res = await fetch(url, {
    credentials: 'include', // if using cookies/sessions
    headers: { Accept: 'application/json', ...(init?.headers || {}) },
    ...init,
  });

  const text = await res.text(); // always read raw body first
  const contentType = res.headers.get('content-type') || '';

  console.log(`[API] Response ${res.status} ${res.statusText} (${contentType})`);

  if (!res.ok) {
    // Try parse JSON body if possible, else return text
    let body = text;
    if (contentType.includes('application/json')) {
      try {
        body = JSON.parse(text);
        console.error(`[API] Error response:`, body);
      } catch {
        // leave as text
        console.error(`[API] Error response (text):`, text);
      }
    } else {
      console.error(`[API] Error response (non-JSON):`, text);
    }
    throw new ApiError(res.status, `HTTP ${res.status} on ${endpoint}`, body);
  }

  if (!text) {
    console.log(`[API] Empty success response for ${endpoint}`);
    return null as unknown as T; // empty success body => return null
  }

  if (!contentType.includes('application/json')) {
    // If you expect JSON, treat this as an error or return raw text
    console.warn(`[API] Non-JSON response for ${endpoint}:`, text);
    return text as unknown as T;
  }

  try {
    const parsed = JSON.parse(text);
    console.log(`[API] Success response:`, parsed);
    return parsed as T;
  } catch (error) {
    console.error(`[API] Invalid JSON response for ${endpoint}:`, text);
    throw new ApiError(res.status, 'Invalid JSON response', text);
  }
}
