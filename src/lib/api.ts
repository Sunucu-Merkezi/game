import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { type AuthUser, getSessionUser } from './auth';
import { isLimited } from './rate-limit';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type ApiBody<T> = { ok: true; data: T } | { ok: false; error: string };

export const json = <T>(data: T, status = 200): NextResponse<ApiBody<T>> => NextResponse.json({ ok: true, data }, { status });

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

/** Rate limit uygular; limit aşıldıysa 429 fırlatır. */
export function rateLimit(req: Request, bucket: string, max: number, windowMs: number): void {
  if (isLimited(`${bucket}:${clientIp(req)}`, max, windowMs)) throw new ApiError(429, 'Çok fazla istek. Biraz bekle.');
}

export async function requireUser(): Promise<AuthUser> {
  const u = await getSessionUser();
  if (!u) throw new ApiError(401, 'Oturum gerekli');
  return u;
}

/** Merkezi hata yönetimi: Zod, ApiError ve beklenmeyen hatalar güvenli yanıtlara çevrilir. */
export async function handle<T>(fn: () => Promise<NextResponse<ApiBody<T>>>): Promise<NextResponse<ApiBody<T | never>>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status }) as NextResponse<ApiBody<never>>;
    if (e instanceof ZodError) return NextResponse.json({ ok: false, error: 'Geçersiz istek: ' + e.issues[0]?.message }, { status: 400 }) as NextResponse<ApiBody<never>>;
    console.error('[api]', e);
    return NextResponse.json({ ok: false, error: 'Sunucu hatası' }, { status: 500 }) as NextResponse<ApiBody<never>>;
  }
}

export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > 20_000) throw new ApiError(413, 'İstek çok büyük');
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(400, 'Geçersiz JSON');
  }
}
