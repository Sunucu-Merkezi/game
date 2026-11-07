import { z } from 'zod';

const id = z.string().min(1).max(40);
const key = z.string().min(1).max(40);
const idx = z.number().int().min(0).max(50);
const money = z.number().int().min(1).max(1_000_000_000);

/** Oyuncunun gönderebileceği tüm eylemler. API katmanı ve motor aynı şemayı kullanır. */
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('setSpeed'), speed: z.union([z.literal(1), z.literal(2), z.literal(5), z.literal(10)]) }),
  z.object({ type: z.literal('buyRack'), b: id, rack: key }),
  z.object({ type: z.literal('sellRack'), id }),
  z.object({ type: z.literal('buyServer'), server: key, rack: id }),
  z.object({ type: z.literal('sellServer'), id }),
  z.object({ type: z.literal('buyInfra'), b: id, item: key }),
  z.object({ type: z.literal('sellInfra'), b: id, item: key }),
  z.object({ type: z.literal('placeItem'), b: id, key: z.string().min(1).max(60), f: z.number().int().min(0).max(4), x: z.number().min(-60).max(60), z: z.number().min(-60).max(60), r: z.number().int().min(0).max(3) }),
  z.object({ type: z.literal('unplaceItem'), b: id, key: z.string().min(1).max(60) }),
  z.object({ type: z.literal('buildRoom'), b: id, room: key }),
  z.object({ type: z.literal('addFloor'), b: id }),
  z.object({ type: z.literal('buyBuilding'), city: key }),
  z.object({ type: z.literal('buyUplink'), b: id, k: key }),
  z.object({ type: z.literal('dropUplink'), b: id, idx }),
  z.object({ type: z.literal('buyIp'), b: id, k: key }),
  z.object({ type: z.literal('dropIp'), b: id, idx }),
  z.object({ type: z.literal('upgradeFiber'), b: id }),
  z.object({ type: z.literal('setPrice'), svc: key, mult: z.number().min(0.5).max(2) }),
  z.object({ type: z.literal('declineOffer'), id }),
  z.object({ type: z.literal('acceptOffer'), id, b: id, bid: z.number().min(0.6).max(1.4).optional() }),
  z.object({ type: z.literal('cancelContract'), id }),
  z.object({ type: z.literal('hire'), id }),
  z.object({ type: z.literal('fire'), id }),
  z.object({ type: z.literal('raise'), id }),
  z.object({ type: z.literal('train'), id }),
  z.object({ type: z.literal('refreshCandidates') }),
  z.object({ type: z.literal('resolveEvent'), id, sol: key }),
  z.object({ type: z.literal('startResearch'), id: key }),
  z.object({ type: z.literal('marketing') }),
  z.object({ type: z.literal('loan'), amount: money }),
  z.object({ type: z.literal('repay'), amount: money }),
  z.object({ type: z.literal('claimQuest'), id: key }),
]);

export type Action = z.infer<typeof actionSchema>;
