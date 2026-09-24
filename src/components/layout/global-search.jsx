import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { NAVIGATION } from '@/constants/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

/**
 * Flattens the nav into searchable entries, carrying each one's gate with it.
 *
 * The gate has to travel with the entry: this list was built once at module
 * scope with no permission filter at all, so Cmd-K listed and navigated to every
 * module in the product regardless of grants — the one hole the sidebar's
 * filtering could not cover, since it reads the same NAVIGATION array.
 */
const SEARCH_LINKS = NAVIGATION.flatMap((item) => {
  if (item.children) {
    return item.children.map((child) => ({
      name: `${item.title} > ${child.title}`,
      path: child.href,
      permission: child.permission ?? item.permission,
      anyPermissions: child.anyPermissions ?? item.anyPermissions,
    }));
  }
  return [{
    name: item.title,
    path: item.href,
    permission: item.permission,
    anyPermissions: item.anyPermissions,
  }];
});

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { hasPermission, hasAnyPermission } = usePermissions();

  // Same rule the sidebar applies, so the two agree on what exists.
  const visibleLinks = useMemo(
    () =>
      SEARCH_LINKS.filter((link) => {
        if (link.anyPermissions) return hasAnyPermission(link.anyPermissions);
        if (link.permission) return hasPermission(link.permission);
        return true;
      }),
    [hasPermission, hasAnyPermission]
  );

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const filteredLinks = visibleLinks.filter((link) =>
    link.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground px-4 py-2 relative h-8 w-full justify-start rounded-[0.5rem] bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
      >
        <span className="hidden lg:inline-flex">Search modules...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 overflow-hidden shadow-2xl max-w-2xl">
          <div className="flex items-center border-b px-3 h-12">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus:ring-0"
              placeholder="Search modules..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            {filteredLinks.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredLinks.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => handleSelect(link.path)}
                    className="flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <span>{link.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
