import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dialog, DialogContent, DialogTitle } from './dialog';

/**
 * A full-height dialog draws its own flush header and footer, so it passes
 * `p-0` and expects no padding from the shell.
 *
 * That broke once: the base was changed to `p-4 sm:p-6` for small screens, and
 * tailwind-merge treats each variant as its own group — so `p-0` cancelled
 * `p-4` and left `sm:p-6` standing, adding 24px above and below the chrome on
 * every screen wider than 640px.
 */
describe('DialogContent padding', () => {
  const classesOf = (className) => {
    render(
      <Dialog open>
        <DialogContent className={className}>
          <DialogTitle>Edit Contractor</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    return screen.getByRole('dialog').className.split(/\s+/);
  };

  it('applies its own padding by default', () => {
    expect(classesOf(undefined)).toContain('p-6');
  });

  it('lets a caller remove padding completely', () => {
    const classes = classesOf('p-0');
    expect(classes).toContain('p-0');
    // No responsive padding may survive the override.
    expect(classes.filter((c) => /^(sm|md|lg|xl):p-\d/.test(c))).toEqual([]);
    expect(classes).not.toContain('p-6');
  });
});
