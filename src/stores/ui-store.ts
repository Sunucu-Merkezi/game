import { create } from 'zustand';

export interface Toast { id: number; type: 'info' | 'good' | 'warn' | 'bad'; msg: string }

interface UiState {
  toasts: Toast[];
  lastNotifId: number;
  seenNotifs: boolean;
  buildingId: string | null;
  pushToast: (type: Toast['type'], msg: string) => void;
  dismissToast: (id: number) => void;
  setLastNotifId: (id: number) => void;
  setBuilding: (id: string) => void;
}

let toastSeq = 1;

/** Yalnızca arayüz durumu (bildirimler, seçili bina). Oyun verisi TanStack Query'dedir. */
export const useUi = create<UiState>((set) => ({
  toasts: [],
  lastNotifId: -1,
  seenNotifs: false,
  buildingId: null,
  pushToast: (type, msg) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, type, msg }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setLastNotifId: (id) => set({ lastNotifId: id }),
  setBuilding: (id) => set({ buildingId: id }),
}));
