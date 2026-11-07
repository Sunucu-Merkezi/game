'use client';
import { Check, FlaskConical, Lock } from 'lucide-react';
import { WithGame } from '@/components/game/with-game';
import { Badge, Bar, Button, Card, PageHeader } from '@/components/ui/primitives';
import { useAct } from '@/hooks/use-game';
import { fmtDuration, fmtTL } from '@/lib/format';

export function ResearchView() {
  const act = useAct();
  return (
    <WithGame>
      {(g, cat) => {
        const { s } = g;
        const active = s.research.active;
        const activeTech = active ? cat.TECH.find((t) => t.id === active.id) : null;
        return (
          <>
            <PageHeader title="Araştırma" desc="Araştırmalar zaman ve para gerektirir; aynı anda yalnızca biri sürer." />
            {active && activeTech && (
              <Card title={`Araştırılıyor: ${activeTech.name}`} icon={FlaskConical} className="mb-4">
                <Bar value={1 - active.left / active.total} tone="ok" />
                <p className="num mt-2 text-xs text-slate-400">Kalan {fmtDuration(active.left)} · {activeTech.effect}</p>
              </Card>
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(cat.TECH_CATS).map(([key, c]) => (
                <Card key={key} title={c.name} icon={FlaskConical}>
                  <p className="mb-3 text-xs text-slate-500">{c.desc}</p>
                  <div className="space-y-2">
                    {cat.TECH.filter((t) => t.cat === key).map((t) => {
                      const done = s.research.done[t.id];
                      const levelLock = s.level < t.lvl;
                      const preLock = !!t.req && !s.research.done[t.req];
                      return (
                        <div key={t.id} className="rounded-lg border border-line bg-panel2 p-2.5 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-white">{t.name}</span>
                            {done ? <Badge tone="ok"><Check size={11} className="mr-1" />Tamam</Badge> : levelLock || preLock ? <Badge tone="mute"><Lock size={10} className="mr-1" />{levelLock ? `Seviye ${t.lvl}` : 'Önceki gerekli'}</Badge> : null}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400">{t.effect}</p>
                          {!done && (
                            <Button size="sm" className="mt-2 w-full" disabled={levelLock || preLock || !!active} onClick={() => act({ type: 'startResearch', id: t.id })}>
                              {fmtTL(t.cost, true)} · {t.days} gün
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </>
        );
      }}
    </WithGame>
  );
}
