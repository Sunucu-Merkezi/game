import * as D from './config/data';
import { derive } from './derive';
import { progressEvents, spawnEvents } from './events';
import { ensureLayout } from './layout';
import { refreshCandidates } from './state';
import type { Derived, GameState, Offer, OfflineReport } from './types';
import { HPM, MIN_PER_SEC, MPM, OFFLINE_CAP_SEC, clamp, nextId, notify, pick, ri, rnd, wpick } from './util';

// ---------------------------------------------------------------- teklifler
function nameFor(cust: string): string {
  const list = D.NAMES[cust];
  if (cust === 'individual') return pick(list) + ' ' + pick(D.LAST);
  return pick(list) + (Math.random() < 0.4 ? ' ' + ri(2, 99) : '');
}

const IPS_PER_SERVICE: Record<string, number> = { vps: 1, web: 1, game: 1, dedicated: 1, colo: 2, cloud: 4, corp: 8 };

function genOffer(s: GameState, d: Derived): void {
  const cands = Object.entries(D.CUSTOMERS).filter(([, c]) => c.lvl <= s.level && s.rep >= c.rep);
  if (!cands.length) return;
  const [ck, ct] = wpick(cands.map((e) => [e, e[1].w] as const));
  const svcs = Object.entries(ct.svc).filter(([k]) => k !== 'cloud' || d.mods.cloud);
  if (!svcs.length) return;
  const svc = wpick(svcs);
  const R = (a: [number, number]): number => ri(a[0], a[1]);
  const o: Offer = {
    id: nextId(s, 'o'), cust: ck, svc, name: nameFor(ck), cpu: R(ct.cpu), ram: R(ct.ram), disk: R(ct.disk), net: R(ct.net),
    gpu: 0, u: 0, ips: IPS_PER_SERVICE[svc], months: R(ct.dur), exp: s.t + ri(3, 7) * 1440,
  };
  if (svc === 'web') {
    o.cpu = Math.max(1, Math.round(o.cpu / 2));
    o.ram = Math.max(1, Math.round(o.ram / 2));
    o.net = Math.max(20, Math.round(o.net / 2));
  }
  if (svc === 'colo') { o.u = R(ct.u || [2, 8]); o.cpu = 0; o.ram = 0; o.disk = 0; }
  if (ct.gpu && d.mods.ai && (svc === 'cloud' || svc === 'corp') && Math.random() < 0.5) o.gpu = ri(1, ct.gpu[1]);
  if (s.level >= 3 && Math.random() < ct.tender) {
    const comp = pick(s.comp);
    o.tender = true; o.comp = comp.id; o.compMult = +(comp.price * rnd(0.95, 1.05)).toFixed(2);
    o.exp = s.t + ri(2, 4) * 1440;
  }
  s.offers.push(o);
}

/** Saatlik teklif olasılığı */
function offerRate(s: GameState): number {
  const base = 0.12 * (1 + s.level * 0.35) * (0.4 + s.rep / 60);
  const dem = s.buildings.reduce((a, b) => a + D.CITIES[b.city].demand, 0) / s.buildings.length;
  const marketF = 1.1 - Math.min(0.6, s.market.compShare * 0.5);
  const mk = s.marketing > s.t ? 1.6 : 1;
  const avgMult = Object.values(s.prices).reduce((a, x) => a + x, 0) / Object.keys(s.prices).length;
  const f = clamp(1.8 - 0.8 * (avgMult / s.market.idx), 0.1, 1.3);
  return base * dem * marketF * mk * f;
}

function expireOffers(s: GameState): void {
  for (const o of s.offers.slice()) {
    if (s.t < o.exp) continue;
    s.offers = s.offers.filter((x) => x !== o);
    if (o.tender) {
      const comp = s.comp.find((c) => c.id === o.comp);
      if (comp) { comp.servers += ri(1, 3); notify(s, 'warn', `İhale ${comp.name} tarafından kazanıldı (${o.name}).`); }
    }
  }
}

