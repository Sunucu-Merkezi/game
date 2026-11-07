import type { Building, GameState, Placement } from './types';

/** Bina içi ölçüler (metre). Yerleşim istemci (3D) ve sunucu (doğrulama) tarafından aynı kodla denetlenir. */
export const BUILD_W = 40;
export const BUILD_D = 26;
export const YARD_MAX_X = 34;
export const GRID = 0.5;

const YARD_ITEMS = new Set(['generator', 'trafo']);
const COOLING = new Set(['klima', 'endustriyel', 'sivi']);

export const infraKey = (k: string, n: number): string => `${k}#${n}`;
export const keyKind = (key: string): string => (key.includes('#') ? key.split('#')[0] : 'rack');
export const isYardKind = (kind: string): boolean => YARD_ITEMS.has(kind);

/** [genişlik(x), derinlik(z)] */
export function footprint(key: string, rot: number): [number, number] {
  const kind = keyKind(key);
  let fp: [number, number] = [0.9, 0.9];
  if (kind === 'rack') fp = [1.0, 1.3];
  else if (isYardKind(kind)) fp = [3, 2];
  else if (COOLING.has(kind)) fp = [1.4, 1.4];
  return rot % 2 === 1 ? [fp[1], fp[0]] : fp;
}

export function placedCount(b: Building, kind: string): number {
  const pl = b.placed ?? {};
  let n = 0;
  for (const k of Object.keys(pl)) if (k.startsWith(kind + '#')) n++;
  return n;
}

/** Yerleştirilmemiş (envanterdeki) ekipman anahtarları */
export function unplacedKeys(b: Building): string[] {
  const pl = b.placed ?? {};
  const out: string[] = [];
  for (const [k, count] of Object.entries(b.infra)) {
    for (let n = 0; n < count; n++) if (!pl[infraKey(k, n)]) out.push(infraKey(k, n));
  }
  return out;
}

/** Yerleşim geçerli mi? Hata metni ya da null döner. */
export function checkPlacement(b: Building, key: string, p: Placement): string | null {
  const [w, d] = footprint(key, p.r);
  const kind = keyKind(key);
  if (p.f < 0 || p.f >= b.floors) return 'Geçersiz kat';
  if (isYardKind(kind)) {
    if (p.f !== 0) return `${kind === 'trafo' ? 'Trafo' : 'Jeneratör'} yalnızca bina dışındaki sahaya yerleştirilir`;
    if (Math.abs(p.x) - w / 2 < BUILD_W / 2 + 0.2 || Math.abs(p.x) + w / 2 > YARD_MAX_X || Math.abs(p.z) + d / 2 > BUILD_D / 2 + 4) return 'Saha alanı dışında';
  } else if (Math.abs(p.x) + w / 2 > BUILD_W / 2 - 0.3 || Math.abs(p.z) + d / 2 > BUILD_D / 2 - 0.3) return 'Binanın dışında';
  const pl = b.placed ?? {};
  for (const [k2, q] of Object.entries(pl)) {
    if (k2 === key || q.f !== p.f) continue;
    const [w2, d2] = footprint(k2, q.r);
    if (Math.abs(p.x - q.x) < (w + w2) / 2 + 0.05 && Math.abs(p.z - q.z) < (d + d2) / 2 + 0.05) return 'Başka bir ekipmanla çakışıyor';
  }
  return null;
}

export function isRackPlaced(s: GameState, rackId: string): boolean {
  const rack = s.racks.find((r) => r.id === rackId);
  if (!rack) return false;
  const b = s.buildings.find((x) => x.id === rack.b);
  return !!b?.placed?.[rackId];
}

/**
 * Eski kayıtlar (yerleşimi olmayan binalar) için sahip olunan her şeyi otomatik yerleştirir.
 * Yeni satın alımlar bu işlemden geçmez; oyuncu elle yerleştirir.
 */
export function ensureLayout(s: GameState): void {
  for (const b of s.buildings) {
    if (b.placed) continue;
    b.placed = {};
    const racks = s.racks.filter((r) => r.b === b.id);
    racks.forEach((r, i) => {
      const f = Math.min(b.floors - 1, Math.floor(i / 10));
      const k = i % 10;
      b.placed![r.id] = { f, x: -14 + (k % 5) * 3.6, z: k < 5 ? -6.5 : 6.5, r: 0 };
    });
    let cool = 0, net = 0, pow = 0, yard = 0;
    for (const [kind, count] of Object.entries(b.infra)) {
      for (let n = 0; n < count; n++) {
        const key = infraKey(kind, n);
        if (isYardKind(kind)) b.placed[key] = { f: 0, x: BUILD_W / 2 + 4, z: -8 + yard++ * 3, r: 0 };
        else if (COOLING.has(kind)) b.placed[key] = { f: 0, x: BUILD_W / 2 - 2, z: -9 + cool++ * 2, r: 0 };
        else if (kind === 'ups' || kind === 'pdu') b.placed[key] = { f: 0, x: -BUILD_W / 2 + 2, z: -9 + pow++ * 1.6, r: 0 };
        else b.placed[key] = { f: 0, x: -16 + net++ * 1.6, z: -BUILD_D / 2 + 1.5, r: 0 };
      }
    }
  }
}
