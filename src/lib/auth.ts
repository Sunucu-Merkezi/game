import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { prisma } from './db';

const scrypt = promisify(scryptCb) as (pw: string, salt: string, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = 'sm_session';
const SESSION_DAYS = 14;

const sha256 = (x: string): string => createHash('sha256').update(x).digest('hex');

export async function hashPassword(password: string, salt: string = randomBytes(16).toString('hex')): Promise<{ hash: string; salt: string }> {
  const buf = await scrypt(password, salt, 64);
  return { hash: buf.toString('hex'), salt };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const { hash: h } = await hashPassword(password, salt);
  const a = Buffer.from(h, 'hex'), b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Oturum oluşturur; tarayıcıya yalnızca rastgele jeton verilir, veritabanında sadece özeti saklanır. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex');
  await prisma.session.create({
    data: { tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_DAYS * 86_400,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export interface AuthUser { id: string; username: string }

/** Geçerli oturumun kullanıcısını döndürür; yoksa null. */
export async function getSessionUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!s || s.expiresAt.getTime() < Date.now()) return null;
  return { id: s.user.id, username: s.user.username };
}
