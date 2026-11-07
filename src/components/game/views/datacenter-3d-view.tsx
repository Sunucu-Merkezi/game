'use client';
import dynamic from 'next/dynamic';
import { BuildingPicker, selectBuilding } from '@/components/game/building-picker';
import { WithGame } from '@/components/game/with-game';
import { PageHeader, Skeleton } from '@/components/ui/primitives';
import { useAct } from '@/hooks/use-game';
import { unplacedKeys } from '@/game-engine/layout';
import { useUi } from '@/stores/ui-store';

const Datacenter3D = dynamic(() => import('@/components/game/datacenter-3d').then((m) => m.Datacenter3D), {
  ssr: false,
  loading: () => <Skeleton className="h-[60vh] w-full" />,
});

export function Datacenter3DView() {
  const act = useAct();
  const selId = useUi((s) => s.buildingId);
  return (
    <WithGame>
      {(g, cat) => {
        const b = selectBuilding(g.s.buildings, selId);
        const pending = unplacedKeys(b).length + g.s.racks.filter((r) => r.b === b.id && !b.placed?.[r.id]).length;
        return (
          <>
            <PageHeader title="3D Veri Merkezi" desc="Rack ve ekipmanları kendin yerleştir. Yerleştirilmeyen donanım çalışmaz; içeride yürüyerek gezebilirsin." />
            {pending > 0 && <div className="mb-3 rounded-lg border border-warn/40 bg-warn/10 px-4 py-2 text-sm text-warn">{pending} ürün yerleştirilmeyi bekliyor. “Yerleştir” modunu aç, envanterden seç ve zemine tıkla.</div>}
            <BuildingPicker buildings={g.s.buildings} cat={cat} />
            <Datacenter3D key={b.id} building={b} racks={g.s.racks.filter((r) => r.b === b.id)} servers={g.s.servers.filter((v) => v.b === b.id)} cat={cat} level={g.s.level} money={g.s.money} onAction={act} />
          </>
        );
      }}
    </WithGame>
  );
}
