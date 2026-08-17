import { useMemo, useState } from 'react';
import { ChevronDown, Lock, Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const ACTION_LABELS = { READ: 'Read', CREATE: 'Create', MODIFY: 'Modify', DELETE: 'Delete' };
const ACTION_ORDER = ['READ', 'CREATE', 'MODIFY', 'DELETE'];

const resourceCodes = (resource) => [
  ...resource.actions.map((action) => `${resource.key}_${action}`),
  ...(resource.grants || []).map((grant) => grant.code),
];

/** checked | indeterminate | false, from how many of `codes` are selected. */
const tristate = (codes, selected) => {
  if (codes.length === 0) return false;
  const hits = codes.filter((code) => selected.has(code)).length;
  if (hits === 0) return false;
  return hits === codes.length ? true : 'indeterminate';
};

const matches = (text, needle) => text.toLowerCase().includes(needle);

/**
 * The permission editor: modules collapse, each resource exposes Read / Create /
 * Modify / Delete plus any named grants that don't come with ordinary write
 * access (approve, override, view rates).
 *
 * Codes a user isn't allowed to hand out arrive as not-`grantable` and render
 * locked — the same rule the API enforces on save, surfaced before the save.
 */
export function PermissionMatrix({ modules = [], grantable, value = [], onChange, disabled = false }) {
  const [openModules, setOpenModules] = useState(() => modules.slice(0, 1).map((m) => m.module));
  const [filter, setFilter] = useState('');

  const selected = useMemo(() => new Set(value), [value]);
  // `undefined` means the caller isn't scoping grants (nothing gets locked).
  const grantableSet = useMemo(() => (grantable ? new Set(grantable) : null), [grantable]);
  const canGrant = (code) => !grantableSet || grantableSet.has(code);

  const needle = filter.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!needle) return modules;
    return modules
      .map((module) => ({
        ...module,
        resources: matches(module.module, needle)
          ? module.resources
          : module.resources.filter(
              (resource) =>
                matches(resource.label, needle) ||
                matches(resource.key, needle) ||
                (resource.grants || []).some((grant) => matches(grant.label, needle))
            ),
      }))
      .filter((module) => module.resources.length > 0);
  }, [modules, needle]);

  // While filtering, show what matched rather than making the user re-open groups.
  const isOpen = (module) => (needle ? true : openModules.includes(module.module));

  const setCodes = (codes, checked) => {
    const grantableCodes = codes.filter(canGrant);
    const next = new Set(selected);
    grantableCodes.forEach((code) => (checked ? next.add(code) : next.delete(code)));
    onChange([...next]);
  };

  const toggleModule = (module) =>
    setOpenModules((prev) =>
      prev.includes(module.module) ? prev.filter((m) => m !== module.module) : [...prev, module.module]
    );

  if (modules.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter permissions…"
          className="pl-9"
          aria-label="Filter permissions"
        />
      </div>

      {visible.length === 0 && (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">No permission matches “{filter}”.</p>
      )}

      {visible.map((module) => {
        const codes = module.resources.flatMap(resourceCodes);
        const grantableCodes = codes.filter(canGrant);
        const state = tristate(codes, selected);
        const open = isOpen(module);

        return (
          <div key={module.module} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <Checkbox
                checked={state}
                disabled={disabled || grantableCodes.length === 0}
                onCheckedChange={(checked) => setCodes(codes, checked === true)}
                aria-label={`All ${module.module} permissions`}
              />
              <button
                type="button"
                onClick={() => toggleModule(module)}
                className="flex flex-1 items-center justify-between text-left min-w-0"
                aria-expanded={open}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{module.module}</span>
                  {module.description && (
                    <span className="block text-xs text-muted-foreground truncate">{module.description}</span>
                  )}
                </span>
                <span className="ml-3 flex shrink-0 items-center gap-3">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {codes.filter((code) => selected.has(code)).length}/{codes.length}
                  </span>
                  <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
                </span>
              </button>
            </div>

            {open && (
              <div className="space-y-2 border-t border-border bg-muted/20 p-3">
                {module.resources.map((resource) => {
                  const codesForResource = resourceCodes(resource);
                  return (
                    <div key={resource.key} className="rounded-md border border-border bg-background p-3">
                      <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                        <Checkbox
                          checked={tristate(codesForResource, selected)}
                          disabled={disabled || codesForResource.filter(canGrant).length === 0}
                          onCheckedChange={(checked) => setCodes(codesForResource, checked === true)}
                        />
                        {resource.label}
                      </label>

                      {resource.actions.length > 0 && (
                        <div className="mt-3 grid gap-2 pl-6 sm:grid-cols-2 lg:grid-cols-4">
                          {ACTION_ORDER.map((action) => {
                            const code = `${resource.key}_${action}`;
                            // Read-only resources keep the column, empty, so the
                            // four actions stay aligned down the whole page.
                            if (!resource.actions.includes(action)) return <div key={action} aria-hidden />;
                            const locked = !canGrant(code);
                            return (
                              <label
                                key={action}
                                title={locked ? 'You cannot grant a permission you do not hold' : code}
                                className={cn(
                                  'flex items-center gap-2 text-sm',
                                  locked || disabled ? 'cursor-not-allowed text-muted-foreground/60' : 'cursor-pointer'
                                )}
                              >
                                <Checkbox
                                  checked={selected.has(code)}
                                  disabled={disabled || locked}
                                  onCheckedChange={(checked) => setCodes([code], checked === true)}
                                />
                                {ACTION_LABELS[action]}
                                {locked && <Lock size={12} className="shrink-0" />}
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {(resource.grants || []).length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-dashed border-border pl-6 pt-3">
                          {resource.grants.map((grant) => {
                            const locked = !canGrant(grant.code);
                            return (
                              <label
                                key={grant.code}
                                className={cn(
                                  'flex items-start gap-2 text-sm',
                                  locked || disabled ? 'cursor-not-allowed text-muted-foreground/60' : 'cursor-pointer'
                                )}
                              >
                                <Checkbox
                                  className="mt-0.5"
                                  checked={selected.has(grant.code)}
                                  disabled={disabled || locked}
                                  onCheckedChange={(checked) => setCodes([grant.code], checked === true)}
                                />
                                <span className="min-w-0">
                                  <span className="flex items-center gap-1.5">
                                    {grant.label}
                                    {locked && <Lock size={12} className="shrink-0" />}
                                  </span>
                                  {grant.description && (
                                    <span className="block text-xs text-muted-foreground">{grant.description}</span>
                                  )}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
