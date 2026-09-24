import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { SearchableSelect } from './searchable-select';

/**
 * The bug this exists to kill: a `<select>` fed one page of 100 rows, on a
 * tenant with 400 customers. Three quarters of them could not be chosen and
 * nothing on screen said so.
 */

const CUSTOMERS = [
  { id: 'c1', name: 'Delta Associates', code: 'CUST-0011' },
  { id: 'c2', name: 'Everest Solutions', code: 'CUST-0166' },
  { id: 'c3', name: 'Zenith Works', code: 'CUST-0402' },
];

let lastParams;
const useOptions = vi.fn((params, options) => {
  lastParams = params;
  const term = String(params.search || '').toLowerCase();
  const rows = term ? CUSTOMERS.filter((c) => c.name.toLowerCase().includes(term)) : CUSTOMERS;
  return { data: options?.enabled === false ? undefined : { rows, count: term ? rows.length : 412 }, isFetching: false };
});

const setup = (props = {}) => {
  const onChange = vi.fn();
  renderWithQuery(
    <SearchableSelect
      id="customer"
      value=""
      onChange={onChange}
      useOptions={useOptions}
      filters={{ partyType: 'CUSTOMER' }}
      getOptionLabel={(option) => option.name}
      getOptionHint={(option) => option.code}
      placeholder="Select customer"
      {...props}
    />
  );
  return { onChange };
};

beforeEach(() => { useOptions.mockClear(); lastParams = undefined; });

