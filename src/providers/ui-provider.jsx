import { useEffect } from 'react';
import { useUIStore } from '@/store/ui-store';
import { useLiquidGlass } from '@/hooks/use-liquid-glass';
import { LiquidGlassFilters } from '@/components/layout/liquid-glass-filters';

export const WALLPAPERS = {
  cement: '/cement-factory-bg.png',
  aurora: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop',
  nebula: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1920&auto=format&fit=crop',
  cyberpunk: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1920&auto=format&fit=crop',
  sunset: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1920&auto=format&fit=crop',
  mesh: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1920&auto=format&fit=crop',
};

export function UIProvider({ children }) {
  const { colorScheme, glassMode, bgWallpaper, customWallpaperUrl } = useUIStore();

  // Pointer-tracked sheen and the Chromium refraction flag. Only while glass
  // is on: the flat theme has no surface for either to act on.
  useLiquidGlass(glassMode);

  useEffect(() => {
    // Apply color scheme as a data attribute to the html tag
    document.documentElement.setAttribute('data-color-scheme', colorScheme);

    // Apply glass mode class to body
    if (glassMode) {
      document.body.classList.add('glass-mode-active');
    } else {
      document.body.classList.remove('glass-mode-active');
    }

    // Apply background wallpaper
    let bgUrl = '';
    if (bgWallpaper === 'custom' && customWallpaperUrl) {
      bgUrl = customWallpaperUrl;
    } else if (bgWallpaper && bgWallpaper !== 'none' && WALLPAPERS[bgWallpaper]) {
      bgUrl = WALLPAPERS[bgWallpaper];
    }

    if (bgUrl && glassMode) {
      document.body.style.backgroundImage = `url("${bgUrl}")`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundColor = 'transparent';
      document.body.classList.add('wallpaper-active');
      document.documentElement.classList.add('wallpaper-active');
    } else {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundColor = '';
      document.body.classList.remove('wallpaper-active');
      document.documentElement.classList.remove('wallpaper-active');
    }
  }, [colorScheme, glassMode, bgWallpaper, customWallpaperUrl]);

  return (
    <>
      {/* The SVG <filter> the rail and top bar refract through. Mounted only in
          glass mode so the flat theme carries no extra node. */}
      {glassMode && <LiquidGlassFilters />}
      {children}
    </>
  );
}
