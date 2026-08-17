import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { NAVIGATION } from '@/constants/navigation';
import { hasPermission } from '@/lib/permissions';
import { isNavHrefActive } from '@/lib/nav-match';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, glassMode } = useUIStore();
  const { pathname, search } = useLocation();
  const { data: user } = useCurrentUser();
  const { hasPermission } = usePermissions();
  const logoutMutation = useLogout();

  // Nested modules (Reports) highlight their category leaf while a specific
  // report is open, so the sidebar never goes blank mid-navigation.
  const isActiveHref = (href) => isNavHrefActive(href, pathname, search);

  // Hide what the user can't reach, then drop any group left with nothing in it.
  const navigation = useMemo(() => {
    const allowed = (item) => !item.permission || hasPermission(user, item.permission);
    return NAVIGATION.filter(allowed)
      .map((item) => (item.children ? { ...item, children: item.children.filter(allowed) } : item))
      .filter((item) => !item.children || item.children.length > 0);
  }, [user]);

  // One group open at a time — with a dozen modules an accordion stays readable
  // where a free-for-all turns back into the flat list this replaced.
  const activeGroup = navigation.find((item) => item.children?.some((child) => isActiveHref(child.href)))?.title;
  const [openGroup, setOpenGroup] = useState(activeGroup ?? null);

  useEffect(() => {
    if (activeGroup) setOpenGroup(activeGroup);
  }, [activeGroup]);

  const openGroupFromRail = (title) => {
    // Children have nowhere to render on the 80px rail, so reveal the sidebar first.
    setSidebarCollapsed(false);
    setOpenGroup(title);
  };

  const displayName = user?.name || 'User';
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const role = user?.role ? user.role.replace('_', ' ') : 'User';

  const toggleExpand = (title) => {
    setExpandedItems(prev =>
      prev.includes(title) ? prev.filter(i => i !== title) : [...prev, title]
    );
  };

  return (
    <aside className={cn(
      "fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out border-r border-border",
      glassMode ? "bg-background/80 backdrop-blur-xl" : "bg-card",
      sidebarCollapsed ? "w-[80px]" : "w-[280px]"
    )}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary via-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-base shadow-md shadow-primary/25">
              🏭
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold bg-gradient-to-r from-primary via-indigo-500 to-purple-500 bg-clip-text text-transparent tracking-tight">
                ERP Pro
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest -mt-1">
                Industrial 4.0
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 rounded-md hover:bg-muted transition-colors mx-auto"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      <div className="py-4 overflow-y-auto h-[calc(100vh-140px)]">
        <nav className="space-y-1 px-3">
          {NAVIGATION.map((item) => {
            const isActive = item.href ? pathname === item.href : pathname.startsWith(item.children?.[0].href?.split('/')[1] || '');
            const isExpanded = expandedItems.includes(item.title);

            return (
              <div key={item.title}>
                {item.href ? (
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group",
                      isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      sidebarCollapsed ? "justify-center" : ""
                    )}
                  >
                    <item.icon size={20} className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {!sidebarCollapsed && <span className="ml-3">{item.title}</span>}
                  </Link>
                ) : (
                  <div>
                    <button
                      onClick={() => toggleExpand(item.title)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group",
                        isActive ? "text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon size={20} className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                        {!sidebarCollapsed && <span className="ml-3">{item.title}</span>}
                      </div>
                      {!sidebarCollapsed && (
                        isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                      )}
                    </button>

                    {!sidebarCollapsed && isExpanded && item.children && (
                      <div className="ml-9 mt-1 space-y-1 border-l border-border pl-2">
                        {item.children.map((child) => (
                          <Link
                            key={child.title}
                            to={child.href}
                            className={cn(
                              "block px-3 py-2 text-sm rounded-md transition-colors",
                              pathname === child.href ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="absolute bottom-0 w-full p-4 border-t border-border bg-inherit">
        <div className={cn("flex items-center", sidebarCollapsed ? "justify-center" : "")}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center text-white font-bold shadow-sm">
            {initials}
          </div>
          {!sidebarCollapsed && (
            <div className="ml-3 flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{role}</p>
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={() => logoutMutation.mutate()}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
