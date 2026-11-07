import type { Action } from './action-schema';
import * as D from './config/data';
import { derive, rackUsedU, refPrice, slotInfo } from './derive';
import { startFix } from './events';
import { GRID, checkPlacement, infraKey, keyKind, placedCount } from './layout';
import { mkBuilding, refreshCandidates } from './state';
import type { ActionResult, Building, Derived, GameState } from './types';
import { MPM, clamp, logTx, nextId, notify, ri, round } from './util';

const fail = (msg: string): ActionResult => ({ err: msg });
const ok = (msg: string): ActionResult => ({ ok: true, msg });

/** Bakiye yeterliyse düşer ve deftere yazar. */
function spend(s: GameState, amt: number, note: string): boolean {
  if (!(s.money >= amt)) return false;
  s.money -= amt;
  logTx(s, -amt, note);
  return true;
}
function earn(s: GameState, amt: number, note: string): void {
  s.money += amt;
  logTx(s, amt, note);
}
const roomMax = (b: Building): number => Math.min(D.ROOM_MAX, 1 + b.floors);
const building = (s: GameState, id: string): Building | undefined => s.buildings.find((x) => x.id === id);

type Handler<T extends Action['type']> = (s: GameState, a: Extract<Action, { type: T }>, d: Derived) => ActionResult;
type Handlers = { [K in Action['type']]: Handler<K> };

