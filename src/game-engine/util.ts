import type { GameState, NotifType } from './types';

export const MPM = 43200; // bir oyun ayı (dakika)
export const HPM = 720; // bir oyun ayı (saat)
export const KWH = 3.0; // TL / kWh
export const MIN_PER_SEC = 10; // 1x hızda 1 gerçek saniye = 10 oyun dakikası
export const OFFLINE_CAP_SEC = 12 * 3600;

export const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
export const ri = (a: number, b: number): number => Math.floor(rnd(a, b + 1));
export const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));
export const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
export const round = (x: number): number => Math.round(x);

export function wpick<T>(entries: readonly (readonly [T, number])[]): T {
  let total = 0;
  for (const e of entries) total += e[1];
  let r = Math.random() * total;
  for (const e of entries) if ((r -= e[1]) <= 0) return e[0];
  return entries[entries.length - 1][0];
}

export const nextId = (s: GameState, prefix: string): string => prefix + (s.seq++).toString(36);

export function notify(s: GameState, type: NotifType, msg: string): void {
  s.notifs.push({ id: s.nid++, t: s.t, type, msg });
  if (s.notifs.length > 80) s.notifs.shift();
}

export interface LedgerRow { t: number; a: number; n: string; balance: number }

let activeLedger: LedgerRow[] | null = null;

/** `fn` içinde yapılan tüm ekonomik işlemleri kalıcı defter için toplar (motor senkron çalıştığından güvenlidir). */
export function collectLedger<T>(fn: () => T): { result: T; rows: LedgerRow[] } {
  const prev = activeLedger;
  const rows: LedgerRow[] = [];
  activeLedger = rows;
  try {
    return { result: fn(), rows };
  } finally {
    activeLedger = prev;
  }
}

/** Oyun durumuna ekonomik işlem yazar ve varsa aktif deftere ekler. */
export function logTx(s: GameState, amount: number, note: string): void {
  const entry = { t: s.t, a: Math.round(amount), n: note };
  s.tx.push(entry);
  if (s.tx.length > 150) s.tx.shift();
  if (activeLedger) activeLedger.push({ ...entry, balance: Math.round(s.money) });
}
