import { useEffect } from 'react';
import { useUIStore } from '@/store/ui-store';

export function UIProvider({ children }) {
  const { colorScheme, glassMode } = useUIStore();

  useEffect(() => {
    // Apply color scheme as a data attribute to the html tag
    document.documentElement.setAttribute('data-color-scheme', colorScheme);

    // Apply glass mode class to body
    if (glassMode) {
      document.body.classList.add('glass-mode-active');
    } else {
      document.body.classList.remove('glass-mode-active');
    }
  }, [colorScheme, glassMode]);

  return <>{children}</>;
}
