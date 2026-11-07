// Sunucu Merkezi — oyun kataloğu (hem sunucu hem istemci tarafından kullanılır)


export interface ServerDef { name: string; u: number; cores: number; ram: number; disk: number; net: number; w: number; price: number; fail: number; lvl: number; gpu: number }
export interface InfraDef { name: string; cat: string; room: string; slot: number; price: number; w: number; lvl: number; desc: string; thr?: number; fw?: number; lbBonus?: number; ups?: number; kw?: number; gen?: number; cool?: number; cop?: number }
export interface LinkDef { name: string; mbps: number; cost: number; lat: number; lvl: number }
export interface CustomerDef { name: string; lvl: number; rep: number; w: number; svc: Record<string, number>; cpu: [number, number]; ram: [number, number]; disk: [number, number]; net: [number, number]; u?: [number, number]; gpu?: [number, number]; dur: [number, number]; ps: number; sup: number; up: number; lat: number; tender: number }
export interface EventSol { id: string; label: string; cost: number; pct: number; min: number }
export interface EventDef { name: string; scope: 'server' | 'building'; w: number; lvl?: number; need?: string; roles: string[]; nat?: number; desc: string; sols: EventSol[] }
export interface CityDef { name: string; rent: number; power: number; demand: number; lat: number; unlock: number; build: number; region: string }
export interface CompetitorSeed { id: string; name: string; strat: string; servers: number; price: number; rep: number; cap: number }
export interface RoleDef { name: string; base: number; lvl: number; desc: string }
export interface QuestDef { id: string; name: string; reward: { money: number; rep?: number } }

const LEVELS = [
  { n: 1, name: 'Yeni Girişim', rev: 0, unlock: 'Temel sunucular, bireysel ve Minecraft müşterileri' },
  { n: 2, name: 'Küçük Hosting Şirketi', rev: 40000, unlock: 'Araştırma, jeneratör, router/firewall, oyun şirketleri, yeni şehirler' },
  { n: 3, name: 'Bölgesel Sağlayıcı', rev: 250000, unlock: 'İhaleler, hosting şirketleri, IX bağlantıları, yönetici ve finans personeli, İstanbul' },
  { n: 4, name: 'Ulusal Sağlayıcı', rev: 1500000, unlock: 'Enterprise sunucu, kurumsal müşteriler, Frankfurt' },
  { n: 5, name: 'Kurumsal Altyapı Şirketi', rev: 8000000, unlock: 'GPU sunucu, sıvı soğutma, büyük teknoloji müşterileri, Londra/Amsterdam' },
  { n: 6, name: 'Global Veri Merkezi Şirketi', rev: 40000000, unlock: 'Singapur, New York, Tier-1 transit' },
  { n: 7, name: 'Teknoloji İmparatorluğu', rev: 200000000, unlock: 'Zirve: her şey açık' },
];

const SERVICES: Record<string, { name: string; mult: number }> = {
  vps: { name: 'VPS Hosting', mult: 1.0 },
  dedicated: { name: 'Dedicated Server', mult: 1.25 },
  web: { name: 'Web Hosting', mult: 0.9 },
  game: { name: 'Game Hosting', mult: 1.3 },
  colo: { name: 'Colocation', mult: 1.0 },
  cloud: { name: 'Cloud Services', mult: 1.5 },
  corp: { name: 'Kurumsal Sözleşme', mult: 1.6 },
};

// kaynak birim fiyatları (TL/ay)
const UNIT_PRICE: Record<string, number> = { cpu: 600, ram: 100, disk: 3, net: 4, u: 1200, gpu: 9000 };

