import { create } from 'zustand';

export interface ScanBounds {
  sizeX: number;
  sizeY: number;
  sizeZ: number;
}

interface BoundsState {
  bounds: ScanBounds | null;
  setBounds: (bounds: ScanBounds) => void;
  clear: () => void;
}

export const useBoundsStore = create<BoundsState>((set) => ({
  bounds: null,
  setBounds: (bounds) => set({ bounds }),
  clear: () => set({ bounds: null }),
}));
