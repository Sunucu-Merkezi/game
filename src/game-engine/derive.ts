import * as D from './config/data';
import type { Building, BuildingDerived, Contract, Derived, GameEvent, GameState, Offer, SlotInfo, StaffStats, TechMods, Totals } from './types';
import { placedCount } from './layout';
import { HPM, KWH } from './util';

export function techMods(s: GameState): TechMods {
  const m: TechMods = { net: 0, perf: 0, cool: 0, sec: 0, auto: 0, cloudP: 0, cloud: false, ai: false, gpuP: 0, aiP: 0 };
  for (const t of D.TECH) {
    if (!s.research.done[t.id]) continue;
    const v = D.TECH_CATS[t.cat].vals[t.tier - 1];
    if (t.cat === 'cloud') { m.cloud = true; m.cloudP = v; }
    else if (t.cat === 'ai') { m.ai = true; if (t.tier >= 2) m.gpuP = 0.2; if (t.tier >= 3) m.aiP = 0.3; }
    else if (t.cat === 'net' || t.cat === 'perf' || t.cat === 'cool' || t.cat === 'sec' || t.cat === 'auto') m[t.cat] = Math.max(m[t.cat], v);
  }
  return m;
}

type StaffRole = 'sys' | 'net' | 'sec' | 'tech' | 'mgr' | 'sup' | 'fin';

export function staffStats(s: GameState): StaffStats {
  const st: StaffStats = { sys: 0, net: 0, sec: 0, tech: 0, mgr: 0, sup: 0, fin: 0, n: s.staff.length, salary: 0, morale: 0 };
  for (const p of s.staff) {
    st[p.role as StaffRole] += (p.skill / 100) * (0.5 + (0.5 * p.morale) / 100);
    st.salary += p.salary;
    st.morale += p.morale;
  }
  st.morale = st.n ? st.morale / st.n : 0;
  return st;
}

export function refPrice(o: Pick<Offer, 'svc' | 'cpu' | 'ram' | 'disk' | 'net' | 'u' | 'gpu'>, mods: TechMods): number {
  const U = D.UNIT_PRICE;
  let p = o.cpu * U.cpu + o.ram * U.ram + o.disk * U.disk + o.net * U.net + o.u * U.u + o.gpu * U.gpu;
  p *= D.SERVICES[o.svc].mult;
  if (o.svc === 'cloud' || o.svc === 'corp') p *= 1 + mods.cloudP;
  if (o.gpu) p *= 1 + mods.aiP;
  return Math.round(p);
}

export function rackUsedU(s: GameState, rackId: string): number {
  let u = 0;
  for (const v of s.servers) if (v.rack === rackId) u += D.SERVERS[v.type].u;
  return u;
}

export function slotInfo(b: Building): SlotInfo {
  const used: Record<string, number> = {};
  for (const [k, n] of Object.entries(b.infra)) {
    const it = D.INFRA[k];
    used[it.room] = (used[it.room] || 0) + n * it.slot;
  }
  const cap: Record<string, number> = {};
  for (const r of ['power', 'cooling', 'network']) cap[r] = 4 * b.rooms[r];
  return { used, cap };
}

function groupBy<T extends { b: string }>(s: GameState, arr: T[]): Record<string, T[]> {
  const o: Record<string, T[]> = {};
  for (const b of s.buildings) o[b.id] = [];
  for (const x of arr) if (o[x.b]) o[x.b].push(x);
  return o;
}

