/**
 * src/utils/api.ts
 * Thin fetch wrapper that automatically attaches the Supabase JWT to every request.
 * Always uses the live Vercel backend — localhost is NOT available on mobile.
 */
  import { supabase } from '../lib/supabase';

export const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  }
  return 'https://admin-panel-delta-steel.vercel.app';
};

export const BASE_URL = getBaseUrl();

let tabRefreshPromise: Promise<string | null> | null = null;

export async function safeRefreshToken(): Promise<string | null> {
  if (tabRefreshPromise) {
    return tabRefreshPromise;
  }

  tabRefreshPromise = (async () => {
    try {
      if (typeof window !== 'undefined' && 'locks' in navigator) {
        const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
          ? AbortSignal.timeout(12000)
          : undefined;
        return await (navigator as any).locks.request('torque_auth_refresh_lock', signal ? { signal } : {}, async () => {
          const { data: { session } } = await supabase.auth.getSession();
          const nowSec = Math.floor(Date.now() / 1000);
          if (session?.access_token && session.expires_at && session.expires_at - nowSec > 60) {
            return session.access_token;
          }

          const { data, error } = await supabase.auth.refreshSession();
          if (error || !data.session) {
            return session?.access_token || null;
          }
          return data.session.access_token;
        });
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const nowSec = Math.floor(Date.now() / 1000);
        if (session?.access_token && session.expires_at && session.expires_at - nowSec > 60) {
          return session.access_token;
        }
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session) {
          return session?.access_token || null;
        }
        return data.session.access_token;
      }
    } catch {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
      } catch {
        return null;
      }
    } finally {
      tabRefreshPromise = null;
    }
  })();

  return tabRefreshPromise;
}

async function getValidToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const nowSec = Math.floor(Date.now() / 1000);
    const isExpiringSoon = session.expires_at ? (session.expires_at - nowSec < 90) : false;

    if (isExpiringSoon) {
      const refreshed = await safeRefreshToken();
      if (refreshed) return refreshed;
    }

    return session.access_token ?? null;
  } catch {
    return null;
  }
}

async function request<T = any>(method: string, path: string, body?: any, isRetry = false): Promise<T> {
  let token = await getValidToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = { method, headers };
  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  // Trim trailing slashes from the path to avoid Next.js redirects
  const cleanPath = path.replace(/\/$/, '');
  const url = `${BASE_URL}/api/v1${cleanPath}`;

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      // If 401 Unauthorized, attempt to refresh token once and retry
      if (response.status === 401 && !isRetry) {
        const refreshed = await safeRefreshToken();
        if (refreshed) {
          return request<T>(method, path, body, true);
        }
      }

      // Safely read error response - read as text first then try JSON
      let errData: any = {};
      try {
        const errText = await response.text();
        try {
          errData = JSON.parse(errText);
        } catch {
          errData = { error: errText || `HTTP error! status: ${response.status}` };
        }
      } catch {
        errData = { error: `HTTP error! status: ${response.status}` };
      }
      const errorMsg = errData.error || errData.detail || errData.message || `HTTP error! status: ${response.status}`;
      throw new Error(errorMsg);
    }
    // Safely parse success response
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      return {} as T;
    }
    try {
      return JSON.parse(responseText) as T;
    } catch {
      console.warn('[api] Response is not valid JSON:', responseText.substring(0, 200));
      throw new Error('Server returned invalid JSON response');
    }
  } catch (err: any) {
    throw new Error(err?.message || 'Network request failed');
  }
}

export const api = {
  get: <T = any>(path: string) => request<T>('GET', path),
  post: <T = any>(path: string, body?: any) => request<T>('POST', path, body),
  put: <T = any>(path: string, body?: any) => request<T>('PUT', path, body),
  patch: <T = any>(path: string, body?: any) => request<T>('PATCH', path, body),
  delete: <T = any>(path: string, body?: any) => request<T>('DELETE', path, body),
};
