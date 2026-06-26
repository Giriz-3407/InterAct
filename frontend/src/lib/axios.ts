const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getFullUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const base = BASE_URL.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
};

const getToken = (): string | null => {
  return localStorage.getItem('interact_auth_token') || sessionStorage.getItem('interact_auth_token');
};

const getHeaders = (customHeaders: Record<string, string> = {}): Record<string, string> => {
  const headers: Record<string, string> = { ...customHeaders };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const apiClient = {
  async get<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
    try {
      const res = await fetch(getFullUrl(url), {
        method: 'GET',
        headers: getHeaders(headers),
      });
      if (!res.ok) {
        let errMsg = `API error: ${res.statusText}`;
        try {
          const errData = await res.json();
          if (errData && errData.detail) {
            errMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
          }
        } catch {
          // ignore parsing error
        }
        throw new Error(errMsg);
      }
      return res.json() as Promise<T>;
    } catch (err: any) {
      if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('fetch failed') || err.message.includes('Load failed'))) {
        throw new Error('Backend server is currently unavailable');
      }
      throw err;
    }
  },

  async post<T>(url: string, body: any, headers: Record<string, string> = {}): Promise<T> {
    try {
      const res = await fetch(getFullUrl(url), {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json', ...headers }),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let errMsg = `API error: ${res.statusText}`;
        try {
          const errData = await res.json();
          if (errData && errData.detail) {
            errMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
          }
        } catch {
          // ignore parsing error
        }
        throw new Error(errMsg);
      }
      return res.json() as Promise<T>;
    } catch (err: any) {
      if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('fetch failed') || err.message.includes('Load failed'))) {
        throw new Error('Backend server is currently unavailable');
      }
      throw err;
    }
  },
};
