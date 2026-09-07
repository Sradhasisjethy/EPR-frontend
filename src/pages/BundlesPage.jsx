import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Send, Copy, Archive, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { BundleRuleFormDialog } from '@/components/bundles/bundle-rule-form-dialog';
import {
  useBundleRules, usePublishBundleRule, useNewBundleRuleVersion, useArchiveBundleRule,
  useOverrideReasonCodes, useCreateReasonCode, useDeactivateReasonCode,
} from '@/hooks/use-bundles';

/**
 * Bundles: what a product brings with it when it is sold.
 *
 * The lifecycle is the point of this screen. A published rule is what open
 * orders were quoted from, so it cannot be edited — the way to change it is a
 * new version, published from a date, which leaves every existing order
 * pointing at exactly the rule it was sold under.
 */

const STATUS_TONE = {
  DRAFT: 'bg-muted text-muted-foreground',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  SUPERSEDED: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  ARCHIVED: 'bg-muted text-muted-foreground line-through',
};

const StatusPill = ({ status }) => (
  <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded uppercase ${STATUS_TONE[status] || STATUS_TONE.DRAFT}`}>
    {status}
  </span>
);

export default function BundlesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [archiving, setArchiving] = useState(null);
  const [newReason, setNewReason] = useState({ code: '', label: '' });

  const { data, isLoading, isError } = useBundleRules({ page: 1, limit: 100 });
  const publish = usePublishBundleRule();
  const newVersion = useNewBundleRuleVersion();
  const archive = useArchiveBundleRule();

  const { data: reasons = [] } = useOverrideReasonCodes();
  const createReason = useCreateReasonCode();
  const deactivateReason = useDeactivateReasonCode();

  const rules = data?.rows || [];

  const act = (promise, message) =>
    promise
      .then(() => toast.success(message))
      .catch((e) => toast.error(e.response?.data?.message || 'That did not work.'));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground max-w-2xl">
          What goes out with a product as a matter of course — gaskets with an RCC pipe, a frame with
          a manhole cover. A published bundle cannot be edited, because orders have been quoted from
          it, so change one by publishing a new version from a date.
        </p>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus size={16} className="mr-2" /> New Bundle
        </Button>
      </div>

      {isLoading ? (
        <div className="w-full h-64 rounded-xl border border-border bg-card animate-pulse" />
      ) : isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load bundles.</div>
      ) : rules.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-border bg-card/40">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <PackagePlus className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold">No bundles yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            A bundle is what goes out with a product as a matter of course — gaskets and jointing
            mortar with an RCC pipe, a frame with a manhole cover, lifting hooks with a slab. Define
            one and every order carries them automatically: priced, taxed, and removable line by line
            with the reason recorded.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="h-9 px-3 font-medium">Bundle</th>
                  <th className="h-9 px-3 font-medium">Product</th>
                  <th className="h-9 px-3 font-medium text-center">Version</th>
                  <th className="h-9 px-3 font-medium text-center">Accessories</th>
                  <th className="h-9 px-3 font-medium">In force</th>
                  <th className="h-9 px-3 font-medium">Status</th>
                  <th className="h-9 px-3 font-medium w-32" />
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-t border-border/50">
                    <td className="px-3 py-2">
                      <span className="font-medium block">{rule.name}</span>
                      <span className="text-[11px] font-mono text-muted-foreground">{rule.code}</span>
                    </td>
                    <td className="px-3 py-2">{rule.parentProduct?.name || '—'}</td>
                    <td className="px-3 py-2 text-center tabular-nums">v{rule.version}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{rule.components?.length ?? 0}</td>
                    <td className="px-3 py-2 text-xs">
                      {rule.effectiveFrom}
                      {rule.effectiveTo && <span className="text-muted-foreground"> → {rule.effectiveTo}</span>}
                    </td>
                    <td className="px-3 py-2"><StatusPill status={rule.status} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        {rule.status === 'DRAFT' && (
                          <>
                            <button
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                              onClick={() => { setEditing(rule); setDialogOpen(true); }}
                              title="Edit this draft"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary"
                              onClick={() => act(publish.mutateAsync({ id: rule.id }), 'Published. Orders already raised keep the version they were quoted from.')}
                              title="Publish — makes it live for new orders"
                            >
                              <Send size={15} />
                            </button>
                          </>
                        )}
                        {/* Available from ANY published state, including
                            ARCHIVED. The code is the bundle's identity for
                            life, so `create` refuses to reuse one — and if a
                            new version could only start from the ACTIVE rule,
                            archiving a bundle would strand its code with no way
                            back. */}
                        {rule.status !== 'DRAFT' && (
                          <button
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={() => act(newVersion.mutateAsync(rule.id), 'Draft version created — edit it, then publish from a date.')}
                            title={rule.status === 'ARCHIVED' ? 'Bring this bundle back as a new version' : 'Start a new version'}
                          >
                            <Copy size={15} />
                          </button>
                        )}
                        {rule.status !== 'ARCHIVED' && (
                          <button
                            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            onClick={() => setArchiving(rule)}
                            title="Archive"
                          >
                            <Archive size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Removal reasons. Without at least one of these the remove button on an
          order cannot work — the API requires a reason, deliberately, because a
          free-text box produces "not needed" ten thousand times and answers
          nothing. */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">Removal reasons</h3>
          <p className="text-sm text-muted-foreground">
            Why a salesperson took an accessory off an order. These are what make the attach-rate
            report worth reading, so keep the list short and meaningfully different.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {reasons.map((r) => (
            <span key={r.code} className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-md border border-border bg-card">
              {r.label}
              {r.requiresNote && <span className="text-[10px] text-muted-foreground">needs a note</span>}
              <button
                className="text-muted-foreground hover:text-destructive"
                onClick={() => act(deactivateReason.mutateAsync(r.code), `"${r.label}" deactivated`)}
                title="Deactivate — past orders keep their reason"
              >
                ×
              </button>
            </span>
          ))}
          {reasons.length === 0 && (
            <span className="text-sm text-muted-foreground">
              None yet — run <code className="font-mono">npm run bundles:ensure-reasons</code>, or add one below.
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Code</label>
            <Input
              className="w-40"
              placeholder="SITE_HAS_STOCK"
              value={newReason.code}
              onChange={(e) => setNewReason({ ...newReason, code: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">What it says</label>
            <Input
              className="w-64"
              placeholder="Site already has stock"
              value={newReason.label}
              onChange={(e) => setNewReason({ ...newReason, label: e.target.value })}
            />
          </div>
          <Button
            variant="outline"
            disabled={!newReason.code || !newReason.label}
            onClick={() =>
              act(
                createReason.mutateAsync(newReason).then(() => setNewReason({ code: '', label: '' })),
                'Reason added'
              )
            }
          >
            Add
          </Button>
        </div>
      </div>

      <BundleRuleFormDialog open={dialogOpen} onOpenChange={setDialogOpen} rule={editing} />

      <ConfirmDialog
        open={Boolean(archiving)}
        onOpenChange={(v) => !v && setArchiving(null)}
        title={`Archive ${archiving?.name || 'this bundle'}?`}
        description="It stops applying to new orders. Orders already raised keep the accessories they were quoted, and nothing is deleted."
        confirmText="Archive"
        variant="destructive"
        onConfirm={() => {
          act(archive.mutateAsync(archiving.id), 'Bundle archived');
          setArchiving(null);
        }}
      />
    </div>
  );
}
