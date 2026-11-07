import type { ApiBody } from './api';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch('/api/v1' + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'same-origin',
  });
  let body: ApiBody<T>;
  try {
    body = (await res.json()) as ApiBody<T>;
  } catch {
    throw new Error('Sunucudan geçersiz yanıt');
  }
  if (!body.ok) {
    if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) window.location.href = '/login';
    throw new Error(body.error);
  }
  return body.data;
}