const handlers: Handlers = {
  setSpeed: (s, a) => { s.speed = a.speed; return ok('Hız ' + a.speed + 'x'); },

  buyRack(s, a) {
    const b = building(s, a.b), rk = D.RACKS[a.rack];
    if (!b || !rk) return fail('Geçersiz istek');
    if (s.racks.filter((r) => r.b === b.id).length >= 4 * b.rooms.server) return fail('Sunucu odası dolu. Odayı yükselt veya yeni kat aç.');
    if (!spend(s, rk.price, rk.name)) return fail('Yetersiz bakiye');
    s.racks.push({ id: nextId(s, 'r'), b: b.id, type: a.rack, u: rk.u });
    return ok(rk.name + ' kuruldu');
  },
  sellRack(s, a) {
    const r = s.racks.find((x) => x.id === a.id);
    if (!r) return fail('Rack bulunamadı');
    if (s.servers.some((v) => v.rack === r.id)) return fail('Rack içinde sunucu var');
    s.racks = s.racks.filter((x) => x !== r);
    const rb = building(s, r.b);
    if (rb?.placed) delete rb.placed[r.id];
    earn(s, round(D.RACKS[r.type].price * 0.5), 'Rack satışı');
    return ok('Rack satıldı');
  },
  buyServer(s, a) {
    const t = D.SERVERS[a.server], r = s.racks.find((x) => x.id === a.rack);
    if (!t || !r) return fail('Geçersiz istek');
    if (s.level < t.lvl) return fail('Bu sunucu için seviye ' + t.lvl + ' gerekir');
    if (r.u - rackUsedU(s, r.id) < t.u) return fail('Rack içinde yeterli U alanı yok');
    if (!spend(s, t.price, t.name)) return fail('Yetersiz bakiye');
    s.servers.push({ id: nextId(s, 'v'), type: a.server, rack: r.id, b: r.b, ok: true });
    s.stats.serversBought++;
    return ok(t.name + ' yerleştirildi');
  },
  sellServer(s, a) {
    const v = s.servers.find((x) => x.id === a.id);
    if (!v) return fail('Sunucu bulunamadı');
    s.servers = s.servers.filter((x) => x !== v);
    const bd = derive(s).b[v.b];
    if (bd.nom.cpu < bd.used.cpu || bd.nom.ram < bd.used.ram || bd.nom.disk < bd.used.disk || bd.nom.gpu < bd.used.gpu) {
      s.servers.push(v);
      return fail('Bu sunucunun kapasitesi aktif sözleşmeler tarafından kullanılıyor');
    }
    s.events = s.events.filter((e) => e.sid !== v.id);
    earn(s, round(D.SERVERS[v.type].price * 0.5), 'Sunucu satışı');
    return ok('Sunucu satıldı');
  },
  buyInfra(s, a) {
    const b = building(s, a.b), it = D.INFRA[a.item];
    if (!b || !it) return fail('Geçersiz istek');
    if (s.level < it.lvl) return fail('Seviye ' + it.lvl + ' gerekir');
    const si = slotInfo(b);
    if (b.rooms[it.room] < 1) return fail(D.ROOMS[it.room].name + ' inşa edilmeli');
    if ((si.used[it.room] || 0) + it.slot > si.cap[it.room]) return fail('Odada boş yuva yok. Odayı yükselt.');
    if (!spend(s, it.price, it.name)) return fail('Yetersiz bakiye');
    b.infra[a.item] = (b.infra[a.item] || 0) + 1;
    return ok(it.name + ' kuruldu');
  },
  sellInfra(s, a) {
    const b = building(s, a.b), it = D.INFRA[a.item];
    if (!b || !it || !b.infra[a.item]) return fail('Geçersiz istek');
    b.infra[a.item]--;
    const prevPlaced = { ...(b.placed ?? {}) };
    if (b.placed && placedCount(b, a.item) > b.infra[a.item]) {
      for (let n = b.infra[a.item] + 5; n >= 0; n--) if (b.placed[infraKey(a.item, n)]) { delete b.placed[infraKey(a.item, n)]; break; }
    }
    if (!b.infra[a.item]) delete b.infra[a.item];
    const bd = derive(s).b[b.id];
    if (bd.bw < bd.used.net) {
      b.infra[a.item] = (b.infra[a.item] || 0) + 1;
      b.placed = prevPlaced;
      return fail('Ağ kapasitesi aktif sözleşmelere yetmez');
    }
    earn(s, round(it.price * 0.5), 'Ekipman satışı');
    return ok('Ekipman satıldı');
  },
  placeItem(s, a) {
    const b = building(s, a.b);
    if (!b) return fail('Bina bulunamadı');
    b.placed ??= {};
    const kind = keyKind(a.key);
    if (kind === 'rack') {
      if (!s.racks.some((r) => r.id === a.key && r.b === b.id)) return fail('Rack bulunamadı');
    } else {
      const n = Number(a.key.split('#')[1]);
      if (!b.infra[kind] || !(n >= 0 && n < b.infra[kind])) return fail('Ekipman bulunamadı');
    }
    const p = { f: a.f, x: Math.round(a.x / GRID) * GRID, z: Math.round(a.z / GRID) * GRID, r: a.r };
    const err = checkPlacement(b, a.key, p);
    if (err) return fail(err);
    const moved = !!b.placed[a.key];
    b.placed[a.key] = p;
    return ok(moved ? 'Taşındı' : 'Yerleştirildi');
  },
  unplaceItem(s, a) {
    const b = building(s, a.b);
    if (!b?.placed?.[a.key]) return fail('Bu öğe yerleştirilmemiş');
    delete b.placed[a.key];
    return ok('Envantere alındı (çalışmaz)');
  },
  buildRoom(s, a) {
    const b = building(s, a.b), rm = D.ROOMS[a.room];
    if (!b || !rm || b.rooms[a.room] === undefined) return fail('Geçersiz istek');
    const lv = b.rooms[a.room];
    if (lv >= roomMax(b)) return fail('Maksimum seviye. Yeni kat aç.');
    if (!spend(s, round(rm.cost * Math.pow(1.9, lv)), rm.name)) return fail('Yetersiz bakiye');
    b.rooms[a.room]++;
    return ok(rm.name + ' seviye ' + b.rooms[a.room]);
  },
  addFloor(s, a) {
    const b = building(s, a.b);
    if (!b) return fail('Geçersiz istek');
    if (b.floors >= 5) return fail('Maksimum kat sayısı');
    if (!spend(s, round(D.FLOOR_COST * Math.pow(1.6, b.floors - 1)), 'Yeni kat')) return fail('Yetersiz bakiye');
    b.floors++;
    return ok('Yeni kat açıldı');
  },
  buyBuilding(s, a) {
    const c = D.CITIES[a.city];
    if (!c) return fail('Geçersiz şehir');
    if (s.level < c.unlock) return fail('Seviye ' + c.unlock + ' gerekir');
    if (s.buildings.some((b) => b.city === a.city)) return fail('Bu şehirde zaten veri merkezin var');
    if (!spend(s, c.build, c.name + ' veri merkezi')) return fail('Yetersiz bakiye');
    s.buildings.push(mkBuilding(s, a.city, false));
    notify(s, 'good', c.name + ' veri merkezi açıldı! Odaları inşa et, hat ve IP kirala.');
    return ok(c.name + ' veri merkezi açıldı');
  },
  buyUplink(s, a) {
    const b = building(s, a.b), u = D.TRANSIT[a.k] || D.IX[a.k];
    if (!b || !u) return fail('Geçersiz istek');
    if (s.level < u.lvl) return fail('Seviye ' + u.lvl + ' gerekir');
    if (D.IX[a.k] && !b.uplinks.some((k) => D.TRANSIT[k])) return fail('IX için önce transit sağlayıcı gerekir');
    if (b.uplinks.length >= 6) return fail('Maksimum 6 bağlantı');
    if (!spend(s, u.cost, 'Kurulum: ' + u.name)) return fail('Yetersiz bakiye (ilk ay bedeli kurulumda alınır)');
    b.uplinks.push(a.k);
    return ok(u.name + ' bağlandı');
  },
  dropUplink(s, a) {
    const b = building(s, a.b);
    if (!b || !b.uplinks[a.idx]) return fail('Geçersiz istek');
    const k = b.uplinks.splice(a.idx, 1)[0];
    const bd = derive(s).b[b.id];
    if (bd.bw < bd.used.net) { b.uplinks.splice(a.idx, 0, k); return fail('Bant genişliği aktif sözleşmelere yetmez'); }
    return ok('Bağlantı kapatıldı');
  },
  buyIp(s, a) {
    const b = building(s, a.b), ip = D.IPBLOCKS[a.k];
    if (!b || !ip) return fail('Geçersiz istek');
    if (!spend(s, ip.cost, 'IP: ' + ip.name)) return fail('Yetersiz bakiye');
    b.ips.push(a.k);
    return ok(ip.name + ' kiralandı');
  },
  dropIp(s, a) {
    const b = building(s, a.b);
    if (!b || !b.ips[a.idx]) return fail('Geçersiz istek');
    const k = b.ips.splice(a.idx, 1)[0];
    if (derive(s).b[b.id].ipFree < 0) { b.ips.splice(a.idx, 0, k); return fail('Kullanımdaki IP’ler yetmez'); }
    return ok('IP bloğu bırakıldı');
  },
  upgradeFiber(s, a) {
    const b = building(s, a.b);
    if (!b) return fail('Geçersiz istek');
    if (b.fiber >= 3) return fail('Maksimum fiber seviyesi');
    if (!spend(s, D.FIBER_COSTS[b.fiber + 1], 'Fiber altyapı')) return fail('Yetersiz bakiye');
    b.fiber++;
    return ok('Fiber altyapı seviye ' + b.fiber);
  },
  setPrice(s, a) {
    if (!D.SERVICES[a.svc]) return fail('Geçersiz hizmet');
    s.prices[a.svc] = +a.mult.toFixed(2);
    return ok('Fiyat güncellendi');
  },
  declineOffer(s, a) { s.offers = s.offers.filter((o) => o.id !== a.id); return ok('Teklif reddedildi'); },
  acceptOffer(s, a, d) {
    const o = s.offers.find((x) => x.id === a.id), b = building(s, a.b);
    if (!o || !b) return fail('Teklif bulunamadı');
    const bd = d.b[b.id], n = bd.nom, u = bd.used;
    if (o.cpu > n.cpu - u.cpu + 1e-9) return fail('Yeterli CPU yok');
    if (o.ram > n.ram - u.ram) return fail('Yeterli RAM yok');
    if (o.disk > n.disk - u.disk) return fail('Yeterli disk yok');
    if (o.gpu > n.gpu - u.gpu) return fail('Yeterli GPU yok');
    if (o.net > bd.bw - u.net) return fail('Yeterli bant genişliği yok');
    if (o.u > bd.freeU) return fail('Rack’lerde yeterli boş U yok');
    if (o.ips > bd.ipFree) return fail('Yeterli IP adresi yok');
    let mult = s.prices[o.svc];
    s.offers = s.offers.filter((x) => x !== o);
    if (o.tender) {
      const bid = clamp(a.bid ?? 1, 0.6, 1.4);
      const comp = s.comp.find((c) => c.id === o.comp);
      const chance = clamp(0.55 + ((o.compMult ?? 1) - bid) * 1.4 + (s.rep - (comp ? comp.rep : 50)) / 250, 0.08, 0.95);
      mult = bid;
      if (Math.random() > chance) {
        if (comp) comp.servers += ri(1, 2);
        notify(s, 'warn', `İhaleyi ${comp ? comp.name : 'rakip'} kazandı (${o.name}). Kazanma şansın %${Math.round(chance * 100)} idi.`);
        return ok('İhale kaybedildi');
      }
      s.stats.tenders++;
      notify(s, 'good', `İhale kazanıldı: ${o.name}!`);
    }
    s.contracts.push({
      id: nextId(s, 'c'), cust: o.cust, svc: o.svc, name: o.name, b: b.id, cpu: o.cpu, ram: o.ram, disk: o.disk, net: o.net, gpu: o.gpu, u: o.u,
      ips: o.ips, price: Math.round(refPrice(o, d.mods) * mult), mult, months: o.months, start: s.t, end: s.t + o.months * MPM, sat: 75, up: 100, bad: 0,
    });
    s.stats.contracts++;
    if (o.cust === 'enterprise' || o.cust === 'bigtech') s.stats.corp++;
    return ok('Sözleşme imzalandı: ' + o.name);
  },
  cancelContract(s, a) {
    const c = s.contracts.find((x) => x.id === a.id);
    if (!c) return fail('Sözleşme bulunamadı');
    s.contracts = s.contracts.filter((x) => x !== c);
    s.rep = Math.max(0, s.rep - 1.5);
    return ok('Sözleşme feshedildi (itibar -1.5)');
  },
  hire(s, a, d) {
    const c = s.candidates.find((x) => x.id === a.id);
    if (!c) return fail('Aday bulunamadı');
    if (s.staff.length >= d.officeCap) return fail('Ofis kapasitesi dolu. Ofis odasını yükselt.');
    if (!spend(s, c.salary, 'İşe alım: ' + c.name)) return fail('Yetersiz bakiye (ilk maaş peşin)');
    s.candidates = s.candidates.filter((x) => x !== c);
    s.staff.push({ id: c.id, name: c.name, role: c.role, exp: c.exp, skill: c.skill, salary: c.salary, base: c.salary, morale: 70, pay: 1, trainAt: -99999 });
    s.stats.hired++;
    return ok(c.name + ' işe alındı');
  },
  fire(s, a) {
    const p = s.staff.find((x) => x.id === a.id);
    if (!p) return fail('Çalışan bulunamadı');
    if (!spend(s, round(p.salary * 0.5), 'Tazminat: ' + p.name)) return fail('Tazminat için bakiye yetersiz');
    s.staff = s.staff.filter((x) => x !== p);
    return ok('İşten çıkarıldı');
  },
  raise(s, a) {
    const p = s.staff.find((x) => x.id === a.id);
    if (!p) return fail('Çalışan bulunamadı');
    if (p.pay >= 1.4) return fail('Daha fazla zam verilemez');
    p.pay = +(p.pay + 0.1).toFixed(2);
    p.salary = round(p.base * p.pay);
    p.morale = Math.min(100, p.morale + 12);
    return ok('Zam verildi');
  },
  train(s, a) {
    const p = s.staff.find((x) => x.id === a.id);
    if (!p) return fail('Çalışan bulunamadı');
    if (s.t - p.trainAt < 30 * 1440) return fail('Eğitim için 30 gün beklemek gerekir');
    if (p.skill >= 98) return fail('Zaten uzman');
    if (!spend(s, 5000 + p.skill * 100, 'Eğitim: ' + p.name)) return fail('Yetersiz bakiye');
    p.skill = Math.min(98, p.skill + 3);
    p.trainAt = s.t;
    p.morale = Math.min(100, p.morale + 5);
    return ok('Eğitim tamamlandı (+3 yetenek)');
  },
  refreshCandidates(s) {
    if (!spend(s, 2000, 'İK arama')) return fail('Yetersiz bakiye');
    refreshCandidates(s);
    return ok('Yeni adaylar listelendi');
  },
  resolveEvent(s, a, d) {
    const e = s.events.find((x) => x.id === a.id);
    if (!e) return fail('Olay bulunamadı');
    if (e.fixAt != null) return fail('Müdahale zaten başladı');
    const sol = D.EVENTS[e.type].sols.find((x) => x.id === a.sol);
    if (!sol) return fail('Geçersiz çözüm');
    if (!startFix(s, d, e, sol, false)) return fail('Yetersiz bakiye');
    return ok('Müdahale başlatıldı');
  },
  startResearch(s, a) {
    const t = D.TECH.find((x) => x.id === a.id);
    if (!t) return fail('Geçersiz araştırma');
    if (s.research.active) return fail('Zaten bir araştırma sürüyor');
    if (s.research.done[t.id]) return fail('Zaten tamamlandı');
    if (s.level < t.lvl) return fail('Seviye ' + t.lvl + ' gerekir');
    if (t.req && !s.research.done[t.req]) return fail('Önce önceki seviye araştırılmalı');
    if (!spend(s, t.cost, 'Araştırma: ' + t.name)) return fail('Yetersiz bakiye');
    s.research.active = { id: t.id, left: t.days * 1440, total: t.days * 1440 };
    return ok('Araştırma başladı');
  },
  marketing(s) {
    if (s.marketing > s.t) return fail('Kampanya zaten aktif');
    if (!spend(s, 8000 * s.level, 'Pazarlama kampanyası')) return fail('Yetersiz bakiye');
    s.marketing = s.t + 7 * 1440;
    return ok('7 gün boyunca müşteri teklifleri artacak');
  },
  loan(s, a) {
    if (s.loan + a.amount > s.level * 50000) return fail('Kredi limiti: ' + s.level * 50000);
    s.loan += a.amount;
    earn(s, a.amount, 'Kredi');
    return ok('Kredi çekildi (aylık %2 faiz)');
  },
  repay(s, a) {
    const x = Math.min(a.amount, s.loan);
    if (x <= 0) return fail('Borcun yok');
    if (!spend(s, x, 'Kredi ödemesi')) return fail('Yetersiz bakiye');
    s.loan -= x;
    return ok('Kredi ödendi');
  },
  claimQuest(s, a) {
    const q = D.QUESTS.find((x) => x.id === a.id);
    if (!q || s.quests[q.id] !== 'ready') return fail('Ödül alınamaz');
    s.quests[q.id] = 'claimed';
    earn(s, q.reward.money, 'Görev ödülü');
    if (q.reward.rep) s.rep = Math.min(100, s.rep + q.reward.rep);
    return ok('Ödül alındı');
  },
};

/** Doğrulanmış bir eylemi oyun durumuna uygular. Tüm kurallar burada sunucu tarafında denetlenir. */
export function applyAction(s: GameState, a: Action): ActionResult {
  const h = handlers[a.type] as (s: GameState, a: Action, d: Derived) => ActionResult;
  return h(s, a, derive(s));
}
