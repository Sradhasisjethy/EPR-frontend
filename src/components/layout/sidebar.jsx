import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';
import { NAVIGATION } from '@/constants/navigation';
import { hasPermission } from '@/lib/permissions';
import { isNavHrefActive } from '@/lib/nav-match';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, glassMode } = useUIStore();
  const { pathname, search } = useLocation();
  const { data: user } = useCurrentUser();
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
  const role = user?.role || 'User';

  const rowBase = 'flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group';
  const rowIdle = 'text-muted-foreground hover:bg-muted hover:text-foreground';

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out border-r border-border',
        glassMode ? 'bg-background/80 backdrop-blur-xl' : 'bg-card',
        sidebarCollapsed ? 'w-[80px]' : 'w-[280px]'
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!sidebarCollapsed && (
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
            ERP Pro
          </span>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 rounded-md hover:bg-muted transition-colors mx-auto"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      <div className="py-4 overflow-y-auto h-[calc(100vh-140px)]">
        <nav className="space-y-1 px-3">
          {navigation.map((item) => {
            if (!item.children) {
              const isActive = isActiveHref(item.href);
              return (
                <Link
                  key={item.title}
                  to={item.href}
                  title={sidebarCollapsed ? item.title : undefined}
                  className={cn(
                    rowBase,
                    isActive ? 'bg-primary/10 text-primary font-medium' : rowIdle,
                    sidebarCollapsed && 'justify-center'
                  )}
                >
                  <item.icon
                    size={20}
                    className={cn('shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')}
                  />
                  {!sidebarCollapsed && <span className="ml-3">{item.title}</span>}
                </Link>
              );
            }

            const isGroupActive = item.title === activeGroup;
            const isExpanded = !sidebarCollapsed && openGroup === item.title;

            return (
              <div key={item.title}>
                <button
                  onClick={() =>
                    sidebarCollapsed
                      ? openGroupFromRail(item.title)
                      : setOpenGroup((prev) => (prev === item.title ? null : item.title))
                  }
                  title={sidebarCollapsed ? item.title : undefined}
                  aria-expanded={isExpanded}
                  className={cn(
                    rowBase,
                    'w-full justify-between',
                    isGroupActive ? 'text-primary font-medium' : rowIdle,
                    sidebarCollapsed && 'justify-center'
                  )}
                >
                  <span className="flex items-center min-w-0">
                    <item.icon
                      size={20}
                      className={cn('shrink-0', isGroupActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')}
                    />
                    {!sidebarCollapsed && <span className="ml-3 truncate">{item.title}</span>}
                  </span>
                  {!sidebarCollapsed && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                </button>

                {isExpanded && (
                  <div className="ml-9 mt-1 space-y-1 border-l border-border pl-2">
                    {item.children.map((child) =>
                      child.soon ? (
                        <div
                          key={child.title}
                          title="Not built yet"
                          className="flex items-center justify-between px-3 py-2 text-sm rounded-md text-muted-foreground/50 cursor-not-allowed"
                        >
                          <span className="truncate">{child.title}</span>
                          <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                            Soon
                          </span>
                        </div>
                      ) : (
                        <Link
                          key={child.title}
                          to={child.href}
                          className={cn(
                            'block px-3 py-2 text-sm rounded-md transition-colors truncate',
                            isActiveHref(child.href)
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          {child.title}
                        </Link>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="absolute bottom-0 w-full p-4 border-t border-border bg-inherit">
        <div className={cn('flex items-center', sidebarCollapsed && 'justify-center')}>
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
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