const CITIES: Record<string, CityDef> = {
  kocaeli: { name: 'Kocaeli', rent: 2500, power: 1.0, demand: 1.0, lat: 8, unlock: 1, build: 0, region: 'tr' },
  ankara: { name: 'Ankara', rent: 2800, power: 1.0, demand: 1.0, lat: 9, unlock: 1, build: 60000, region: 'tr' },
  izmir: { name: 'İzmir', rent: 3000, power: 1.05, demand: 1.05, lat: 10, unlock: 2, build: 80000, region: 'tr' },
  istanbul: { name: 'İstanbul', rent: 9000, power: 1.15, demand: 1.6, lat: 4, unlock: 3, build: 180000, region: 'tr' },
  frankfurt: { name: 'Frankfurt', rent: 14000, power: 1.9, demand: 1.9, lat: 38, unlock: 4, build: 450000, region: 'eu' },
  londra: { name: 'Londra', rent: 17000, power: 2.1, demand: 2.1, lat: 44, unlock: 5, build: 650000, region: 'eu' },
  amsterdam: { name: 'Amsterdam', rent: 16000, power: 1.8, demand: 2.0, lat: 42, unlock: 5, build: 650000, region: 'eu' },
  singapur: { name: 'Singapur', rent: 21000, power: 2.3, demand: 2.4, lat: 120, unlock: 6, build: 1300000, region: 'asya' },
  newyork: { name: 'New York', rent: 25000, power: 2.2, demand: 2.6, lat: 110, unlock: 6, build: 1600000, region: 'us' },
};

const ROOMS: Record<string, { name: string; cost: number; desc: string }> = {
  server: { name: 'Sunucu Odası', cost: 12000, desc: 'Seviye başına 4 rack yeri' },
  power: { name: 'Elektrik Odası', cost: 10000, desc: 'Seviye başına 4 elektrik ekipmanı yuvası' },
  cooling: { name: 'Soğutma Odası', cost: 10000, desc: 'Seviye başına 4 soğutma ekipmanı yuvası' },
  network: { name: 'Network Odası', cost: 8000, desc: 'Seviye başına 4 ağ ekipmanı yuvası' },
  security: { name: 'Güvenlik Odası', cost: 15000, desc: 'DDoS, siber saldırı ve yangın riskini azaltır' },
  office: { name: 'Ofis', cost: 6000, desc: 'Seviye başına 4 personel kapasitesi' },
  storage: { name: 'Depo', cost: 5000, desc: 'Yedek parça: arıza onarım maliyeti -%10/seviye' },
};
const ROOM_MAX = 5;
const FLOOR_COST = 25000;

const RACKS: Record<string, { name: string; u: number; price: number }> = {
  u12: { name: '12U Rack', u: 12, price: 3500 },
  u24: { name: '24U Rack', u: 24, price: 7500 },
  u42: { name: '42U Rack', u: 42, price: 14000 },
  u48: { name: '48U Rack', u: 48, price: 17000 },
};

// fail: günlük arıza olasılığı
const SERVERS: Record<string, ServerDef> = {
  baslangic: { name: 'Başlangıç Sunucusu', u: 1, cores: 4, ram: 16, disk: 500, net: 1000, w: 120, price: 9000, fail: 0.004, lvl: 1, gpu: 0 },
  standart: { name: 'Standart Sunucu', u: 1, cores: 8, ram: 32, disk: 1000, net: 1000, w: 200, price: 22000, fail: 0.003, lvl: 1, gpu: 0 },
  profesyonel: { name: 'Profesyonel Sunucu', u: 2, cores: 24, ram: 128, disk: 4000, net: 2000, w: 380, price: 65000, fail: 0.0025, lvl: 2, gpu: 0 },
  depolama: { name: 'Depolama Sunucusu', u: 4, cores: 8, ram: 64, disk: 60000, net: 2000, w: 520, price: 110000, fail: 0.003, lvl: 2, gpu: 0 },
  enterprise: { name: 'Enterprise Sunucu', u: 2, cores: 64, ram: 512, disk: 12000, net: 10000, w: 650, price: 210000, fail: 0.0015, lvl: 4, gpu: 0 },
  gpu: { name: 'GPU Sunucusu', u: 4, cores: 32, ram: 256, disk: 6000, net: 10000, w: 2200, price: 520000, fail: 0.0035, lvl: 5, gpu: 8 },
};