/** Tüm türetilmiş değerleri (kapasite, sıcaklık, güç, gelir, gider) hesaplar. Durumu değiştirmez. */
export function derive(s: GameState): Derived {
  const mods = techMods(s), st = staffStats(s);
  const eff = {
    failMult: 1 - Math.min(0.5, st.tech * 0.08 + st.sys * 0.03),
    repairMult: 1 - Math.min(0.5, st.tech * 0.1),
    opexDisc: Math.min(0.15, st.mgr * 0.04),
    taxDisc: Math.min(0.5, st.fin * 0.15),
  };
  const placedRack = new Set<string>();
  for (const b of s.buildings) for (const k of Object.keys(b.placed ?? {})) placedRack.add(k);
  const racks = groupBy(s, s.racks.filter((r) => placedRack.has(r.id))), srvs = groupBy(s, s.servers.filter((v) => placedRack.has(v.rack))), cons = groupBy<Contract>(s, s.contracts), evs = groupBy<GameEvent>(s, s.events);
  const hour = (s.t / 60) % 24;
  const diur = 0.62 + 0.28 * Math.sin(((hour - 9) / 24) * 2 * Math.PI);
  const T: Totals = { cpuCap: 0, cpuUsed: 0, ramCap: 0, ramUsed: 0, diskCap: 0, diskUsed: 0, netCap: 0, netUsed: 0, kw: 0, srv: 0, srvOk: 0, tempMax: 0, incHr: 0, hwValue: 0 };
  const X = { elec: 0, net: 0, rent: 0, hw: 0 };
  const P = (1 + mods.perf) * (1 + Math.min(0.1, st.sys * 0.02));
  const bMap: Record<string, BuildingDerived> = {};
  const q: Record<string, number> = {};
  const incSvc: Record<string, number> = {};

  for (const b of s.buildings) {
    const city = D.CITIES[b.city];
    const ev: Record<string, number> = {};
    for (const e of evs[b.id]) ev[e.type] = Math.max(ev[e.type] || 0, e.sev);

    let cores = 0, ram = 0, disk = 0, gpu = 0, okN = 0, usedU = 0, hwValue = 0, failD = 0, sumW = 0;
    for (const v of srvs[b.id]) {
      const t = D.SERVERS[v.type];
      usedU += t.u; hwValue += t.price;
      if (v.ok) {
        okN++;
        cores += t.cores * (v.hot ? 0.5 : 1);
        ram += t.ram; disk += t.disk * (v.dm ? 0.5 : 1); gpu += t.gpu;
        failD += t.fail; sumW += t.w;
      }
    }
    let totU = 0;
    for (const r of racks[b.id]) { totU += r.u; hwValue += D.RACKS[r.type].price; }

    const used = { cpu: 0, ram: 0, disk: 0, net: 0, gpu: 0, u: 0, ip: 0 };
    for (const c of cons[b.id]) {
      used.cpu += c.cpu; used.ram += c.ram; used.disk += c.disk; used.net += c.net;
      used.gpu += c.gpu; used.u += c.u; used.ip += c.ips;
    }

    let infraW = 0, coolKw = 0, copW = 0, thr = 100, fw = 0, lb = 0, trafo = 0, pdu = 0, ups = 0, gen = 0;
    for (const [k, total] of Object.entries(b.infra)) {
      const it = D.INFRA[k];
      hwValue += it.price * total;
      const n = Math.min(total, placedCount(b, k)); // yerleştirilmeyen ekipman çalışmaz
      infraW += it.w * n;
      if (it.cool && it.cop) { coolKw += it.cool * n; copW += it.cool * it.cop * n; }
      thr += (it.thr || 0) * n; fw += (it.fw || 0) * n; lb += (it.lbBonus || 0) * n;
      if (k === 'trafo') trafo += (it.kw || 0) * n;
      if (k === 'pdu') pdu += (it.kw || 0) * n;
      if (k === 'ups') ups += (it.ups || 0) * n;
      if (k === 'generator') gen += (it.gen || 0) * n;
    }

    const utilCpu = cores > 0 ? Math.min(1, used.cpu / (cores * P)) : 0;
    const itKw = (sumW * (0.55 + 0.45 * utilCpu) + infraW) / 1000;
    const copAvg = coolKw > 0 ? copW / coolKw : 2.5;
    const coolEff = coolKw * (1 + mods.cool) * (ev.cooling_fail ? 0.15 : 1);
    const heat = itKw * 0.95;
    const ratio = coolEff > 0 ? heat / coolEff : heat > 0.05 ? 3 : 0;
    const temp = Math.max(18, Math.min(95, 20 + 16 * ratio));
    const throttle = temp <= 35 ? 1 : temp <= 55 ? 1 - ((temp - 35) / 20) * 0.5 : Math.max(0.1, 0.5 - ((temp - 55) / 15) * 0.4);
    const coolPowerKw = coolKw > 0 ? heat / (copAvg * (1 + mods.cool * 0.6)) : 0;
    const totKw = itKw + coolPowerKw + 0.3;
    const powerCap = D.BASE_POWER_KW + trafo + pdu;
    const powerF = Math.min(1, powerCap / totKw);

    let upMbps = 0, minLat = 999, ixBonus = 0;
    for (const k of b.uplinks) {
      const u = D.TRANSIT[k] || D.IX[k];
      upMbps += u.mbps;
      if (D.TRANSIT[k]) minLat = Math.min(minLat, u.lat); else ixBonus += u.lat;
    }
    const netF = ev.net_out || ev.fiber_cut ? (b.uplinks.length >= 2 ? 0.6 : 0.12) : 1;
    const mit = Math.min(0.92, fw + mods.sec * 0.6 + st.sec * 0.05 + b.rooms.security * 0.06);
    const ddosFrac = ev.ddos ? Math.min(0.95, 0.25 + 0.2 * ev.ddos) * (1 - mit) : 0;
    const bwNom = Math.min(upMbps * netF * (1 + mods.net), thr * (1 + Math.min(0.25, lb))) * (1 - ddosFrac);
    const lat = Math.max(1, (minLat < 999 ? minLat : 200) - Math.min(10, ixBonus) - b.fiber * 2 - Math.min(8, st.net * 1.5) + city.lat);
    let ipTotal = 0;
    for (const k of b.ips) ipTotal += D.IPBLOCKS[k].n;

    const nom = { cpu: cores * P, ram, disk, gpu: gpu * (1 + mods.gpuP) };
    const capE = { cpu: nom.cpu * throttle * powerF, ram: ram * powerF, disk, gpu: nom.gpu * throttle * powerF, net: bwNom };
    const r = (cap: number, u: number): number => (u > 0 ? Math.min(1, cap / u) : 1);
    const perf = Math.min(r(capE.cpu, used.cpu), r(capE.ram, used.ram), r(capE.disk, used.disk), r(capE.net, used.net), r(capE.gpu, used.gpu));

    const protUps = ev.ups_fail ? 0 : 0.7 * Math.min(1, ups / Math.max(1, totKw));
    const protGen = 0.28 * Math.min(1, gen / Math.max(1, totKw)) * (ups > 0 && !ev.ups_fail ? 1 : 0.5);
    const prot = Math.min(0.98, protUps + protGen);
    let avail = 1;
    if (ev.power_out) avail *= prot;
    if (ev.cyber) avail *= 0.9;

    const ipCost = b.ips.reduce((a, k) => a + D.IPBLOCKS[k].cost, 0);
    const upCost = b.uplinks.reduce((a, k) => a + (D.TRANSIT[k] || D.IX[k]).cost, 0);
    const roomLv = Object.values(b.rooms).reduce((a, x) => a + x, 0);
    const exp = {
      elec: totKw * HPM * KWH * city.power * (1 - eff.opexDisc),
      net: upCost + ipCost + b.fiber * D.FIBER_UPKEEP,
      rent: city.rent * (1 + 0.7 * (b.floors - 1) + 0.12 * roomLv) * (1 - eff.opexDisc),
      hw: 0.0035 * hwValue * (1 - eff.opexDisc),
    };
    X.elec += exp.elec; X.net += exp.net; X.rent += exp.rent; X.hw += exp.hw;

    for (const c of cons[b.id]) {
      const qual = perf * avail;
      q[c.id] = qual;
      const inc = (c.price / HPM) * qual;
      T.incHr += inc;
      incSvc[c.svc] = (incSvc[c.svc] || 0) + inc;
    }

    bMap[b.id] = {
      id: b.id, ev, cores, nom, cap: capE, used, bw: bwNom, bwRaw: upMbps, itKw, coolKw: coolEff, coolPowerKw, totKw, powerCap, powerF, temp, throttle, ratio,
      perf, avail, prot, mit, lat, ipTotal, ipFree: ipTotal - used.ip, freeU: totU - usedU - used.u, totU, usedU, srvCount: srvs[b.id].length, okN,
      failRate: (failD * eff.failMult * (1 + Math.max(0, temp - 32) / 6)) / 1440, slots: slotInfo(b),
      cpuUtil: capE.cpu > 0 ? Math.min(1, (used.cpu / Math.max(1, nom.cpu)) * (0.45 + 0.55 * diur)) : 0, exp,
    };
    T.cpuCap += nom.cpu; T.cpuUsed += used.cpu; T.ramCap += ram; T.ramUsed += used.ram;
    T.diskCap += disk; T.diskUsed += used.disk; T.netCap += bwNom; T.netUsed += used.net;
    T.kw += totKw; T.srv += srvs[b.id].length; T.srvOk += okN; T.tempMax = Math.max(T.tempMax, temp); T.hwValue += hwValue;
  }

  const nC = s.contracts.length;
  const supScore = Math.min(1, (8 + st.sup * 25) / Math.max(1, nC));
  let satSum = 0;
  for (const c of s.contracts) satSum += c.sat;

  const incMo = T.incHr * HPM;
  const expMo = {
    elec: X.elec, net: X.net, salary: st.salary, hw: X.hw, rent: X.rent,
    tax: incMo * 0.08 * (1 - eff.taxDisc), interest: s.loan * 0.02 * (1 - eff.taxDisc * 0.5),
  };
  const expMoTot = expMo.elec + expMo.net + expMo.salary + expMo.hw + expMo.rent + expMo.tax + expMo.interest;

  return {
    mods, st, eff, b: bMap, q, incSvc, diur, tot: T, expMo, expHr: expMoTot / HPM, incHr: T.incHr,
    supScore, avgSat: nC ? satSum / nC : 0,
    cpuPct: T.cpuCap > 0 ? Math.min(1, (T.cpuUsed / T.cpuCap) * (0.45 + 0.55 * diur)) : 0,
    ramPct: T.ramCap > 0 ? T.ramUsed / T.ramCap : 0,
    diskPct: T.diskCap > 0 ? T.diskUsed / T.diskCap : 0,
    netTraffic: T.netUsed * (0.3 + 0.6 * diur),
    officeCap: 2 + s.buildings.reduce((a, b) => a + b.rooms.office * 4, 0),
  };
}
