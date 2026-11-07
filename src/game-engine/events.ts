import * as D from './config/data';
import type { Building, Derived, GameEvent, GameState, Srv } from './types';
import { isRackPlaced } from './layout';
import { logTx, nextId, notify, pick, round, wpick } from './util';

export function eventCost(s: GameState, e: GameEvent, sol: D.EventSol): number {
  const b = s.buildings.find((x) => x.id === e.b);
  let price = 0;
  if (e.sid) {
    const v = s.servers.find((x) => x.id === e.sid);
    if (v) price = D.SERVERS[v.type].price;
  }
  const disc = Math.min(0.5, (b ? b.rooms.storage : 0) * 0.1);
  return Math.round((sol.cost * e.sev + sol.pct * price) * (1 - disc));
}

function makeEvent(s: GameState, d: Derived, type: string, b: Building, v: Srv | null): void {
  const def = D.EVENTS[type];
  const e: GameEvent = {
    id: nextId(s, 'e'), type, b: b.id, sev: wpick<number>([[1, 0.5], [2, 0.35], [3, 0.15]]),
    t0: s.t, fixAt: null, sid: v ? v.id : null, auto: false,
  };
  if (def.scope === 'server') e.sev = 1;
  if (v) {
    if (type === 'server_fail') v.ok = false;
    if (type === 'disk_fail') v.dm = true;
    if (type === 'overheat') v.hot = true;
  }
  s.events.push(e);
  if (type === 'cyber') {
    const fine = round(4000 * e.sev * (1 - d.b[b.id].mit));
    s.money -= fine;
    logTx(s, -fine, 'Siber saldırı zararı');
    s.rep = Math.max(0, s.rep - e.sev * 0.8 * (1 - d.b[b.id].mit));
  }
  notify(s, 'bad', `${def.name} — ${b.name}${v ? ' (' + D.SERVERS[v.type].name + ')' : ''}`);
}

export function endEvent(s: GameState, e: GameEvent, why: 'fixed' | 'nat'): void {
  if (e.sid) {
    const v = s.servers.find((x) => x.id === e.sid);
    if (v) {
      if (e.type === 'server_fail') v.ok = true;
      if (e.type === 'disk_fail') v.dm = false;
      if (e.type === 'overheat') v.hot = false;
    }
  }
  s.events = s.events.filter((x) => x !== e);
  if (why === 'fixed') {
    s.stats.resolved++;
    notify(s, 'good', `${D.EVENTS[e.type].name} çözüldü.`);
  } else notify(s, 'info', `${D.EVENTS[e.type].name} sona erdi.`);
}

/** Bir çözümü başlatır. `force`: çevrimdışı acil servis (1.5x maliyet, borca girebilir). */
export function startFix(s: GameState, d: Derived, e: GameEvent, sol: D.EventSol, force: boolean): boolean {
  const cost = eventCost(s, e, sol) * (force ? 1.5 : 1);
  if (!force && s.money < cost) return false;
  s.money -= cost;
  if (cost) logTx(s, -cost, D.EVENTS[e.type].name + ': ' + sol.label);
  const mins = sol.min * d.eff.repairMult;
  if (mins <= 31) endEvent(s, e, 'fixed');
  else e.fixAt = s.t + mins;
  return true;
}

export function spawnEvents(s: GameState, d: Derived, dt: number, off: boolean): void {
  if (s.t < 4320 || s.events.length >= 8) return;
  const lvlScale = Math.min(1, 0.4 + 0.12 * s.level) * (off ? 0.5 : 1);
  for (const b of s.buildings) {
    const bd = d.b[b.id];
    if (bd.failRate > 0 && Math.random() < 1 - Math.exp(-bd.failRate * dt * lvlScale)) {
      const cand = s.servers.filter((v) => v.b === b.id && v.ok && !v.dm && !v.hot && isRackPlaced(s, v.rack));
      if (cand.length) {
        const v = wpick(cand.map((x) => [x, D.SERVERS[x.type].fail] as const));
        makeEvent(s, d, wpick([['server_fail', 0.6], ['disk_fail', 0.25], ['overheat', 0.15]] as const), b, v);
      }
    }
    const lam = (0.1 + 0.0015 * bd.srvCount) * lvlScale;
    if (Math.random() < 1 - Math.exp((-lam * dt) / 1440)) {
      const secF = 1 - Math.min(0.8, d.mods.sec * 0.5 + d.st.sec * 0.04 + b.rooms.security * 0.1);
      const el: (readonly [string, number])[] = [];
      for (const [k, def] of Object.entries(D.EVENTS)) {
        if (def.scope !== 'building' || s.level < (def.lvl || 1)) continue;
        if (def.need === 'ups' && !b.infra.ups) continue;
        if (def.need === 'cooling' && !(bd.coolKw > 0)) continue;
        if (s.events.some((e) => e.b === b.id && e.type === k)) continue;
        let w = def.w;
        if (k === 'ddos' || k === 'cyber' || k === 'fire_risk') w *= secF;
        if (k === 'fiber_cut') w *= 1 - b.fiber * 0.25;
        el.push([k, w]);
      }
      if (el.length) makeEvent(s, d, wpick(el), b, null);
    }
  }
}

export function progressEvents(s: GameState, d: Derived, dt: number, off: boolean): void {
  for (const e of s.events.slice()) {
    const def = D.EVENTS[e.type];
    const b = s.buildings.find((x) => x.id === e.b);
    if (!b) { s.events = s.events.filter((x) => x !== e); continue; }
    if (e.fixAt != null) {
      if (s.t >= e.fixAt) endEvent(s, e, 'fixed');
      continue;
    }
    if (def.nat && s.t >= e.t0 + def.nat) { endEvent(s, e, 'nat'); continue; }
    if (e.type === 'fire_risk' && s.t - e.t0 > 720) {
      const rk = s.racks.filter((r) => r.b === e.b);
      if (rk.length) {
        const r = pick(rk);
        const lostIds = new Set(s.servers.filter((v) => v.rack === r.id).map((v) => v.id));
        s.servers = s.servers.filter((v) => v.rack !== r.id);
        s.racks = s.racks.filter((x) => x !== r);
        s.events = s.events.filter((ev) => !(ev.sid && lostIds.has(ev.sid)));
        notify(s, 'bad', `YANGIN! ${b.name} içinde bir rack ve ${lostIds.size} sunucu yandı.`);
        s.rep = Math.max(0, s.rep - 6);
      }
      s.events = s.events.filter((x) => x !== e);
      continue;
    }
    let tot = 0;
    const st = d.st as unknown as Record<string, number>;
    for (const r of def.roles) tot += st[r] || 0;
    const rate = Math.min(0.8, tot * 0.12 * (1 + d.mods.auto));
    if (rate > 0 && Math.random() < 1 - Math.exp((-rate * dt) / 60)) {
      if (startFix(s, d, e, def.sols[0], false)) {
        e.auto = true;
        notify(s, 'info', `Ekibin ${def.name} olayına müdahale etti.`);
        continue;
      }
    }
    if (off && s.t - e.t0 > 180) startFix(s, d, e, def.sols[0], true);
  }
}
