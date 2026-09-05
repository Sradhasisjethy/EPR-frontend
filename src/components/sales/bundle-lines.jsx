import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Undo2, X, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { formatINR } from '@/lib/money';
import {
  useAvailableAccessories, useOverrideReasonCodes,
  useSuppressComponent, useRestoreComponent, useAddAccessory, useResetLine,
  useChangeLineQuantity,
} from '@/hooks/use-bundles';

/**
 * Order lines, grouped as bundles. See ERP-backend/docs/specs/bundle-kitting.md §8, Phase 5.
 *
 * The shape of this screen is the whole argument for the feature: a salesperson
 * has to be able to see at a glance that the printer brought three accessories,
 * that one was taken off, and to put it back without hunting for it. So
 * components are indented under their parent rather than listed flat, the
 * parent carries a summary chip, and removals go into a tray instead of
 * vanishing.
 *
 * Nothing here blocks. Auto-added accessories announce themselves in a toast
 * with an undo, because a modal on every line add would be unusable at the
 * pace an order is actually typed.
 */

const Chip = ({ children, tone = 'muted', title }) => {
  const tones = {
    muted: 'bg-muted text-muted-foreground',
    warn: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    info: 'bg-primary/10 text-primary border border-primary/20',
  };
  return (
    <span title={title} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${tones[tone]}`}>
      {children}
    </span>
  );
};

/** "3 of 4 accessories · 1 removed" — the state of the group in one glance. */
const BundleSummary = ({ present, offered, removed }) => {
  if (!offered) return null;
  return (
    <Chip tone="info" title="Accessories this product brings with it">
      {present} of {offered} accessories
      {removed > 0 && <span className="opacity-70">· {removed} removed</span>}
    </Chip>
  );
};

export function BundleLines({ order, editable, showRates }) {
  const [openTrays, setOpenTrays] = useState({});
  const [pickerFor, setPickerFor] = useState(null);

  const suppress = useSuppressComponent();
  const restore = useRestoreComponent();
  const addAccessory = useAddAccessory();
  const resetLine = useResetLine();
  const changeQty = useChangeLineQuantity();
  const { data: reasonCodes = [] } = useOverrideReasonCodes();

  /**
   * Lines arrive flat. Grouping happens here rather than on the server because
   * the server's job is to be correct about what is on the order; how it reads
   * is a screen concern.
   */
  const groups = useMemo(() => {
    const lines = order?.lines || [];
    const byParent = new Map();
    const roots = [];

    for (const line of lines) {
      if (line.lineRole === 'COMPONENT' && line.parentLineId) {
        if (!byParent.has(line.parentLineId)) byParent.set(line.parentLineId, []);
        byParent.get(line.parentLineId).push(line);
      } else {
        roots.push(line);
      }
    }

    return roots.map((parent) => ({
      parent,
      components: (byParent.get(parent.id) || []).sort((a, b) =>
        (a.product?.name || '').localeCompare(b.product?.name || '')
      ),
      offered: parent.bundleSnapshot?.components?.length || 0,
    }));
  }, [order]);

  const toggleTray = (id) => setOpenTrays((s) => ({ ...s, [id]: !s[id] }));

  const onRemove = async (parentLineId, line) => {
    // The first active reason is offered as the default so the common case is
    // one tap; the tray lets it be corrected afterwards.
    const reason = reasonCodes.find((r) => !r.requiresNote) || reasonCodes[0];
    if (!reason) {
      toast.error('No removal reasons are set up yet. Add them under bundle settings.');
      return;
    }

    try {
      await suppress.mutateAsync({
        orderId: order.id, lineId: line.id,
        reasonCode: reason.code,
        reasonNote: reason.requiresNote ? 'Removed from the order screen' : undefined,
      });

      toast(`${line.product?.name || 'Item'} removed`, {
        description: reason.label,
        action: {
          label: 'Undo',
          onClick: () =>
            restore.mutate({ orderId: order.id, parentLineId, componentProductId: line.productId }),
        },
      });
    } catch (error) {
      // A mandatory component is a refusal the salesperson can act on, not a
      // crash — the server sends a code precisely so this can be said plainly.
      const code = error?.response?.data?.code;
      toast.error(
        code === 'BUNDLE_MANDATORY_COMPONENT'
          ? 'That item is part of the product. Ask a manager to remove it.'
          : error?.response?.data?.message || 'Could not remove that item.'
      );
    }
  };

  /**
   * One handler for every node in the tree. The server decides what the change
   * means — a parent rescales its accessories, an accessory takes its own
   * number out of the system's hands — so the UI does not need to know which
   * kind of line it is holding.
   */
  const onQuantity = async (line, qty) => {
    try {
      await changeQty.mutateAsync({ orderId: order.id, lineId: line.id, qty });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not change that quantity.');
    }
  };

  const onReset = async (line) => {
    try {
      await resetLine.mutateAsync({ orderId: order.id, lineId: line.id });
      toast.success('Back to the suggested quantity');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not reset that line.');
    }
  };

  if (!groups.length) {
    return <p className="px-3 py-6 text-sm text-muted-foreground text-center">No lines on this order yet.</p>;
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="h-9 px-3 font-medium">Product</th>
              <th className="h-9 px-3 font-medium text-right">Ordered</th>
              <th className="h-9 px-3 font-medium text-right">Dispatched</th>
              <th className="h-9 px-3 font-medium text-right">Pending</th>
              <th className="h-9 px-3 font-medium text-right">To Produce</th>
              {showRates && <th className="h-9 px-3 font-medium text-right">Rate</th>}
              {showRates && <th className="h-9 px-3 font-medium text-right">Amount</th>}
              {editable && <th className="h-9 px-3 font-medium w-24" />}
            </tr>
          </thead>
          <tbody>
            {groups.map(({ parent, components, offered }) => (
              <BundleGroup
                key={parent.id}
                order={order}
                parent={parent}
                components={components}
                offered={offered}
                editable={editable}
                showRates={showRates}
                trayOpen={!!openTrays[parent.id]}
                onToggleTray={() => toggleTray(parent.id)}
                pickerOpen={pickerFor === parent.id}
                onTogglePicker={() => setPickerFor(pickerFor === parent.id ? null : parent.id)}
                onRemove={onRemove}
                onReset={onReset}
                onQuantity={onQuantity}
                restore={restore}
                addAccessory={addAccessory}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BundleGroup({
  order, parent, components, offered, editable, showRates,
  trayOpen, onToggleTray, pickerOpen, onTogglePicker, onRemove, onReset, onQuantity, restore, addAccessory,
}) {
  const { data: available = [] } = useAvailableAccessories(
    editable && offered ? order.id : undefined,
    editable && offered ? parent.id : undefined
  );

  const removed = available.filter((a) => a.isSuppressed);
  const addable = available.filter((a) => !a.isSuppressed);

  const cell = 'px-3 py-2 text-right tabular-nums';

  const numbers = (line) => {
    const pending = Number(line.orderedQty) - Number(line.dispatchedQty);
    // Only while the order is still a draft and nothing has shipped against
    // this line — a dispatched quantity is a fact about a lorry that has left.
    const adjustable = editable && Number(line.dispatchedQty) === 0;

    return (
      <>
        <td className={cell}>
          {adjustable ? (
            <QuantityStepper
              value={Number(line.orderedQty)}
              onCommit={(qty) => onQuantity(line, qty)}
              label={`${line.product?.name || 'line'} quantity`}
            />
          ) : (
            Number(line.orderedQty)
          )}
        </td>
        <td className={cell}>{Number(line.dispatchedQty)}</td>
        <td className={`${cell} font-medium`}>{pending}</td>
        <td className={cell}>{Number(line.productionRequired)}</td>
        {showRates && <td className={cell}>{formatINR(line.ratePaise)}</td>}
        {showRates && <td className={cell}>{formatINR(Number(line.ratePaise) * Number(line.orderedQty))}</td>}
      </>
    );
  };

  return (
    <>
      <tr className="border-t border-border/50">
        <td className="px-3 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{parent.product?.name || parent.productId}</span>
            <BundleSummary present={components.length} offered={offered} removed={removed.length} />
          </div>
        </td>
        {numbers(parent)}
        {editable && <td className="px-3 py-2" />}
      </tr>

      {components.map((line) => {
        const overridden = line.syncState === 'QTY_OVERRIDDEN';
        const suggested = line.systemQty === null ? null : Number(line.systemQty);

        return (
          <tr key={line.id} className="border-t border-border/30 bg-muted/20">
            {/* Indented, with a rule down the left, so the group reads as one
                thing rather than as unrelated rows that happen to be adjacent. */}
            <td className="px-3 py-2">
              <div className="flex items-center gap-2 flex-wrap pl-5 border-l-2 border-border ml-1">
                <span>{line.product?.name || line.productId}</span>
                {line.origin === 'RULE_OPTIONAL' && <Chip title="Added from the accessory picker">optional</Chip>}
                {line.syncState === 'DETACHED' && (
                  <Chip tone="warn" title="No longer part of the bundle, kept because it was quoted">
                    no longer in the bundle
                  </Chip>
                )}
                {line.syncState === 'PRICE_OVERRIDDEN' && <Chip tone="warn">price changed</Chip>}
                {overridden && suggested !== null && Number(line.orderedQty) !== suggested && (
                  <Chip tone="warn" title="You changed this quantity; the bundle suggests a different one">
                    changed from {suggested}
                  </Chip>
                )}
              </div>
            </td>
            {numbers(line)}
            {editable && (
              <td className="px-3 py-2">
                <div className="flex items-center gap-1 justify-end">
                  {overridden && suggested !== null && Number(line.orderedQty) !== suggested && (
                    <button
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                      onClick={() => onReset(line)}
                      title={`Reset to suggested (${suggested})`}
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                  <button
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(parent.id, line)}
                    title="Remove this accessory"
                  >
                    <X size={14} />
                  </button>
                </div>
              </td>
            )}
          </tr>
        );
      })}

      {editable && offered > 0 && (removed.length > 0 || addable.length > 0) && (
        <tr className="border-t border-border/30 bg-muted/10">
          <td colSpan={showRates ? 8 : 6} className="px-3 py-2">
            <div className="pl-6 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                {removed.length > 0 && (
                  <button
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={onToggleTray}
                  >
                    {trayOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    {removed.length} removed
                  </button>
                )}
                {addable.length > 0 && (
                  <button
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={onTogglePicker}
                  >
                    <Plus size={13} /> Add an accessory
                  </button>
                )}
              </div>

              {/* One tap to put something back — the whole point of keeping a
                  tombstone rather than just deleting the line. */}
              {trayOpen && removed.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {removed.map((item) => (
                    <Button
                      key={item.componentProductId}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        restore.mutate({
                          orderId: order.id,
                          parentLineId: parent.id,
                          componentProductId: item.componentProductId,
                        })
                      }
                    >
                      <Undo2 size={12} className="mr-1" />
                      {item.productName || 'Item'}
                    </Button>
                  ))}
                </div>
              )}

              {pickerOpen && addable.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {addable.map((item) => (
                    <Button
                      key={item.componentProductId}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        addAccessory.mutate(
                          { orderId: order.id, parentLineId: parent.id, productId: item.componentProductId },
                          { onSuccess: () => toast.success(`${item.productName || 'Accessory'} added`) }
                        );
                        onTogglePicker();
                      }}
                    >
                      <Plus size={12} className="mr-1" />
                      {item.productName || 'Item'}
                      <span className="ml-1 opacity-60">×{item.suggestedQty}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
