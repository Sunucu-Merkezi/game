const nf0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });

export const fmtNum = (n: number): string => nf0.format(n);
export const fmtDec = (n: number): string => nf1.format(n);

/** Türk lirası, büyük sayılarda kısaltmalı (1,2 Mn) */
export function fmtTL(n: number, compact = false): string {
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (compact) {
    if (a >= 1e9) return `${sign}${nf1.format(a / 1e9)} Mr ₺`;
    if (a >= 1e6) return `${sign}${nf1.format(a / 1e6)} Mn ₺`;
    if (a >= 1e4) return `${sign}${nf1.format(a / 1e3)} B ₺`;
  }
  return `${sign}${nf0.format(a)} ₺`;
}
export const fmtPct = (x: number, digits = 0): string => `%${(x * 100).toFixed(digits)}`;

/** Disk / RAM boyutu: GB → TB */
export function fmtSize(gb: number): string {
  if (gb >= 1024) return `${nf1.format(gb / 1024)} TB`;
  return `${nf0.format(gb)} GB`;
}
export function fmtMbps(m: number): string {
  if (m >= 1000) return `${nf1.format(m / 1000)} Gbps`;
  return `${nf0.format(m)} Mbps`;
}

/** Oyun dakikasını "Gün 12 · 14:30" biçimine çevirir */
export function fmtGameTime(t: number): string {
  const day = Math.floor(t / 1440) + 1;
  const h = Math.floor((t % 1440) / 60);
  const m = Math.floor(t % 60);
  return `Gün ${day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
export function fmtDuration(mins: number): string {
  if (mins >= 1440) return `${nf1.format(mins / 1440)} gün`;
  if (mins >= 60) return `${nf1.format(mins / 60)} sa`;
  return `${Math.max(1, Math.round(mins))} dk`;
}