// slot: oda yuvası, room: gerekli oda
const INFRA: Record<string, InfraDef> = {
  switch: { name: 'Switch', cat: 'network', room: 'network', slot: 1, price: 6000, w: 60, thr: 2000, lvl: 1, desc: '2 Gbps cihaz kapasitesi' },
  router: { name: 'Router', cat: 'network', room: 'network', slot: 1, price: 25000, w: 120, thr: 8000, lvl: 2, desc: '8 Gbps cihaz kapasitesi' },
  firewall: { name: 'Firewall', cat: 'network', room: 'network', slot: 1, price: 30000, w: 150, thr: 1500, fw: 0.2, lvl: 2, desc: 'DDoS/siber saldırı hafifletme +%20' },
  lb: { name: 'Load Balancer', cat: 'network', room: 'network', slot: 1, price: 40000, w: 100, thr: 0, lbBonus: 0.08, lvl: 3, desc: 'Efektif bant genişliği +%8 (maks +%25)' },
  nic: { name: 'Network Kartı (10G)', cat: 'network', room: 'network', slot: 1, price: 3000, w: 25, thr: 1000, lvl: 1, desc: '+1 Gbps cihaz kapasitesi' },
  ups: { name: 'UPS', cat: 'power', room: 'power', slot: 1, price: 12000, w: 0, ups: 8, lvl: 1, desc: '8 kW yedek güç; kesinti etkisini azaltır' },
  pdu: { name: 'PDU', cat: 'power', room: 'power', slot: 1, price: 3500, w: 0, kw: 8, lvl: 1, desc: '+8 kW dağıtım kapasitesi' },
  generator: { name: 'Jeneratör', cat: 'power', room: 'power', slot: 2, price: 90000, w: 0, gen: 40, lvl: 2, desc: '40 kW uzun süreli yedek güç' },
  trafo: { name: 'Trafo', cat: 'power', room: 'power', slot: 2, price: 55000, w: 0, kw: 25, lvl: 1, desc: '+25 kW güç kapasitesi' },
  klima: { name: 'Klima', cat: 'cooling', room: 'cooling', slot: 1, price: 8000, w: 0, cool: 6, cop: 2.5, lvl: 1, desc: '6 kW soğutma' },
  endustriyel: { name: 'Endüstriyel Soğutma', cat: 'cooling', room: 'cooling', slot: 2, price: 45000, w: 0, cool: 25, cop: 3.5, lvl: 2, desc: '25 kW soğutma' },
  sivi: { name: 'Sıvı Soğutma', cat: 'cooling', room: 'cooling', slot: 2, price: 140000, w: 0, cool: 60, cop: 5.5, lvl: 5, desc: '60 kW soğutma, çok verimli' },
};
const BASE_POWER_KW = 2;

const TRANSIT: Record<string, LinkDef> = {
  t_yerel: { name: 'Yerel ISS 100 Mbps', mbps: 100, cost: 600, lat: 25, lvl: 1 },
  t_bolgesel: { name: 'Bölgesel ISS 1 Gbps', mbps: 1000, cost: 4000, lat: 18, lvl: 1 },
  t_ulusal: { name: 'Ulusal Transit 10 Gbps', mbps: 10000, cost: 28000, lat: 12, lvl: 3 },
  t_tier1: { name: 'Tier-1 Transit 100 Gbps', mbps: 100000, cost: 190000, lat: 6, lvl: 6 },
};
const IX: Record<string, LinkDef> = {
  ix_1: { name: 'TR-IX Peering 1 Gbps', mbps: 1000, cost: 2500, lat: 4, lvl: 3 },
  ix_10: { name: 'İstanbul IX 10 Gbps', mbps: 10000, cost: 14000, lat: 6, lvl: 3 },
  ix_100: { name: 'AMS-IX 100 Gbps', mbps: 100000, cost: 120000, lat: 8, lvl: 5 },
};
const IPBLOCKS: Record<string, { name: string; n: number; cost: number }> = {
  ip29: { name: '/29 (8 IP)', n: 8, cost: 400 },
  ip27: { name: '/27 (32 IP)', n: 32, cost: 1400 },
  ip24: { name: '/24 (256 IP)', n: 256, cost: 9000 },
  ip22: { name: '/22 (1024 IP)', n: 1024, cost: 32000 },
};
const FIBER_COSTS = [0, 40000, 120000, 350000]; // seviye 1..3 yükseltme bedeli
const FIBER_UPKEEP = 1500;

