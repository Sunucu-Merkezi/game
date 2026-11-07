import type * as D from '@/game-engine/config/data';

/** /api/v1/catalog yanıtı */
export interface Catalog {
  LEVELS: typeof D.LEVELS;
  SERVICES: typeof D.SERVICES;
  UNIT_PRICE: typeof D.UNIT_PRICE;
  CITIES: typeof D.CITIES;
  ROOMS: typeof D.ROOMS;
  ROOM_MAX: number;
  FLOOR_COST: number;
  RACKS: typeof D.RACKS;
  SERVERS: typeof D.SERVERS;
  INFRA: typeof D.INFRA;
  TRANSIT: typeof D.TRANSIT;
  IX: typeof D.IX;
  IPBLOCKS: typeof D.IPBLOCKS;
  FIBER_COSTS: number[];
  CUSTOMERS: typeof D.CUSTOMERS;
  ROLES: typeof D.ROLES;
  TECH_CATS: typeof D.TECH_CATS;
  TECH: typeof D.TECH;
  EVENTS: typeof D.EVENTS;
  QUESTS: typeof D.QUESTS;
}
