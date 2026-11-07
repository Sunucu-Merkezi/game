import * as D from '@/game-engine/config/data';
import { handle, json } from '@/lib/api';

/** Statik oyun kataloğu (donanım, şehirler, müşteri tipleri...). Oyuncuya özel değildir. */
export async function GET() {
  return handle(async () => json({
    LEVELS: D.LEVELS, SERVICES: D.SERVICES, UNIT_PRICE: D.UNIT_PRICE, CITIES: D.CITIES, ROOMS: D.ROOMS, ROOM_MAX: D.ROOM_MAX, FLOOR_COST: D.FLOOR_COST,
    RACKS: D.RACKS, SERVERS: D.SERVERS, INFRA: D.INFRA, TRANSIT: D.TRANSIT, IX: D.IX, IPBLOCKS: D.IPBLOCKS, FIBER_COSTS: D.FIBER_COSTS,
    CUSTOMERS: D.CUSTOMERS, ROLES: D.ROLES, TECH_CATS: D.TECH_CATS, TECH: D.TECH, EVENTS: D.EVENTS, QUESTS: D.QUESTS,
  }));
}
