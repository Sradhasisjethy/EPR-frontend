import { Sidebar } from './sidebar';
import { TopNav } from './top-nav';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';

export function AppShell({ children }) {
  const { sidebarCollapsed, glassMode, bgWallpaper } = useUIStore();
  const isWallpaperActive = glassMode && bgWallpaper && bgWallpaper !== 'none';

  return (
    <div className={cn(
      "flex h-screen overflow-hidden transition-colors",
      isWallpaperActive ? "bg-transparent" : "bg-background"
    )}>
      <Sidebar />
      <div className={cn(
        "flex flex-col flex-1 transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "ml-[80px]" : "ml-[280px]"
      )}>
        <TopNav />
        <main className={cn(
          "flex-1 overflow-y-auto p-6 transition-colors",
          isWallpaperActive ? "bg-transparent" : "bg-muted/20 dark:bg-background"
        )}>
          <div className="max-w-7xl mx-auto space-y-6 animate-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
