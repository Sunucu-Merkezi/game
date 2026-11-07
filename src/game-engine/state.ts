import * as D from './config/data';
import type { Building, Candidate, GameState } from './types';
import { ensureLayout } from './layout';
import { clamp, nextId, notify, pick, ri, round } from './util';

export function mkBuilding(s: GameState, city: string, starter: boolean): Building {
  const c = D.CITIES[city];
  return {
    id: nextId(s, 'b'),
    city,
    name: starter ? 'Merkez Veri Merkezi' : c.name + ' Veri Merkezi',
    floors: 1,
    rooms: starter
      ? { server: 1, power: 1, cooling: 1, network: 1, security: 0, office: 1, storage: 0 }
      : { server: 0, power: 0, cooling: 0, network: 0, security: 0, office: 0, storage: 0 },
    infra: starter ? { pdu: 1, klima: 1, switch: 1 } : {},
    placed: starter ? undefined : {},
    uplinks: starter ? ['t_yerel'] : [],
    ips: starter ? ['ip29'] : [],
    fiber: 0,
  };
}

export function genCandidate(s: GameState): Candidate {
  const roles = Object.keys(D.ROLES).filter((r) => D.ROLES[r].lvl <= s.level);
  const role = pick(roles);
  const exp = ri(0, 10);
  const skill = clamp(ri(40, 70) + exp * 2.5, 35, 98);
  const salary = Math.round((D.ROLES[role].base * (0.75 + skill / 200 + exp * 0.03)) / 100) * 100;
  return { id: nextId(s, 'k'), name: pick(D.FIRST) + ' ' + pick(D.LAST), role, exp, skill: round(skill), salary };
}

export function refreshCandidates(s: GameState): void {
  s.candidates = [];
  for (let i = 0; i < 6; i++) s.candidates.push(genCandidate(s));
}

export function newGame(company: string, now: number = Date.now()): GameState {
  const s: GameState = {
    v: 1, company: String(company || 'Yeni Şirket').slice(0, 32), created: now, last: now,
    t: 0, speed: 1, money: 60000, rep: 10, rev: 0, level: 1, seq: 1, loan: 0,
    buildings: [], racks: [], servers: [], contracts: [], offers: [], events: [], staff: [], candidates: [],
    prices: {}, research: { done: {}, active: null },
    comp: D.COMPETITORS.map((c) => ({ ...c, rev: c.servers * 3200 * c.price })),
    market: { total: 600000, idx: 1, share: 0, compShare: 0 },
    quests: {}, notifs: [], nid: 1, hist: [], tx: [], marketing: 0, lastSample: -999, lastDay: 0,
    stats: { serversBought: 0, contracts: 0, resolved: 0, tenders: 0, hired: 0, corp: 0, churned: 0, lost: 0 },
  };
  for (const k of Object.keys(D.SERVICES)) s.prices[k] = 1;
  s.buildings.push(mkBuilding(s, 'kocaeli', true));
  s.racks.push({ id: nextId(s, 'r'), b: s.buildings[0].id, type: 'u12', u: 12 });
  ensureLayout(s);
  refreshCandidates(s);
  notify(s, 'info', 'Sunucu Merkezi’ne hoş geldin! İlk sunucunu satın alıp rack’e yerleştir, ardından Müşteriler sayfasından teklifleri kabul et.');
  return s;
}
