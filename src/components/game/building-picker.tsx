'use client';
import { Building2 } from 'lucide-react';
import type { Building } from '@/game-engine/types';
import { cn } from '@/components/ui/primitives';
import { useUi } from '@/stores/ui-store';
import type { Catalog } from '@/types/catalog';

/** Seçili binayı döndürür (ilk bina varsayılan). Hook değildir; id ui-store'dan okunur. */
export function selectBuilding(buildings: Building[], id: string | null): Building {
  return buildings.find((b) => b.id === id) ?? buildings[0];
}

export function BuildingPicker({ buildings, cat }: { buildings: Building[]; cat: Catalog }) {
  const selId = useUi((s) => s.buildingId);
  const sel = selectBuilding(buildings, selId);
  const set = useUi((s) => s.setBuilding);
  if (buildings.length < 2) return null;
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {buildings.map((b) => (
        <button key={b.id} onClick={() => set(b.id)}
          className={cn('flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition', b.id === sel.id ? 'border-neon bg-neon/15 text-white' : 'border-line bg-panel text-slate-400 hover:text-white')}>
          <Building2 size={14} />{b.name}
          <span className="text-[10px] text-slate-500">{cat.CITIES[b.city].name}</span>
        </button>
      ))}
    </div>
  );
}
