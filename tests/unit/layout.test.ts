import { describe, expect, it } from 'vitest';
import { advance, applyAction, derive, newGame } from '@/game-engine';
import { checkPlacement, footprint, infraKey } from '@/game-engine/layout';

const T0 = 1_700_000_000_000;

describe('elle yerleştirme', () => {
  it('başlangıç ürünleri yerleştirilmiş gelir', () => {
    const s = newGame('T', T0);
    const b = s.buildings[0];
    expect(b.placed?.[s.racks[0].id]).toBeDefined();
    expect(b.placed?.[infraKey('klima', 0)]).toBeDefined();
  });

  it('yeni satın alınan rack yerleştirilmeden çalışmaz', () => {
    const s = newGame('T', T0);
    s.money = 1e6;
    const b = s.buildings[0];
    applyAction(s, { type: 'buyRack', b: b.id, rack: 'u24' });
    const rack = s.racks[1];
    expect(b.placed?.[rack.id]).toBeUndefined();
    applyAction(s, { type: 'buyServer', server: 'standart', rack: rack.id });
    expect(derive(s).b[b.id].okN).toBe(0);
    expect(applyAction(s, { type: 'placeItem', b: b.id, key: rack.id, f: 0, x: 0, z: 0, r: 0 })).toMatchObject({ ok: true });
    expect(derive(s).b[b.id].okN).toBe(1);
  });

  it('yerleştirilmeyen soğutma ekipmanı soğutmaz', () => {
    const s = newGame('T', T0);
    const b = s.buildings[0];
    const cool = derive(s).b[b.id].coolKw;
    expect(cool).toBeGreaterThan(0);
    applyAction(s, { type: 'unplaceItem', b: b.id, key: infraKey('klima', 0) });
    expect(derive(s).b[b.id].coolKw).toBe(0);
  });

  it('çakışma ve bina dışı yerleşim reddedilir', () => {
    const s = newGame('T', T0);
    s.money = 1e6;
    const b = s.buildings[0];
    applyAction(s, { type: 'buyRack', b: b.id, rack: 'u12' });
    const r = s.racks[1];
    const first = b.placed![s.racks[0].id];
    expect(applyAction(s, { type: 'placeItem', b: b.id, key: r.id, f: 0, x: first.x, z: first.z, r: 0 })).toHaveProperty('err');
    expect(applyAction(s, { type: 'placeItem', b: b.id, key: r.id, f: 0, x: 50, z: 0, r: 0 })).toHaveProperty('err');
    expect(applyAction(s, { type: 'placeItem', b: b.id, key: r.id, f: 3, x: 0, z: 0, r: 0 })).toHaveProperty('err');
  });

  it('jeneratör yalnızca sahaya konabilir', () => {
    const s = newGame('T', T0);
    s.level = 2;
    s.money = 1e7;
    const b = s.buildings[0];
    b.rooms.power = 2;
    applyAction(s, { type: 'buyInfra', b: b.id, item: 'generator' });
    const key = infraKey('generator', 0);
    expect(checkPlacement(b, key, { f: 0, x: 0, z: 0, r: 0 })).not.toBeNull();
    expect(checkPlacement(b, key, { f: 0, x: 25, z: 0, r: 0 })).toBeNull();
  });

  it('döndürme ayak izini değiştirir ve eski kayıtlar otomatik yerleşir', () => {
    expect(footprint('r1', 0)).toEqual([1.0, 1.3]);
    expect(footprint('r1', 1)).toEqual([1.3, 1.0]);
    const s = newGame('T', T0);
    delete s.buildings[0].placed;
    advance(s, T0 + 1000);
    expect(s.buildings[0].placed?.[s.racks[0].id]).toBeDefined();
  });
});