const CUSTOMERS: Record<string, CustomerDef> = {
  individual: { name: 'Bireysel Müşteri', lvl: 1, rep: 0, w: 5, svc: { vps: 3, web: 4 }, cpu: [1, 2], ram: [1, 4], disk: [20, 100], net: [50, 200], dur: [1, 6], ps: 1.3, sup: 1.0, up: 0.6, lat: 0.5, tender: 0 },
  minecraft: { name: 'Minecraft Sunucu Sahibi', lvl: 1, rep: 0, w: 5, svc: { game: 4, vps: 1 }, cpu: [2, 4], ram: [4, 16], disk: [40, 200], net: [100, 400], dur: [1, 8], ps: 1.1, sup: 0.8, up: 0.9, lat: 1.2, tender: 0 },
  gamecorp: { name: 'Oyun Şirketi', lvl: 2, rep: 20, w: 3, svc: { game: 4, dedicated: 2, cloud: 1 }, cpu: [8, 24], ram: [32, 128], disk: [500, 2000], net: [800, 3000], dur: [6, 24], ps: 0.9, sup: 1.0, up: 1.2, lat: 1.5, tender: 0.15 },
  hosting: { name: 'Hosting Şirketi', lvl: 3, rep: 25, w: 3, svc: { colo: 3, dedicated: 3, vps: 1 }, cpu: [16, 48], ram: [64, 256], disk: [2000, 8000], net: [1500, 6000], u: [2, 12], dur: [6, 24], ps: 1.2, sup: 0.8, up: 1.1, lat: 0.8, tender: 0.2 },
  enterprise: { name: 'Kurumsal Şirket', lvl: 4, rep: 40, w: 3, svc: { corp: 3, cloud: 2, dedicated: 1 }, cpu: [24, 64], ram: [128, 512], disk: [3000, 10000], net: [2000, 8000], dur: [12, 36], ps: 0.6, sup: 1.6, up: 1.5, lat: 1.0, tender: 0.35 },
  bigtech: { name: 'Büyük Teknoloji Şirketi', lvl: 5, rep: 60, w: 2, svc: { cloud: 3, corp: 2 }, cpu: [96, 256], ram: [512, 2048], disk: [10000, 40000], net: [8000, 30000], dur: [12, 48], gpu: [0, 16], ps: 0.5, sup: 1.4, up: 1.6, lat: 1.0, tender: 0.5 },
};

const ROLES: Record<string, RoleDef> = {
  sys: { name: 'Sistem Yöneticisi', base: 14000, lvl: 1, desc: 'Sunucu arızalarını otomatik çözer, performans +' },
  net: { name: 'Network Mühendisi', base: 16000, lvl: 2, desc: 'Ağ olaylarını çözer, gecikmeyi düşürür' },
  sec: { name: 'Güvenlik Uzmanı', base: 15000, lvl: 2, desc: 'DDoS ve siber saldırıları azaltır' },
  tech: { name: 'Donanım Teknisyeni', base: 11000, lvl: 1, desc: 'Arıza oranı ve onarım süresini azaltır' },
  mgr: { name: 'Veri Merkezi Müdürü', base: 28000, lvl: 3, desc: 'İşletme giderlerini azaltır' },
  sup: { name: 'Müşteri Destek Uzmanı', base: 9000, lvl: 1, desc: 'Müşteri memnuniyetini ve destek kapasitesini artırır' },
  fin: { name: 'Finans Müdürü', base: 22000, lvl: 3, desc: 'Vergi ve faiz giderlerini azaltır' },
};
const FIRST = ['Ahmet', 'Elif', 'Mehmet', 'Zeynep', 'Can', 'Ayşe', 'Burak', 'Deniz', 'Emre', 'Selin', 'Kerem', 'Merve', 'Onur', 'Gizem', 'Murat', 'Esra', 'Cem', 'Derya', 'Tolga', 'İrem'];
const LAST = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Aydın', 'Özkan', 'Arslan', 'Doğan', 'Koç', 'Polat', 'Aksoy', 'Erdem', 'Güneş'];

