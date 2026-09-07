import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuantityStepper } from './quantity-stepper';

/**
 * Every node in a bundle tree uses this — the parent and each accessory under
 * it — so its behaviour has to be boring and predictable. The interesting
 * cases are all about NOT firing: a half-typed number that reaches the server
 * rescales the whole group and makes the accessories visibly flap.
 */
describe('QuantityStepper', () => {
  it('steps up and down', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<QuantityStepper value={4} onCommit={onCommit} label="cable quantity" />);

    await user.click(screen.getByLabelText('Increase cable quantity'));
    expect(onCommit).toHaveBeenCalledWith(5);

    await user.click(screen.getByLabelText('Decrease cable quantity'));
    expect(onCommit).toHaveBeenCalledWith(3);
  });

  it('does not fire while a number is being typed', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<QuantityStepper value={2} onCommit={onCommit} label="qty" />);

    const input = screen.getByLabelText('qty');
    await user.clear(input);
    await user.type(input, '12');

    // "1" on the way to "12" would rescale the group for a moment.
    expect(onCommit).not.toHaveBeenCalled();

    await user.tab();
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(12);
  });

  it('commits on Enter', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<QuantityStepper value={2} onCommit={onCommit} label="qty" />);

    await user.clear(screen.getByLabelText('qty'));
    await user.type(screen.getByLabelText('qty'), '9{Enter}');
    expect(onCommit).toHaveBeenCalledWith(9);
  });

  it('puts the old value back on Escape', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<QuantityStepper value={2} onCommit={onCommit} label="qty" />);

    const input = screen.getByLabelText('qty');
    await user.clear(input);
    await user.type(input, '99{Escape}');

    expect(input).toHaveValue('2');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('rejects nonsense and restores what was there', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<QuantityStepper value={3} onCommit={onCommit} label="qty" />);

    const input = screen.getByLabelText('qty');
    await user.clear(input);
    await user.type(input, 'abc');
    await user.tab();

    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveValue('3');
  });

  it('will not go to zero', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<QuantityStepper value={1} onCommit={onCommit} label="qty" />);

    // A line with no quantity is a line that should have been removed instead.
    expect(screen.getByLabelText('Decrease qty')).toBeDisabled();

    await user.clear(screen.getByLabelText('qty'));
    await user.type(screen.getByLabelText('qty'), '0');
    await user.tab();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('says nothing when the value has not actually changed', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<QuantityStepper value={5} onCommit={onCommit} label="qty" />);

    await user.click(screen.getByLabelText('qty'));
    await user.tab();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('follows the server when it answers with a different number', async () => {
    const { rerender } = render(<QuantityStepper value={2} onCommit={vi.fn()} label="qty" />);
    expect(screen.getByLabelText('qty')).toHaveValue('2');

    // A parent rescale, a reset, or a rejected edit: the server is the
    // authority and the field has to follow it rather than hold a stale draft.
    rerender(<QuantityStepper value={6} onCommit={vi.fn()} label="qty" />);
    expect(screen.getByLabelText('qty')).toHaveValue('6');
  });

  it('is inert when disabled', async () => {
    render(<QuantityStepper value={2} onCommit={vi.fn()} disabled label="qty" />);

    expect(screen.getByLabelText('qty')).toBeDisabled();
    expect(screen.getByLabelText('Increase qty')).toBeDisabled();
    expect(screen.getByLabelText('Decrease qty')).toBeDisabled();
  });
});
