'use client';
import { ShieldCheck, Siren } from 'lucide-react';
import { WithGame } from '@/components/game/with-game';
import { Badge, Button, Card, Empty, PageHeader } from '@/components/ui/primitives';
import { useAct } from '@/hooks/use-game';
import { fmtDuration, fmtTL } from '@/lib/format';

export function EventsView() {
  const act = useAct();
  return (
    <WithGame>
      {(g, cat) => {
        const { s } = g;
        return (
          <>
            <PageHeader title="Olaylar" desc="Arızalar ve saldırılar kendiliğinden gerçekleşir. Her olayın çözümü ve ekonomik etkisi farklıdır; personelin bir kısmına kendisi müdahale eder." />
            {s.events.length === 0 ? (
              <Card><Empty text="Aktif olay yok. UPS, jeneratör, yedek hat, firewall ve güvenlik personeli olayların etkisini azaltır." icon={ShieldCheck} /></Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {s.events.map((e) => {
                  const def = cat.EVENTS[e.type];
                  const b = s.buildings.find((x) => x.id === e.b);
                  const srv = e.sid ? s.servers.find((v) => v.id === e.sid) : null;
                  const fixing = e.fixAt != null;
                  return (
                    <Card key={e.id} title={def.name} icon={Siren} right={<Badge tone={fixing ? 'warn' : 'bad'}>{fixing ? `Müdahale: ${fmtDuration(Math.max(0, (e.fixAt ?? 0) - s.t))}` : `Şiddet ${e.sev}`}</Badge>}>
                      <p className="text-sm text-slate-300">{def.desc}</p>
                      <p className="mt-1 text-xs text-slate-500">{b?.name}{srv ? ` · ${cat.SERVERS[srv.type].name}` : ''} · {e.auto ? 'ekip müdahale etti' : 'bekliyor'}</p>
                      {e.type === 'fire_risk' && !fixing && <p className="mt-2 text-xs text-bad">Süre dolmadan müdahale et: bir rack kaybedebilirsin.</p>}
                      {!fixing && (
                        <div className="mt-3 flex flex-col gap-2">
                          {e.sols.map((sol) => (
                            <Button key={sol.id} variant={sol.cost === 0 ? 'ghost' : 'primary'} disabled={s.money < sol.cost} onClick={() => act({ type: 'resolveEvent', id: e.id, sol: sol.id })}>
                              {sol.label} · {sol.cost ? fmtTL(sol.cost) : 'ücretsiz'} · ~{fmtDuration(sol.min)}
                            </Button>
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
            <Card title="Çözülen olay sayısı" className="mt-4"><span className="num text-2xl text-white">{s.stats.resolved}</span></Card>
          </>
        );
      }}
    </WithGame>
  );
}