const TECH_CATS: Record<string, { name: string; desc: string; vals: number[]; suffix: string }> = {
  net: { name: 'Gelişmiş Network', desc: 'Bant genişliği verimi', vals: [0.08, 0.15, 0.25], suffix: 'bant genişliği' },
  perf: { name: 'Sunucu Performansı', desc: 'CPU/RAM kapasitesi', vals: [0.08, 0.15, 0.25], suffix: 'işlem kapasitesi' },
  cool: { name: 'Soğutma Teknolojileri', desc: 'Soğutma kapasitesi ve verimliliği', vals: [0.1, 0.2, 0.35], suffix: 'soğutma verimi' },
  sec: { name: 'Siber Güvenlik', desc: 'DDoS/siber saldırı hafifletme', vals: [0.25, 0.45, 0.7], suffix: 'saldırı hafifletme' },
  cloud: { name: 'Cloud Computing', desc: 'Cloud hizmetleri ve fiyat primi', vals: [0.05, 0.1, 0.15], suffix: 'cloud/kurumsal fiyat primi' },
  auto: { name: 'Otomasyon', desc: 'Personelin otomatik müdahale hızı', vals: [0.3, 0.7, 1.2], suffix: 'otomatik müdahale hızı' },
  ai: { name: 'Yapay Zekâ Altyapısı', desc: 'GPU müşterileri ve AI primi', vals: [1, 0.2, 0.3], suffix: '' },
};
const TECH_TIER = [
  { lvl: 2, cost: 20000, days: 2 },
  { lvl: 3, cost: 90000, days: 5 },
  { lvl: 5, cost: 400000, days: 12 },
];
export interface TechDef { id: string; cat: string; tier: number; name: string; cost: number; days: number; lvl: number; effect: string; req: string | null }
const TECH: TechDef[] = [];
for (const [cat, c] of Object.entries(TECH_CATS)) {
  for (let t = 1; t <= 3; t++) {
    const tt = TECH_TIER[t - 1];
    let effect = '+%' + Math.round(c.vals[t - 1] * 100) + ' ' + c.suffix;
    if (cat === 'cloud' && t === 1) effect = 'Cloud hizmeti açılır, +%5 cloud/kurumsal fiyat primi';
    if (cat === 'ai') effect = ['GPU talepli AI müşterileri ve GPU kaynağı açılır', 'GPU performansı +%20', 'AI altyapı fiyat primi +%30'][t - 1];
    TECH.push({ id: cat + t, cat, tier: t, name: c.name + ' ' + 'I'.repeat(t), cost: tt.cost * (cat === 'ai' ? 1.5 : 1), days: tt.days, lvl: tt.lvl, effect, req: t > 1 ? cat + (t - 1) : null });
  }
}

