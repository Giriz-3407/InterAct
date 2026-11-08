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

// Timeout in ms (30 seconds to allow for Render free instance cold starts)
const TIMEOUT_MS = 30000;

const handleFetchError = (err: any) => {
  if (err.name === 'AbortError') {
    throw new Error('Connection timed out. The backend server took too long to respond (Render free instances take ~50s to wake up from idle). Please try again.');
  }
  if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('fetch failed') || err.message.includes('Load failed') || err.message.includes('NetworkError'))) {
    throw new Error('Backend server is currently unavailable. Please verify the backend URL and service status.');
  }
  throw err;
};

const parseResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    let errMsg = `API error: ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData && errData.detail) {
        errMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
      }
    } catch {
      // ignore JSON parse error
    }
    throw new Error(errMsg);
  }
  return res.json() as Promise<T>;
};

export const apiClient = {
  async get<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(getFullUrl(url), {
        method: 'GET',
        headers: getHeaders(headers),
        signal: controller.signal,
      });
      return await parseResponse<T>(res);
    } catch (err: any) {
      return handleFetchError(err);
    } finally {
      clearTimeout(timer);
    }
  },

  async post<T>(url: string, body: any, headers: Record<string, string> = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(getFullUrl(url), {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json', ...headers }),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      return await parseResponse<T>(res);
    } catch (err: any) {
      return handleFetchError(err);
    } finally {
      clearTimeout(timer);
    }
  },

  async put<T>(url: string, body: any, headers: Record<string, string> = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(getFullUrl(url), {
        method: 'PUT',
        headers: getHeaders({ 'Content-Type': 'application/json', ...headers }),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      return await parseResponse<T>(res);
    } catch (err: any) {
      return handleFetchError(err);
    } finally {
      clearTimeout(timer);
    }
  },

  async delete<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(getFullUrl(url), {
        method: 'DELETE',
        headers: getHeaders(headers),
        signal: controller.signal,
      });
      return await parseResponse<T>(res);
    } catch (err: any) {
      return handleFetchError(err);
    } finally {
      clearTimeout(timer);
    }
  },
};
