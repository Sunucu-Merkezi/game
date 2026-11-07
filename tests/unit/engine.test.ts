import { describe, expect, it } from 'vitest';
import { actionSchema, advance, applyAction, buildView, derive, newGame } from '@/game-engine';
import * as D from '@/game-engine/config/data';

const T0 = 1_700_000_000_000;

function fresh() {
  return newGame('Test AŞ', T0);
}

describe('oyun kurulumu', () => {
  it('başlangıç durumu tutarlıdır', () => {
    const s = fresh();
    expect(s.money).toBe(60000);
    expect(s.buildings).toHaveLength(1);
    expect(s.racks).toHaveLength(1);
    expect(s.candidates.length).toBeGreaterThan(0);
  });
});

describe('satın alma ve rack kapasitesi', () => {
  it('sunucu rack’e yerleşir ve para düşer', () => {
    const s = fresh();
    const r = applyAction(s, { type: 'buyServer', server: 'baslangic', rack: s.racks[0].id });
    expect(r).toMatchObject({ ok: true });
    expect(s.money).toBe(60000 - D.SERVERS.baslangic.price);
    expect(s.servers).toHaveLength(1);
  });

  it('rack dolunca yeni sunucu eklenemez', () => {
    const s = fresh();
    s.money = 1e7;
    for (let i = 0; i < 12; i++) expect(applyAction(s, { type: 'buyServer', server: 'baslangic', rack: s.racks[0].id })).toMatchObject({ ok: true });
    const r = applyAction(s, { type: 'buyServer', server: 'baslangic', rack: s.racks[0].id });
    expect(r).toMatchObject({ err: expect.stringContaining('U alanı') });
  });

  it('yetersiz bakiyede satın alma reddedilir', () => {
    const s = fresh();
    s.money = 100;
    expect(applyAction(s, { type: 'buyServer', server: 'baslangic', rack: s.racks[0].id })).toHaveProperty('err');
    expect(s.money).toBe(100);
  });

  it('seviyesi yetmeyen ürün alınamaz', () => {
    const s = fresh();
    s.money = 1e7;
    expect(applyAction(s, { type: 'buyServer', server: 'gpu', rack: s.racks[0].id })).toHaveProperty('err');
  });
});

describe('zaman ilerletme', () => {
  it('aynı zaman aralığı iki kez hesaplanmaz', () => {
    const s = fresh();
    advance(s, T0 + 30_000);
    const snap = JSON.stringify(s);
    expect(advance(s, T0 + 30_000)).toBeNull();
    expect(JSON.stringify(s)).toBe(snap);
  });

  it('çevrimdışı süre 12 saatle sınırlanır ve rapor üretilir', () => {
    const s = fresh();
    const rep = advance(s, T0 + 48 * 3600_000);
    expect(rep).not.toBeNull();
    expect(rep!.secs).toBe(12 * 3600);
    expect(Number.isFinite(s.money)).toBe(true);
  });

  it('gider işler: müşterisiz oyunda para azalır', () => {
    const s = fresh();
    advance(s, T0 + 120_000);
    expect(s.money).toBeLessThan(60000);
  });
});

describe('müşteri sözleşmesi ve gelir', () => {
  it('teklif kabul edilince gelir oluşur', () => {
    const s = fresh();
    applyAction(s, { type: 'buyServer', server: 'standart', rack: s.racks[0].id });
    for (let i = 0; i < 200 && s.offers.length === 0; i++) advance(s, s.last + 60_000);
    const offer = s.offers.find((o) => !o.tender);
    expect(offer).toBeDefined();
    const r = applyAction(s, { type: 'acceptOffer', id: offer!.id, b: s.buildings[0].id });
    if ('ok' in r) {
      expect(s.contracts).toHaveLength(1);
      expect(derive(s).incHr).toBeGreaterThan(0);
    } else {
      expect(typeof r.err).toBe('string');
    }
  });

  it('kapasite yetmezse sözleşme reddedilir', () => {
    const s = fresh();
    s.offers.push({ id: 'ox', cust: 'individual', svc: 'vps', name: 'X', cpu: 4, ram: 8, disk: 50, net: 100, gpu: 0, u: 0, ips: 1, months: 3, exp: 1e9 });
    expect(applyAction(s, { type: 'acceptOffer', id: 'ox', b: s.buildings[0].id })).toHaveProperty('err');
  });
});

describe('uzun simülasyon', () => {
  it('90 oyun günü sayısal olarak kararlıdır ve görünüm üretilir', () => {
    const s = fresh();
    s.speed = 10;
    applyAction(s, { type: 'buyServer', server: 'standart', rack: s.racks[0].id });
    let now = T0;
    for (let i = 0; i < 1300; i++) {
      now += 1000;
      advance(s, now);
      for (const o of s.offers.slice()) applyAction(s, { type: 'acceptOffer', id: o.id, b: s.buildings[0].id, bid: 1 });
    }
    expect(Number.isFinite(s.money)).toBe(true);
    const v = buildView(s);
    expect(v.hist.length).toBeGreaterThan(10);
    for (const h of v.hist) expect(Number.isFinite(h.bal)).toBe(true);
  });
});

describe('eylem şeması', () => {
  it('geçersiz eylemleri reddeder', () => {
    expect(actionSchema.safeParse({ type: 'setSpeed', speed: 99 }).success).toBe(false);
    expect(actionSchema.safeParse({ type: 'setPrice', svc: 'vps', mult: 10 }).success).toBe(false);
    expect(actionSchema.safeParse({ type: 'loan', amount: -5 }).success).toBe(false);
    expect(actionSchema.safeParse({ type: 'hack' }).success).toBe(false);
  });
  it('geçerli eylemi kabul eder', () => {
    expect(actionSchema.safeParse({ type: 'setSpeed', speed: 5 }).success).toBe(true);
  });
});