const EVENTS: Record<string, EventDef> = {
  server_fail: { name: 'Sunucu Arızası', scope: 'server', w: 0, roles: ['tech', 'sys'], desc: 'Bir sunucu çöktü ve devre dışı.', sols: [
    { id: 'tamir', label: 'Teknisyen onarımı', cost: 1200, pct: 0.03, min: 360 },
    { id: 'degistir', label: 'Yedek sunucu ile değiştir', cost: 0, pct: 0.6, min: 30 }] },
  disk_fail: { name: 'Disk Bozulması', scope: 'server', w: 0, roles: ['tech', 'sys'], desc: 'Bir sunucunun diskleri bozuldu, disk kapasitesi yarıya düştü.', sols: [
    { id: 'degistir', label: 'Diski değiştir', cost: 2000, pct: 0.04, min: 240 },
    { id: 'yedek', label: 'Yedekten acil geri yükle', cost: 0, pct: 0.12, min: 40 }] },
  overheat: { name: 'CPU Aşırı Isınması', scope: 'server', w: 0, roles: ['tech', 'sys'], nat: 1440, desc: 'Bir sunucu aşırı ısındı, performansı düştü.', sols: [
    { id: 'fan', label: 'Fan ve macun bakımı', cost: 500, pct: 0.01, min: 120 },
    { id: 'acil', label: 'Acil soğutma müdahalesi', cost: 2500, pct: 0, min: 15 }] },
  power_out: { name: 'Elektrik Kesintisi', scope: 'building', w: 3, lvl: 1, roles: ['sys'], nat: 480, desc: 'Şebeke elektriği kesildi. UPS ve jeneratör etkiyi azaltır.', sols: [
    { id: 'bekle', label: 'Şebekeyi bekle', cost: 0, pct: 0, min: 360 },
    { id: 'jenerator', label: 'Acil jeneratör kirala', cost: 5000, pct: 0, min: 45 }] },
  ups_fail: { name: 'UPS Arızası', scope: 'building', w: 1.5, lvl: 2, need: 'ups', roles: ['tech'], desc: 'UPS devre dışı, yedek güç koruması yok.', sols: [
    { id: 'aku', label: 'Akü değişimi', cost: 3500, pct: 0, min: 240 },
    { id: 'yeni', label: 'Acil UPS kurulumu', cost: 9000, pct: 0, min: 30 }] },
  net_out: { name: 'Network Kesintisi', scope: 'building', w: 2, lvl: 1, roles: ['net'], nat: 720, desc: 'Yukarı hat koptu. Birden fazla hat varsa etki azalır.', sols: [
    { id: 'destek', label: 'ISS destek talebi', cost: 0, pct: 0, min: 600 },
    { id: 'yedek', label: 'Yedek hat kirala', cost: 3500, pct: 0, min: 60 }] },
  fiber_cut: { name: 'Fiber Kablo Hasarı', scope: 'building', w: 1, lvl: 2, roles: ['net'], nat: 2880, desc: 'Kazı çalışması fiber kabloyu kesti.', sols: [
    { id: 'ekip', label: 'Fiber onarım ekibi', cost: 8000, pct: 0, min: 300 },
    { id: 'rota', label: 'Alternatif rota aç', cost: 15000, pct: 0, min: 90 }] },
  ddos: { name: 'DDoS Saldırısı', scope: 'building', w: 2, lvl: 2, roles: ['sec', 'net'], nat: 720, desc: 'Gelen trafik saldırı trafiğiyle doldu. Firewall ve güvenlik etkiyi azaltır.', sols: [
    { id: 'blackhole', label: 'Kara delik yönlendirme', cost: 0, pct: 0, min: 300 },
    { id: 'temizle', label: 'Trafik temizleme servisi', cost: 6000, pct: 0, min: 30 }] },
  cooling_fail: { name: 'Soğutma Sistemi Arızası', scope: 'building', w: 1.5, lvl: 1, need: 'cooling', roles: ['tech'], desc: 'Soğutma kapasitesi çöktü; sıcaklık hızla yükselir.', sols: [
    { id: 'tekniker', label: 'Teknisyen müdahalesi', cost: 3500, pct: 0, min: 240 },
    { id: 'mobil', label: 'Mobil klima kirala', cost: 9000, pct: 0, min: 30 }] },
  fire_risk: { name: 'Yangın Riski', scope: 'building', w: 0.8, lvl: 2, roles: ['sec', 'tech'], desc: '12 saat içinde müdahale edilmezse bir rack yanabilir!', sols: [
    { id: 'sondurme', label: 'Söndürme sistemini devreye al', cost: 2500, pct: 0, min: 90 },
    { id: 'izole', label: 'Acil izolasyon ekibi', cost: 7000, pct: 0, min: 20 }] },
  cyber: { name: 'Siber Saldırı', scope: 'building', w: 1.5, lvl: 3, roles: ['sec'], nat: 1440, desc: 'Sistemlere sızma girişimi. Müşteri memnuniyeti ve itibar düşer.', sols: [
    { id: 'izole', label: 'Sistemi izole et', cost: 0, pct: 0, min: 900 },
    { id: 'ekip', label: 'Güvenlik müdahale ekibi', cost: 12000, pct: 0, min: 300 }] },
};

const COMPETITORS: CompetitorSeed[] = [
  { id: 'c1', name: 'HostAnka', strat: 'cheap', servers: 40, price: 0.85, rep: 40, cap: 120000 },
  { id: 'c2', name: 'Bulutix', strat: 'quality', servers: 30, price: 1.15, rep: 60, cap: 200000 },
  { id: 'c3', name: 'Veri Kalesi', strat: 'balanced', servers: 25, price: 1.0, rep: 50, cap: 90000 },
  { id: 'c4', name: 'GlobalNet TR', strat: 'aggressive', servers: 35, price: 0.95, rep: 45, cap: 150000 },
];

