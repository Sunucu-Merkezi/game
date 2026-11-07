// Oyun motoru ortak tipleri
export type NotifType = 'info' | 'good' | 'warn' | 'bad';

export interface Notif { id: number; t: number; type: NotifType; msg: string }
export interface Tx { t: number; a: number; n: string }

export interface Placement { f: number; x: number; z: number; r: number }

export interface Building {
  /** Elle yerleştirilen rack (rack id) ve ekipmanların ("tür#sıra") 3D konumu. Yerleştirilmeyen ekipman çalışmaz. */
  placed?: Record<string, Placement>;
  id: string; city: string; name: string; floors: number;
  rooms: Record<string, number>; infra: Record<string, number>;
  uplinks: string[]; ips: string[]; fiber: number;
}
export interface Rack { id: string; b: string; type: string; u: number }
export interface Srv { id: string; type: string; rack: string; b: string; ok: boolean; hot?: boolean; dm?: boolean }

export interface Contract {
  id: string; cust: string; svc: string; name: string; b: string;
  cpu: number; ram: number; disk: number; net: number; gpu: number; u: number; ips: number;
  price: number; mult: number; months: number; start: number; end: number; sat: number; up: number; bad: number;
}
export interface Offer {
  id: string; cust: string; svc: string; name: string;
  cpu: number; ram: number; disk: number; net: number; gpu: number; u: number; ips: number; months: number; exp: number;
  tender?: boolean; comp?: string; compMult?: number;
}
export interface GameEvent {
  id: string; type: string; b: string; sev: number; t0: number; fixAt: number | null; sid: string | null; auto: boolean;
}
export interface Staff {
  id: string; name: string; role: string; exp: number; skill: number; salary: number; base: number; morale: number; pay: number; trainAt: number;
}
export interface Candidate { id: string; name: string; role: string; exp: number; skill: number; salary: number }
export interface Competitor {
  id: string; name: string; strat: string; servers: number; price: number; rep: number; cap: number; rev: number; share?: number;
}
export interface HistPoint {
  t: number; bal: number; inc: number; exp: number; cpu: number; ram: number; disk: number; net: number;
  kw: number; temp: number; rep: number; cust: number; srv: number; sat: number;
}

export interface GameState {
  v: number; company: string; created: number; last: number;
  t: number; speed: number; money: number; rep: number; rev: number; level: number; seq: number; loan: number;
  buildings: Building[]; racks: Rack[]; servers: Srv[]; contracts: Contract[]; offers: Offer[]; events: GameEvent[];
  staff: Staff[]; candidates: Candidate[];
  prices: Record<string, number>;
  research: { done: Record<string, boolean>; active: { id: string; left: number; total: number } | null };
  comp: Competitor[];
  market: { total: number; idx: number; share: number; compShare: number };
  quests: Record<string, 'ready' | 'claimed'>;
  notifs: Notif[]; nid: number; hist: HistPoint[]; tx: Tx[];
  marketing: number; lastSample: number; lastDay: number;
  stats: { serversBought: number; contracts: number; resolved: number; tenders: number; hired: number; corp: number; churned: number; lost: number };
}

export interface TechMods {
  net: number; perf: number; cool: number; sec: number; auto: number; cloudP: number;
  cloud: boolean; ai: boolean; gpuP: number; aiP: number;
}
export interface StaffStats {
  sys: number; net: number; sec: number; tech: number; mgr: number; sup: number; fin: number; n: number; salary: number; morale: number;
}
export interface Resources { cpu: number; ram: number; disk: number; gpu: number }
export interface Used { cpu: number; ram: number; disk: number; net: number; gpu: number; u: number; ip: number }
export interface SlotInfo { used: Record<string, number>; cap: Record<string, number> }

export interface BuildingDerived {
  id: string; ev: Record<string, number>;
  cores: number; nom: Resources; cap: Resources & { net: number }; used: Used;
  bw: number; bwRaw: number; itKw: number; coolKw: number; coolPowerKw: number; totKw: number; powerCap: number; powerF: number;
  temp: number; throttle: number; ratio: number; perf: number; avail: number; prot: number; mit: number; lat: number;
  ipTotal: number; ipFree: number; freeU: number; totU: number; usedU: number; srvCount: number; okN: number;
  failRate: number; slots: SlotInfo; cpuUtil: number;
  exp: { elec: number; net: number; rent: number; hw: number };
}
export interface Totals {
  cpuCap: number; cpuUsed: number; ramCap: number; ramUsed: number; diskCap: number; diskUsed: number; netCap: number; netUsed: number;
  kw: number; srv: number; srvOk: number; tempMax: number; incHr: number; hwValue: number;
}
export interface ExpenseBreakdown { elec: number; net: number; salary: number; hw: number; rent: number; tax: number; interest: number }
export interface Derived {
  mods: TechMods; st: StaffStats;
  eff: { failMult: number; repairMult: number; opexDisc: number; taxDisc: number };
  b: Record<string, BuildingDerived>; q: Record<string, number>; incSvc: Record<string, number>;
  diur: number; tot: Totals; expMo: ExpenseBreakdown; expHr: number; incHr: number;
  supScore: number; avgSat: number; cpuPct: number; ramPct: number; diskPct: number; netTraffic: number; officeCap: number;
}

export type ActionResult = { ok: true; msg: string } | { err: string };
export interface OfflineReport { secs: number; days: number; money: number; events: number; customers: number }

export type EventView = GameEvent & { sols: { id: string; label: string; cost: number; min: number }[] };
export type OfferView = Offer & { ref: number };
export interface GameView {
  s: Omit<GameState, 'hist' | 'events' | 'offers'> & { events: EventView[]; offers: OfferView[] };
  hist: HistPoint[];
  d: Omit<Derived, 'q'> & { q: Record<string, number> };
}
