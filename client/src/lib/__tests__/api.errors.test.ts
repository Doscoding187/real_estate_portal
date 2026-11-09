import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiError } from '../api';

describe('apiFetch error handling', () => {
  afterEach(() => vi.unstubAllGlobals());

  const respond = (status: number, body: string, contentType: string) =>
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(body, { status, headers: { 'content-type': contentType } }),
      ),
    );

  it('surfaces the JSON error message and keeps the status', async () => {
    respond(409, JSON.stringify({ error: 'Paid access is not open yet.' }), 'application/json');
    const error = (await apiFetch('/agent/x').catch(e => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.message).toBe('Paid access is not open yet.');
    expect(error.serverMessage).toBe('Paid access is not open yet.');
  });

  it('keeps the HTTP message for non-JSON bodies', async () => {
    respond(502, '<html>bad gateway</html>', 'text/html');
    const error = (await apiFetch('/agent/x').catch(e => e)) as ApiError;
    expect(error.status).toBe(502);
    expect(error.message).toBe('HTTP 502 on /agent/x');
    expect(error.serverMessage).toBeNull();
  });

  it('never uses server text as the message for 5xx', async () => {
    respond(500, JSON.stringify({ error: 'SQL exploded at host x' }), 'application/json');
    const error = (await apiFetch('/agent/x').catch(e => e)) as ApiError;
    expect(error.message).toBe('HTTP 500 on /agent/x');
    expect(error.serverMessage).toBe('SQL exploded at host x');
  });
});
