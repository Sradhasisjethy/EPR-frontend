import { useMoneyAccounts } from '@/hooks/use-ledger';
import { cn } from '@/lib/utils';

/**
 * "Which of our accounts did this money go into / come out of?"
 *
 * Renders nothing until the business has added a cash or bank account of its
 * own: with only the system Cash-in-Hand and Bank Account there is no choice
 * to make, and every form looks exactly as it did before accounts could be
 * named. The empty value means the system account, which is what the API
 * defaults to when no accountId is sent.
 *
 * `mode` is the payment mode (CASH, UPI, BANK, CHEQUE). Cash goes to cash
 * accounts; everything else to bank accounts — the same rule the API enforces.
 */
export function MoneyAccountSelect({ mode, value, onChange, id, className, 'aria-label': ariaLabel }) {
  const { data: accounts = [] } = useMoneyAccounts();
  const kind = mode === 'CASH' ? 'CASH' : 'BANK';
  const named = accounts.filter((a) => a.subType === kind && !a.isSystem);
  if (!named.length) return null;

  const system = accounts.find((a) => a.subType === kind && a.isSystem);
  const systemLabel = system?.name || (kind === 'CASH' ? 'Cash-in-Hand' : 'Bank Account');

  return (
    <select
      id={id}
      aria-label={ariaLabel || (kind === 'CASH' ? 'Cash account' : 'Bank account')}
      value={value || ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className={cn('h-9 px-2 rounded-md border border-input bg-background text-sm', className)}
    >
      <option value="">{systemLabel}</option>
      {named.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select>
  );
}

/** True once there is a named account of this mode's kind — for laying out the row. */
export function useHasNamedMoneyAccount(mode) {
  const { data: accounts = [] } = useMoneyAccounts();
  const kind = mode === 'CASH' ? 'CASH' : 'BANK';
  return accounts.some((a) => a.subType === kind && !a.isSystem);
}
