import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActionError } from '@/components/query-state';
import { NAVIGATION } from '@/constants/navigation';
import { useSettings, useUpsertSetting } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

const SETTING_KEY = 'navigation';
const UNHIDEABLE = new Set(['Dashboard']);

/**
 * Sidebar customisation for the whole tenant.
 *
 * This edits a display preference, not permissions. Hiding a module here does
 * not revoke access to it — the route still works and anyone with the grant can
 * reach it by URL or search. To actually take access away, change the role.
 * That distinction is stated on the page, because a menu editor that looks like
 * a security control is a dangerous thing to hand an administrator.
 */
export default function NavigationPage() {
  const settingsQuery = useSettings();
  const upsertSetting = useUpsertSetting();
  const queryClient = useQueryClient();

  const [hidden, setHidden] = useState([]);
  const [orderedTitles, setOrderedTitles] = useState([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const defaultTitles = useMemo(() => NAVIGATION.map((item) => item.title), []);

  // Seed from the stored preference once it arrives; fall back to the built-in
  // order so the screen is usable before anyone has customised anything.
  useEffect(() => {
    const rows = settingsQuery.data?.rows || settingsQuery.data || [];
    const stored = Array.isArray(rows) ? rows.find((r) => r.key === SETTING_KEY) : null;
    const prefs = stored?.value || null;

    setHidden(Array.isArray(prefs?.hidden) ? prefs.hidden : []);

    const order = prefs?.order || {};
    const sorted = [...defaultTitles].sort((a, b) => {
      const av = Object.prototype.hasOwnProperty.call(order, a) ? Number(order[a]) : 1000 + defaultTitles.indexOf(a);
      const bv = Object.prototype.hasOwnProperty.call(order, b) ? Number(order[b]) : 1000 + defaultTitles.indexOf(b);
      return av - bv;
    });
    setOrderedTitles(sorted);
  }, [settingsQuery.data, defaultTitles]);

  const groupByTitle = useMemo(
    () => Object.fromEntries(NAVIGATION.map((item) => [item.title, item])),
    []
  );

  const toggleHidden = (title) => {
    if (UNHIDEABLE.has(title)) return;
    setSaved(false);
    setHidden((prev) => (prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]));
  };

  const move = (title, delta) => {
    setSaved(false);
    setOrderedTitles((prev) => {
      const index = prev.indexOf(title);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const resetAll = () => {
    setSaved(false);
    setHidden([]);
    setOrderedTitles(defaultTitles);
  };

  const save = () => {
    setError('');
    const order = Object.fromEntries(orderedTitles.map((title, i) => [title, i]));

    upsertSetting.mutate(
      { key: SETTING_KEY, value: { hidden, order }, category: 'ui' },
      {
        onSuccess: () => {
          setSaved(true);
          // The sidebar reads this off the session, so the session is what has
          // to be refetched for the change to show without a reload.
          queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not save the menu.'),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          
          <p className="text-sm text-muted-foreground max-w-2xl">
            Choose which modules appear in the sidebar and in what order. This applies to everyone in
            the organisation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetAll}>
            <RotateCcw size={15} className="mr-2" /> Reset
          </Button>
          <Button onClick={save} disabled={upsertSetting.isPending}>
            {upsertSetting.isPending ? 'Saving…' : 'Save menu'}
          </Button>
        </div>
      </div>

      <div className="p-3 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground max-w-3xl">
        Hiding a module only removes it from the menu. It does not take access away — anyone with the
        permission can still reach it by link or search. To remove access, change the role instead.
      </div>

      <ActionError message={error} onDismiss={() => setError('')} />

      {saved && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm">
          Menu saved. The sidebar updates for everyone the next time they load the app.
        </div>
      )}

      <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
        {orderedTitles.map((title, index) => {
          const group = groupByTitle[title];
          if (!group) return null;
          const isHidden = hidden.includes(title);
          const locked = UNHIDEABLE.has(title);

          return (
            <div key={title} className={cn('p-4 bg-card', isHidden && 'opacity-55')}>
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <button
                    className="p-0.5 rounded hover:bg-muted disabled:opacity-25"
                    onClick={() => move(title, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${title} up`}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    className="p-0.5 rounded hover:bg-muted disabled:opacity-25"
                    onClick={() => move(title, 1)}
                    disabled={index === orderedTitles.length - 1}
                    aria-label={`Move ${title} down`}
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{title}</p>
                  {group.children && (
                    <p className="text-xs text-muted-foreground truncate">
                      {group.children.map((c) => c.title).join(' · ')}
                    </p>
                  )}
                </div>

                <button
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors',
                    locked
                      ? 'border-transparent text-muted-foreground cursor-not-allowed'
                      : isHidden
                        ? 'border-border text-muted-foreground hover:bg-muted'
                        : 'border-border hover:bg-muted'
                  )}
                  onClick={() => toggleHidden(title)}
                  disabled={locked}
                  title={locked ? 'The dashboard cannot be hidden' : isHidden ? 'Show in sidebar' : 'Hide from sidebar'}
                >
                  {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  {locked ? 'Always shown' : isHidden ? 'Hidden' : 'Visible'}
                </button>
              </div>

              {group.children && !isHidden && (
                <div className="mt-3 ml-8 flex flex-wrap gap-1.5">
                  {group.children.map((child) => {
                    const childHidden = hidden.includes(child.title);
                    return (
                      <button
                        key={child.title}
                        onClick={() => toggleHidden(child.title)}
                        className={cn(
                          'text-xs px-2 py-1 rounded-md border transition-colors',
                          childHidden
                            ? 'border-dashed border-border text-muted-foreground line-through'
                            : 'border-border hover:bg-muted'
                        )}
                        title={childHidden ? 'Show this item' : 'Hide this item'}
                      >
                        {child.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