describe('Choosing from a list too long for a dropdown', () => {
  it('asks for nothing until it is opened', () => {
    setup();
    expect(useOptions).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: false }));
  });

  it('opens on click and shows what is there', async () => {
    const u = userEvent.setup();
    setup();
    await u.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('option', { name: /Delta Associates/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Zenith Works/ })).toBeInTheDocument();
  });

  it('says how many matched, so a missing name is never a guess', async () => {
    const u = userEvent.setup();
    setup();
    await u.click(screen.getByRole('combobox'));
    // 412 customers, 3 on screen — the old select simply stopped at 100.
    expect(await screen.findByText(/Showing 3 of 412/)).toBeInTheDocument();
  });

  it('sends what is typed to the server rather than filtering three rows here', async () => {
    const u = userEvent.setup();
    setup();
    await u.click(screen.getByRole('combobox'));
    await u.type(screen.getByRole('combobox'), 'zenith');

    await waitFor(() => expect(lastParams.search).toBe('zenith'));
    expect(lastParams).toMatchObject({ partyType: 'CUSTOMER', page: 1, limit: 20 });
    expect(await screen.findByRole('option', { name: /Zenith Works/ })).toBeInTheDocument();
  });

  it('hands back the chosen record and shows it afterwards', async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();

    // Driven the way a form drives it: the parent owns the value. A component
    // that kept showing a name its parent had not accepted would be lying.
    function Harness() {
      const [value, setValue] = useState('');
      return (
        <SearchableSelect
          value={value}
          onChange={(next, option) => { setValue(next); onChange(next, option); }}
          useOptions={useOptions}
          getOptionLabel={(option) => option.name}
          placeholder="Select customer"
        />
      );
    }
    renderWithQuery(<Harness />);

    await u.click(screen.getByRole('combobox'));
    await u.click(await screen.findByRole('option', { name: /Everest Solutions/ }));

    expect(onChange).toHaveBeenCalledWith('c2', CUSTOMERS[1]);
    expect(screen.getByRole('combobox')).toHaveValue('Everest Solutions');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('can be driven from the keyboard alone', async () => {
    const u = userEvent.setup();
    const { onChange } = setup();
    await u.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    // Opens on the first row, so one step down lands on the second.
    await u.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('c2', CUSTOMERS[1]);
  });

  it('renders the list outside the field, so a dialog cannot clip it', async () => {
    const u = userEvent.setup();
    setup();
    await u.click(screen.getByRole('combobox'));
    const list = await screen.findByRole('listbox');
    // Portalled to the body: a scrolling, transformed dialog would otherwise
    // cut it off, and even `position: fixed` stays trapped inside one.
    expect(screen.getByRole('combobox').contains(list)).toBe(false);
    expect(list.closest('[role="dialog"]')).toBeNull();
    expect(document.body.contains(list)).toBe(true);
    // A modal dialog sets `pointer-events: none` on the body. Without an
    // explicit override the options look right and do nothing at all.
    expect(list.parentElement.style.pointerEvents).toBe('auto');
  });

  it('closes on Escape without choosing anything', async () => {
    const u = userEvent.setup();
    const { onChange } = setup();
    await u.click(screen.getByRole('combobox'));
    await screen.findByRole('listbox');
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('says so plainly when nothing matches', async () => {
    const u = userEvent.setup();
    setup({ emptyMessage: 'No customer matches that.' });
    await u.click(screen.getByRole('combobox'));
    await u.type(screen.getByRole('combobox'), 'qqqq');
    expect(await screen.findByText('No customer matches that.')).toBeInTheDocument();
  });

  it('shows the record an edit form starts with, without fetching anything', () => {
    setup({ value: 'c3', initialOption: CUSTOMERS[2] });
    expect(screen.getByRole('combobox')).toHaveValue('Zenith Works');
  });

  it('never grows taller than the room it has, so no result is cut off', async () => {
    const u = userEvent.setup();
    // A field near the bottom of a dialog: 120px below, plenty above.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 600, bottom: 640, left: 0, right: 200, width: 200, height: 40, x: 0, y: 600, toJSON: () => {},
    });
    vi.stubGlobal('innerHeight', 760);

    setup();
    await u.click(screen.getByRole('combobox'));
    const list = await screen.findByRole('listbox');

    // 592px above beats 112px below, so it opens upward rather than off the edge.
    const panel = list.parentElement;
    expect(panel.style.position).toBe('fixed');
    expect(panel.style.bottom).not.toBe('');
    expect(panel.style.top).toBe('');
    // And it is sized to the space rather than to a fixed height that clips.
    expect(Number.parseInt(list.style.maxHeight, 10)).toBeLessThanOrEqual(320);
    expect(Number.parseInt(list.style.maxHeight, 10)).toBeGreaterThanOrEqual(120);

    HTMLElement.prototype.getBoundingClientRect.mockRestore();
  });

  it('lets the wheel scroll the list even though a dialog has locked scrolling', async () => {
    const u = userEvent.setup();
    setup();
    await u.click(screen.getByRole('combobox'));
    const list = await screen.findByRole('listbox');

    // Standing in for react-remove-scroll, which a modal dialog installs on the
    // document and which cancels any wheel outside the dialog. The list is in a
    // body portal, so without stopping the event first it was caught by that:
    // the scrollbar dragged, the trackpad did nothing.
    const lock = vi.fn();
    document.addEventListener('wheel', lock);

    list.dispatchEvent(new Event('wheel', { bubbles: true, cancelable: true }));
    expect(lock).not.toHaveBeenCalled();

    // Everything outside the list is still locked, which is the point of it.
    document.body.dispatchEvent(new Event('wheel', { bubbles: true, cancelable: true }));
    expect(lock).toHaveBeenCalledTimes(1);

    document.removeEventListener('wheel', lock);
  });

  it('does not repeat a code the name already carries', async () => {
    const u = userEvent.setup();
    const rows = [{ id: 'l1', name: 'Ajay Behera (LABR-0059)', code: 'LABR-0059' }];
    const hook = () => ({ data: { rows, count: 1 }, isFetching: false });
    renderWithQuery(
      <SearchableSelect
        value=""
        onChange={() => {}}
        useOptions={hook}
        getOptionLabel={(option) => option.name}
        getOptionHint={(option) => option.code}
      />
    );
    await u.click(screen.getByRole('combobox'));
    const option = await screen.findByRole('option');
    // The name already says LABR-0059; printing it again beside it is noise.
    expect(option.textContent).toBe('Ajay Behera (LABR-0059)');
  });

  it('still shows a hint that adds something the name does not say', async () => {
    const u = userEvent.setup();
    const rows = [{ id: 'l1', name: 'Ajay Behera', partyType: 'LABOUR' }];
    const hook = () => ({ data: { rows, count: 1 }, isFetching: false });
    renderWithQuery(
      <SearchableSelect
        value=""
        onChange={() => {}}
        useOptions={hook}
        getOptionLabel={(option) => option.name}
        getOptionHint={() => 'Labour'}
      />
    );
    await u.click(screen.getByRole('combobox'));
    expect((await screen.findByRole('option')).textContent).toBe('Ajay BeheraLabour');
  });

  it('is labelled, so the form label points at it', async () => {
    const u = userEvent.setup();
    setup({ 'aria-label': 'Customer' });
    expect(screen.getByRole('combobox', { name: 'Customer' })).toBeInTheDocument();
    await u.click(screen.getByRole('combobox'));
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
  });
});
