import * as D from './config/data';
import { derive, refPrice } from './derive';
import { eventCost } from './events';
import type { GameState, GameView } from './types';

/** İstemciye gönderilecek, hesaplanmış oyun görünümü. Tüm değerler motordan gelir. */
export function buildView(s: GameState): GameView {
  const d = derive(s);
  const events = s.events.map((e) => ({
    ...e,
    sols: D.EVENTS[e.type].sols.map((x) => ({ id: x.id, label: x.label, cost: eventCost(s, e, x), min: Math.round(x.min * d.eff.repairMult) })),
  }));
  const offers = s.offers.map((o) => ({ ...o, ref: refPrice(o, d.mods) }));
  const { hist, ...rest } = s;
  return {
    s: { ...rest, events, offers, notifs: s.notifs.slice(-40), tx: s.tx.slice(-40) },
    hist,
    d,
  };
}
