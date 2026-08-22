import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Command } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

const SEARCH_LINKS = [
  { name: 'Dashboard', path: '/' },
  { name: 'Employees', path: '/employees' },
  { name: 'Organization', path: '/organization' },
  { name: 'Offices', path: '/offices' },
  { name: 'Departments', path: '/departments' },
  { name: 'Roles', path: '/roles' },
  { name: 'Factories', path: '/factories' },
  { name: 'Products', path: '/products' },
  { name: 'Parties', path: '/parties' },
  { name: 'Price Lists', path: '/price-lists' },
  { name: 'Sales Orders', path: '/sales-orders' },
  { name: 'Production', path: '/production' },
  { name: 'Dispatch', path: '/dispatch' },
  { name: 'Inventory', path: '/inventory' },
  { name: 'Purchasing', path: '/purchasing' },
  { name: 'Transfers', path: '/transfers' },
  { name: 'Invoices', path: '/invoices' },
  { name: 'Returns', path: '/returns' },
  { name: 'Payments', path: '/payments' },
  { name: 'Workforce', path: '/workforce' },
  { name: 'Expenses', path: '/expenses' },
  { name: 'Ledger', path: '/ledger' },
  { name: 'GSTR', path: '/gstr' },
  { name: 'Analytics', path: '/analytics' },
  { name: 'Reports', path: '/reports' },
  { name: 'Settings', path: '/settings' },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

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

  const filteredLinks = SEARCH_LINKS.filter((link) =>
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
                    <Command className="mr-2 h-4 w-4 opacity-50" />
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