// ---------------------------------------------------------------- sözleşmeler
function updateContracts(s: GameState, d: Derived, dt: number): void {
  const a1 = Math.min(1, dt / 14400), a2 = Math.min(1, dt / 2880);
  for (const c of s.contracts.slice()) {
    const bd = d.b[c.b];
    const ct = D.CUSTOMERS[c.cust];
    c.up += (bd.avail * (0.7 + 0.3 * bd.perf) * 100 - c.up) * a1;
    const rel = c.mult / s.market.idx;
    const sc = {
      perf: Math.pow(bd.perf, 1.5), up: clamp((c.up - 95) / 4.5, 0, 1), price: clamp(1.5 - 0.7 * rel * ct.ps, 0, 1),
      sup: d.supScore, lat: clamp(1.15 - bd.lat / 120, 0, 1),
    };
    const w = { perf: 0.3, up: 0.25 * ct.up, price: 0.2 * ct.ps, sup: 0.15 * ct.sup, lat: 0.1 * ct.lat };
    const num = w.perf * sc.perf + w.up * sc.up + w.price * sc.price + w.sup * sc.sup + w.lat * sc.lat;
    const den = w.perf + w.up + w.price + w.sup + w.lat;
    let target = (100 * num) / den;
    if (bd.ev.cyber) target -= 15;
    c.sat += (clamp(target, 0, 100) - c.sat) * a2;
    c.bad = c.sat < 18 ? c.bad + dt : 0;
    if (c.bad > 4320) {
      s.contracts = s.contracts.filter((x) => x !== c);
      s.stats.churned++;
      s.rep = Math.max(0, s.rep - 1.5);
      notify(s, 'bad', `${c.name} memnuniyetsizlik nedeniyle sözleşmeyi iptal etti.`);
      continue;
    }
    if (s.t >= c.end) {
      const p = c.sat >= 60 ? 0.85 : c.sat >= 35 ? 0.4 : 0.05;
      if (Math.random() < p) {
        c.end += c.months * MPM;
        if (Math.random() < 0.15) notify(s, 'good', `${c.name} sözleşmesini yeniledi.`);
      } else {
        s.contracts = s.contracts.filter((x) => x !== c);
        notify(s, 'info', `${c.name} sözleşmesi sona erdi.`);
      }
    }
  }
}

// ---------------------------------------------------------------- günlük işler (rakipler, pazar)
function dailyUpdate(s: GameState, d: Derived): void {
  const avgMine = Object.values(s.prices).reduce((a, x) => a + x, 0) / Object.keys(s.prices).length;
  const months = s.t / MPM;
  s.market.total = 600000 * (1 + 0.012 * months) * (1 + 0.15 * Math.log(s.level));
  let sumRev = 0, sumPR = 0, sumShare = 0;
  for (const c of s.comp) {
    const targets: Record<string, number> = { cheap: 0.82, quality: 1.15, balanced: 1.0, aggressive: avgMine * 0.94 };
    c.price = clamp(c.price + (targets[c.strat] - c.price) * 0.15 + rnd(-0.02, 0.02), 0.6, 1.5);
    c.rep = clamp(c.rep + rnd(-0.6, 0.7), 20, 95);
    c.rev = c.servers * 3200 * c.price * (0.75 + c.rep / 400);
    c.cap += (c.rev / 30) * 0.35 - c.servers * 40;
    if (c.cap > c.servers * 6000 + 30000 && Math.random() < 0.08) {
      const n = ri(1, 2);
      c.servers += n; c.cap -= 15000 * n;
      if (Math.random() < 0.35) notify(s, 'info', `${c.name} ${n} yeni sunucu yatırımı yaptı.`);
    }
    sumRev += c.rev; sumPR += c.rev * c.price;
  }
  s.market.idx = sumRev > 0 ? sumPR / sumRev : 1;
  for (const c of s.comp) { c.share = c.rev / s.market.total; sumShare += c.share; }
  s.market.compShare = sumShare;
  s.market.share = (d.incHr * HPM) / s.market.total;
  if (Math.floor(s.t / 1440) % 3 === 0) refreshCandidates(s);
}

// ---------------------------------------------------------------- görevler
function checkQuests(s: GameState): void {
  const st = s.stats;
  const cond: Record<string, () => boolean> = {
    q_server: () => st.serversBought >= 1, q_customer: () => st.contracts >= 1, q_rev1k: () => s.rev >= 1000,
    q_hire: () => st.hired >= 1, q_srv10: () => s.servers.length >= 10, q_research: () => Object.keys(s.research.done).length >= 1,
    q_dc: () => s.buildings.length >= 2, q_event: () => st.resolved >= 5, q_lvl2: () => s.level >= 2,
    q_cust25: () => s.contracts.length >= 25, q_tender: () => st.tenders >= 1, q_cust100: () => s.contracts.length >= 100,
    q_corp: () => st.corp >= 1, q_lvl4: () => s.level >= 4, q_rep60: () => s.rep >= 60, q_srv50: () => s.servers.length >= 50,
    q_intl: () => s.buildings.some((b) => D.CITIES[b.city].region !== 'tr'), q_share20: () => s.market.share >= 0.2, q_lvl7: () => s.level >= 7,
  };
  for (const q of D.QUESTS) {
    if (!s.quests[q.id] && cond[q.id]()) {
      s.quests[q.id] = 'ready';
      notify(s, 'good', `Görev tamamlandı: ${q.name} — ödülü Görevler sayfasından al.`);
    }
  }
}

