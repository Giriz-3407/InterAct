const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getFullUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const base = BASE_URL.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
};

export const apiClient = {
  async get<T>(url: string): Promise<T> {
    const res = await fetch(getFullUrl(url));
    if (!res.ok) throw new Error(`API error: ${res.statusText}`);
    return res.json() as Promise<T>;
  },

  async post<T>(url: string, body: any): Promise<T> {
    const res = await fetch(getFullUrl(url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API error: ${res.statusText}`);
    return res.json() as Promise<T>;
  },
};
