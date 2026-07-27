import { create } from 'zustand';
import type { FurnitureInstance } from '../types';

interface LayoutState {
  furniture: FurnitureInstance[];
  selectedId: string | null;
  draggingId: string | null;
  dirty: boolean;
  load: (furniture: FurnitureInstance[]) => void;
  addItem: (type: string) => void;
  setPosition: (id: string, x: number, z: number) => void;
  rotateItem: (id: string, deltaRad: number) => void;
  removeItem: (id: string) => void;
  select: (id: string | null) => void;
  setDragging: (id: string | null) => void;
  markSaved: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  furniture: [],
  selectedId: null,
  draggingId: null,
  dirty: false,

  load: (furniture) => set({ furniture, dirty: false, selectedId: null }),

  addItem: (type) =>
    set((state) => ({
      furniture: [
        ...state.furniture,
        { id: crypto.randomUUID(), type, x: 0, z: 0, rotationY: 0 },
      ],
      dirty: true,
    })),

  setPosition: (id, x, z) =>
    set((state) => ({
      furniture: state.furniture.map((f) => (f.id === id ? { ...f, x, z } : f)),
      dirty: true,
    })),

  rotateItem: (id, deltaRad) =>
    set((state) => ({
      furniture: state.furniture.map((f) =>
        f.id === id ? { ...f, rotationY: f.rotationY + deltaRad } : f
      ),
      dirty: true,
    })),

  removeItem: (id) =>
    set((state) => ({
      furniture: state.furniture.filter((f) => f.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      dirty: true,
    })),

  select: (id) => set({ selectedId: id }),
  setDragging: (id) => set({ draggingId: id }),
  markSaved: () => set({ dirty: false }),
}));