// ---------------------------------------------------------------- simülasyon adımı
export function step(s: GameState, dt: number, off: boolean): void {
  const d = derive(s);
  const hrs = dt / 60;
  s.money += (d.incHr - d.expHr) * hrs;
  s.rev += d.incHr * hrs;

  updateContracts(s, d, dt);
  spawnEvents(s, d, dt, off);
  progressEvents(s, d, dt, off);
  expireOffers(s);
  if (s.offers.length < 12 && Math.random() < 1 - Math.exp((-offerRate(s) * dt) / 60)) genOffer(s, d);

  const overload = s.contracts.length > 8 + d.st.sup * 25;
  for (const p of s.staff.slice()) {
    const target = 70 + (p.pay - 1) * 150 - (overload ? 10 : 0) - Math.min(15, s.events.length * 3);
    p.morale = clamp(p.morale + (target - p.morale) * Math.min(1, dt / 2880), 0, 100);
    if (p.morale < 20 && Math.random() < 1 - Math.exp(-dt / 14400)) {
      s.staff = s.staff.filter((x) => x !== p);
      notify(s, 'bad', `${p.name} (${D.ROLES[p.role].name}) düşük moral nedeniyle istifa etti.`);
    }
  }

  const nC = s.contracts.length;
  if (nC) {
    const targetRep = clamp(d.avgSat * 0.85 + Math.min(15, nC * 0.3) - s.events.length * 1.5, 0, 100);
    s.rep = clamp(s.rep + (targetRep - s.rep) * Math.min(1, dt / 20000), 0, 100);
  }

  const ra = s.research.active;
  if (ra) {
    ra.left -= dt;
    if (ra.left <= 0) {
      s.research.done[ra.id] = true;
      s.research.active = null;
      const t = D.TECH.find((x) => x.id === ra.id);
      notify(s, 'good', `Araştırma tamamlandı: ${t ? t.name : ra.id}`);
    }
  }

  s.t += dt;

  for (let l = D.LEVELS.length; l > s.level; l--) {
    if (s.rev >= D.LEVELS[l - 1].rev) {
      s.level = l;
      notify(s, 'good', `Şirket seviyesi yükseldi: ${D.LEVELS[l - 1].name}! Yeni özellikler açıldı.`);
      break;
    }
  }
  const day = Math.floor(s.t / 1440);
  if (day !== s.lastDay) { s.lastDay = day; dailyUpdate(s, d); }

  if (s.t - s.lastSample >= 60) {
    s.lastSample = s.t;
    s.hist.push({
      t: Math.round(s.t), bal: Math.round(s.money), inc: +d.incHr.toFixed(1), exp: +d.expHr.toFixed(1),
      cpu: +(d.cpuPct * 100).toFixed(1), ram: +(d.ramPct * 100).toFixed(1), disk: +(d.diskPct * 100).toFixed(1),
      net: Math.round(d.netTraffic), kw: +d.tot.kw.toFixed(2), temp: +d.tot.tempMax.toFixed(1), rep: +s.rep.toFixed(1),
      cust: nC, srv: d.tot.srv, sat: +d.avgSat.toFixed(1),
    });
    if (s.hist.length > 336) s.hist.shift();
  }
  checkQuests(s);
}

/**
 * Gerçek zamanı oyun zamanına çevirip simüle eder. `s.last` ilerletildiği için aynı aralık iki kez işlenmez.
 * 5 dakikadan uzun aralıklar çevrimdışı sayılır: 1x hız, maksimum 12 saat, daha kaba adımlar.
 */
export function advance(s: GameState, now: number): OfflineReport | null {
  let gap = (now - s.last) / 1000;
  if (!(gap > 0)) return null;
  s.last = now;
  ensureLayout(s);
  let speed = s.speed;
  let off = false;
  if (gap > 300) { off = true; gap = Math.min(gap, OFFLINE_CAP_SEC); speed = 1; }
  let minutes = gap * MIN_PER_SEC * speed;
  const money0 = s.money, t0 = s.t, ev0 = s.stats.resolved, cust0 = s.contracts.length;
  const sz = off ? 240 : 20;
  while (minutes > 0.001) {
    const dt = Math.min(sz, minutes);
    step(s, dt, off);
    minutes -= dt;
  }
  if (!off) return null;
  return {
    secs: Math.round(gap), days: +((s.t - t0) / 1440).toFixed(1), money: Math.round(s.money - money0),
    events: s.stats.resolved - ev0, customers: s.contracts.length - cust0,
  };
}
