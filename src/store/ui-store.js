import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create()(
  persist(
    (set) => ({
      sidebarOpen: false,
      sidebarCollapsed: false,
      colorScheme: 'sapphire',
      glassMode: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen, sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setColorScheme: (scheme) => set({ colorScheme: scheme }),
      toggleGlassMode: () => set((state) => ({ glassMode: !state.glassMode })),
    }),
    {
      name: 'erp-ui-storage',
    }
  )
);
