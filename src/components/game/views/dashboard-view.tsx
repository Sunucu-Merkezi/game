'use client';
import { Activity, Cpu, Database, Gauge, HardDrive, MemoryStick, Network, Server, Star, Thermometer, TrendingDown, TrendingUp, Users, Wallet, Zap } from 'lucide-react';
import Link from 'next/link';
import { WithGame } from '@/components/game/with-game';
import { Badge, Card, Empty, PageHeader, Stat } from '@/components/ui/primitives';
import { HistChart } from '@/components/ui/charts';
import { unplacedKeys } from '@/game-engine/layout';
import { fmtDec, fmtMbps, fmtPct, fmtSize, fmtTL } from '@/lib/format';

export function DashboardView() {
  return (
    <WithGame>
      {(g, cat) => {
        const { s, d, hist } = g;
        const net = d.incHr - d.expHr;
        const tempTone = d.tot.tempMax > 45 ? 'bad' : d.tot.tempMax > 35 ? 'warn' : 'ok';
        const hints: string[] = [];
        if (s.servers.length === 0) hints.push('Henüz sunucun yok. Donanım Mağazası’ndan bir sunucu al; rack’e yerleşir.');
        else if (s.contracts.length === 0) hints.push('Sunucun hazır. Müşteriler sayfasından gelen bir teklifi kabul et.');
        if (s.offers.length > 0 && s.contracts.length < 3) hints.push(`${s.offers.length} müşteri teklifi seni bekliyor.`);
        const pend = s.buildings.reduce((a, b) => a + unplacedKeys(b).length + s.racks.filter((r) => r.b === b.id && !b.placed?.[r.id]).length, 0);
        if (pend > 0) hints.push(`${pend} ürün yerleştirilmeyi bekliyor; 3D Veri Merkezi sayfasında yerleştirmezsen çalışmaz.`);
        if (s.money < 0) hints.push('Bakiyen eksiye düştü! Ekonomi sayfasından kredi çekebilir veya giderleri azaltabilirsin.');
        return (
          <>
            <PageHeader title="Ana Panel" desc={`${s.company} — ${cat.LEVELS[s.level - 1].name}`} />
            {hints.map((h) => <div key={h} className="mb-3 rounded-lg border border-neon/40 bg-neon/10 px-4 py-2.5 text-sm text-neonSoft">{h}</div>)}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Şirket bakiyesi" icon={Wallet} value={fmtTL(s.money, true)} tone={s.money < 0 ? 'bad' : 'neon'} sub={s.loan ? `Kredi borcu ${fmtTL(s.loan)}` : undefined} />
              <Stat label="Saatlik gelir" icon={TrendingUp} tone="ok" value={fmtTL(d.incHr)} sub="oyun saati başına" />
              <Stat label="Saatlik gider" icon={TrendingDown} tone="warn" value={fmtTL(d.expHr)} sub="elektrik, maaş, kira, vergi…" />
              <Stat label="Net kâr / saat" icon={Activity} tone={net >= 0 ? 'ok' : 'bad'} value={`${net >= 0 ? '+' : ''}${fmtTL(net)}`} />
              <Stat label="Aktif müşteri" icon={Users} value={s.contracts.length} sub={`Memnuniyet %${fmtDec(d.avgSat)}`} />
              <Stat label="Aktif sunucu" icon={Server} value={`${d.tot.srvOk} / ${d.tot.srv}`} sub={`${s.racks.length} rack · ${s.buildings.length} veri merkezi`} />
              <Stat label="CPU kullanımı" icon={Cpu} value={fmtPct(d.cpuPct, 1)} sub={`Ayrılan ${d.tot.cpuUsed} / ${Math.round(d.tot.cpuCap)} çekirdek`} />
              <Stat label="RAM kullanımı" icon={MemoryStick} value={fmtPct(d.ramPct, 1)} sub={`${fmtSize(d.tot.ramUsed)} / ${fmtSize(d.tot.ramCap)}`} />
              <Stat label="Disk kapasitesi" icon={HardDrive} value={fmtPct(d.diskPct, 1)} sub={`${fmtSize(d.tot.diskUsed)} / ${fmtSize(d.tot.diskCap)}`} />
              <Stat label="Network trafiği" icon={Network} value={fmtMbps(d.netTraffic)} sub={`Kapasite ${fmtMbps(d.tot.netCap)}`} />
              <Stat label="Elektrik tüketimi" icon={Zap} value={`${fmtDec(d.tot.kw)} kW`} sub={`Aylık ${fmtTL(d.expMo.elec)}`} />
              <Stat label="Sıcaklık (maks.)" icon={Thermometer} tone={tempTone} value={`${fmtDec(d.tot.tempMax)} °C`} sub={d.tot.tempMax > 35 ? 'Soğutma yetersiz — performans düşüyor' : 'Normal'} />
              <Stat label="Şirket itibarı" icon={Star} value={fmtDec(s.rep)} sub="0 – 100" />
              <Stat label="Pazar payı" icon={Gauge} value={fmtPct(s.market.share, 1)} sub="aylık gelire göre" />
              <Stat label="Net varlık değeri" icon={Database} value={fmtTL(s.money + d.tot.hwValue * 0.5 - s.loan, true)} sub="bakiye + donanımın %50’si − borç" />
              <Stat label="Toplam gelir" icon={Wallet} value={fmtTL(s.rev, true)} sub="seviye ilerlemesi için" />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card title="Bakiye" icon={Wallet}><HistChart data={hist} area series={[{ key: 'bal', name: 'Bakiye (₺)' }]} unit="" /></Card>
              <Card title="Saatlik gelir ve gider" icon={Activity}>
                <HistChart data={hist} area series={[{ key: 'inc', name: 'Gelir', color: '#22c55e' }, { key: 'exp', name: 'Gider', color: '#f59e0b' }]} />
              </Card>
              <Card title="Kaynak kullanımı (%)" icon={Cpu}>
                <HistChart data={hist} series={[{ key: 'cpu', name: 'CPU %' }, { key: 'ram', name: 'RAM %' }, { key: 'disk', name: 'Disk %' }]} />
              </Card>
              <Card title="Network trafiği (Mbps)" icon={Network}><HistChart data={hist} area series={[{ key: 'net', name: 'Trafik' }]} /></Card>
              <Card title="Elektrik (kW) ve sıcaklık (°C)" icon={Thermometer}>
                <HistChart data={hist} series={[{ key: 'kw', name: 'kW', color: '#f59e0b' }, { key: 'temp', name: '°C', color: '#ef4444' }]} />
              </Card>
              <Card title="İtibar, memnuniyet, müşteri" icon={Star}>
                <HistChart data={hist} series={[{ key: 'rep', name: 'İtibar' }, { key: 'sat', name: 'Memnuniyet', color: '#22c55e' }, { key: 'cust', name: 'Müşteri', color: '#a78bfa' }]} />
              </Card>
            </div>

            <Card title="Aktif olaylar" icon={Activity} className="mt-4" right={<Link href="/events" className="text-xs text-neonSoft hover:underline">Tümü</Link>}>
              {s.events.length === 0 ? <Empty text="Şu an aktif olay yok. Her şey yolunda." /> : (
                <div className="space-y-2">
                  {s.events.map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg border border-line bg-panel2 px-3 py-2 text-sm">
                      <span>{cat.EVENTS[e.type].name}</span>
                      <Badge tone={e.fixAt != null ? 'warn' : 'bad'}>{e.fixAt != null ? 'Müdahale sürüyor' : 'Müdahale bekliyor'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        );
      }}
    </WithGame>
  );
}
