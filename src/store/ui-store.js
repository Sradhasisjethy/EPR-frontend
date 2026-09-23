import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create()(
  persist(
    (set) => ({
      sidebarOpen: false,
      sidebarCollapsed: false,
      colorScheme: 'sapphire',
      glassMode: true,
      bgWallpaper: 'cement',
      customWallpaperUrl: '',
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen, sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      // Drawer visibility below lg. `sidebarCollapsed` is the desktop rail's
      // rail-vs-labels state; these are different questions and were being
      // conflated by toggleSidebar, which flipped both at once.
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setColorScheme: (scheme) => set({ colorScheme: scheme }),
      toggleGlassMode: () => set((state) => ({ glassMode: !state.glassMode })),
      setBgWallpaper: (wallpaper) => set({ bgWallpaper: wallpaper, glassMode: wallpaper !== 'none' ? true : undefined }),
      setCustomWallpaperUrl: (url) => set({ customWallpaperUrl: url }),
    }),
    {
      name: 'erp-ui-storage',
    }
  )
);
