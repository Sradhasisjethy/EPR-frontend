import { Sidebar } from './sidebar';
import { TopNav } from './top-nav';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';

export function AppShell({ children }) {
  const { sidebarCollapsed, sidebarOpen, setSidebarOpen, glassMode, bgWallpaper } = useUIStore();
  const isWallpaperActive = glassMode && bgWallpaper && bgWallpaper !== 'none';

  return (
    <div className={cn(
      "flex h-screen overflow-hidden transition-colors print:h-auto print:overflow-visible print:bg-white",
      isWallpaperActive ? "bg-transparent" : "bg-background"
    )}>
      {/* Tapping away closes the drawer — the expected gesture, and the only
          dismissal on a phone with no visible edge to click past. */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden print:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      <div className="print:hidden">
        <Sidebar />
      </div>
      {/* The rail is a drawer below lg and a fixed column above it, so the
          content is only offset on screens wide enough to spare the space. At
          375px the old fixed 260px margin left 115px of usable width. */}
      <div className={cn(
        "flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out print:ml-0 print:block print:w-full",
        sidebarCollapsed ? "lg:ml-[88px]" : "lg:ml-[260px]"
      )}>
        <div className="print:hidden relative z-40">
          <TopNav />
        </div>
        <main className={cn(
          "flex-1 overflow-y-auto px-4 sm:px-6 pb-6 pt-2 transition-colors print:p-0 print:overflow-visible print:block print:bg-white relative z-10",
          isWallpaperActive ? "bg-transparent" : "bg-muted/20 dark:bg-background"
        )}>
          <div className="max-w-7xl mx-auto space-y-6 animate-in print:max-w-none print:m-0 print:p-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
