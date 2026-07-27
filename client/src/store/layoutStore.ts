import { create } from 'zustand';
import type { CustomItem, FurnitureInstance } from '../types';

export const CUSTOM_TYPE_PREFIX = 'custom:';

interface LayoutState {
  furniture: FurnitureInstance[];
  customItems: CustomItem[];
  selectedId: string | null;
  draggingId: string | null;
  dirty: boolean;
  load: (furniture: FurnitureInstance[], customItems: CustomItem[]) => void;
  addItem: (type: string) => void;
  setPosition: (id: string, x: number, z: number) => void;
  updateItem: (id: string, patch: Partial<FurnitureInstance>) => void;
  rotateItem: (id: string, deltaRad: number) => void;
  removeItem: (id: string) => void;
  toggleLock: (id: string) => void;
  select: (id: string | null) => void;
  setDragging: (id: string | null) => void;
  markSaved: () => void;
  addCustomItem: (item: Omit<CustomItem, 'id'>) => CustomItem;
  removeCustomItem: (id: string) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  furniture: [],
  customItems: [],
  selectedId: null,
  draggingId: null,
  dirty: false,

  load: (furniture, customItems) => set({ furniture, customItems, dirty: false, selectedId: null }),

  addItem: (type) =>
    set((state) => {
      const newItem = { id: crypto.randomUUID(), type, x: 0, z: 0, rotationY: 0 };
      return {
        furniture: [...state.furniture, newItem],
        selectedId: newItem.id,
        dirty: true,
      };
    }),

  setPosition: (id, x, z) =>
    set((state) => ({
      furniture: state.furniture.map((f) => (f.id === id && !f.locked ? { ...f, x, z } : f)),
      dirty: true,
    })),

  updateItem: (id, patch) =>
    set((state) => ({
      furniture: state.furniture.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      dirty: true,
    })),

  rotateItem: (id, deltaRad) =>
    set((state) => ({
      furniture: state.furniture.map((f) =>
        f.id === id && !f.locked ? { ...f, rotationY: f.rotationY + deltaRad } : f
      ),
      dirty: true,
    })),

  removeItem: (id) =>
    set((state) => {
      const target = state.furniture.find((f) => f.id === id);
      if (target?.locked) return state;
      return {
        furniture: state.furniture.filter((f) => f.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
        dirty: true,
      };
    }),

  toggleLock: (id) =>
    set((state) => ({
      furniture: state.furniture.map((f) => (f.id === id ? { ...f, locked: !f.locked } : f)),
      dirty: true,
    })),

  select: (id) => set({ selectedId: id }),
  setDragging: (id) => set({ draggingId: id }),
  markSaved: () => set({ dirty: false }),

  addCustomItem: (item) => {
    const newItem: CustomItem = { ...item, id: crypto.randomUUID() };
    set((state) => ({ customItems: [...state.customItems, newItem], dirty: true }));
    return newItem;
  },

  removeCustomItem: (id) => {
    const type = `${CUSTOM_TYPE_PREFIX}${id}`;
    set((state) => ({
      customItems: state.customItems.filter((c) => c.id !== id),
      furniture: state.furniture.filter((f) => f.type !== type),
      dirty: true,
    }));
  },
}));