const QUESTS: QuestDef[] = [
  { id: 'q_server', name: 'İlk sunucunu satın al', reward: { money: 3000 } },
  { id: 'q_customer', name: 'İlk müşterini kazan', reward: { money: 5000, rep: 2 } },
  { id: 'q_rev1k', name: 'İlk 1.000 TL gelirini elde et', reward: { money: 3000 } },
  { id: 'q_hire', name: 'İlk çalışanını işe al', reward: { money: 5000 } },
  { id: 'q_srv10', name: '10 sunucuya ulaş', reward: { money: 25000, rep: 3 } },
  { id: 'q_research', name: 'İlk araştırmanı tamamla', reward: { money: 15000 } },
  { id: 'q_dc', name: 'İlk ek veri merkezini aç', reward: { money: 50000, rep: 5 } },
  { id: 'q_event', name: '5 olayı başarıyla çöz', reward: { money: 15000, rep: 3 } },
  { id: 'q_lvl2', name: 'Küçük Hosting Şirketi seviyesine ulaş', reward: { money: 20000 } },
  { id: 'q_cust25', name: '25 müşteriye ulaş', reward: { money: 60000, rep: 4 } },
  { id: 'q_tender', name: 'İlk ihaleyi kazan', reward: { money: 80000, rep: 5 } },
  { id: 'q_cust100', name: '100 müşteriye ulaş', reward: { money: 400000, rep: 8 } },
  { id: 'q_corp', name: 'İlk kurumsal sözleşmeni imzala', reward: { money: 250000, rep: 6 } },
  { id: 'q_lvl4', name: 'Ulusal Sağlayıcı seviyesine ulaş', reward: { money: 600000 } },
  { id: 'q_rep60', name: 'İtibarı 60’a çıkar', reward: { money: 300000 } },
  { id: 'q_srv50', name: '50 sunucuya ulaş', reward: { money: 500000, rep: 5 } },
  { id: 'q_intl', name: 'Yurtdışında veri merkezi aç', reward: { money: 1000000, rep: 8 } },
  { id: 'q_share20', name: '%20 pazar payına ulaş', reward: { money: 2500000, rep: 10 } },
  { id: 'q_lvl7', name: 'Teknoloji İmparatorluğu ol', reward: { money: 20000000 } },
];

const NAMES: Record<string, string[]> = {
  individual: ['Kaan', 'Ece', 'Berk', 'Nil', 'Arda', 'Duru', 'Yağız', 'Ada', 'Mina', 'Efe'],
  minecraft: ['CraftTR', 'BlokDünya', 'KüpAdası', 'SkyBlok', 'MadenKöy', 'Survival-TR', 'Elmas SMP', 'PixelDiyar'],
  gamecorp: ['Pixel Atölye', 'Yıldız Oyun', 'Boğaz Games', 'Kıvılcım Studio', 'Gölge Oyun', 'Nokta Interactive'],
  hosting: ['HızlıHost', 'WebKöprü', 'AnadoluSite', 'Panel Hosting', 'NetBayi', 'SitePark'],
  enterprise: ['Anadolu Bank', 'Marmara Lojistik', 'Ege Perakende', 'Toros Holding', 'Boğaz Sigorta', 'Kızılay Enerji'],
  bigtech: ['Nova Cloud', 'Quantix AI', 'Hyperion Systems', 'Aeris Technologies', 'Zenith Data'],
};

export { LEVELS, SERVICES, UNIT_PRICE, CITIES, ROOMS, ROOM_MAX, FLOOR_COST, RACKS, SERVERS, INFRA, BASE_POWER_KW, TRANSIT, IX, IPBLOCKS, FIBER_COSTS, FIBER_UPKEEP, CUSTOMERS, ROLES, FIRST, LAST, TECH_CATS, TECH, EVENTS, COMPETITORS, QUESTS, NAMES };
