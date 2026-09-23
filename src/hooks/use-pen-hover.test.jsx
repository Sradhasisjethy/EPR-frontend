import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePenHover } from './use-pen-hover';

const fire = (type, pointerType) => {
  const event = new Event(type, { bubbles: true });
  event.pointerType = pointerType;
  window.dispatchEvent(event);
};

const flagged = () => document.documentElement.hasAttribute('data-pen-hover');

/**
 * The whole point of this hook is the distinction it draws: a pen gets hover
 * feedback, a finger never does. If a finger could set the flag, iPadOS would
 * go back to spending the first tap activating hover instead of clicking.
 */
describe('usePenHover', () => {
  afterEach(() => document.documentElement.removeAttribute('data-pen-hover'));

  it('flags the document while a pen is hovering', () => {
    renderHook(() => usePenHover());
    fire('pointerover', 'pen');
    expect(flagged()).toBe(true);
  });

  it('ignores a finger entirely', () => {
    renderHook(() => usePenHover());
    fire('pointerover', 'touch');
    expect(flagged()).toBe(false);
  });

  it('ignores a mouse — the media query already covers a real pointer', () => {
    renderHook(() => usePenHover());
    fire('pointerover', 'mouse');
    expect(flagged()).toBe(false);
  });

  it('clears when the pen lifts away', () => {
    renderHook(() => usePenHover());
    fire('pointerover', 'pen');
    fire('pointerout', 'pen');
    expect(flagged()).toBe(false);
  });

  it('clears on tap, so the highlight does not linger under the pen', () => {
    renderHook(() => usePenHover());
    fire('pointerover', 'pen');
    fire('pointerdown', 'pen');
    expect(flagged()).toBe(false);
  });

  it('cleans up after itself on unmount', () => {
    const { unmount } = renderHook(() => usePenHover());
    fire('pointerover', 'pen');
    unmount();
    expect(flagged()).toBe(false);

    // And stops listening — a later pen event must not re-flag the document.
    fire('pointerover', 'pen');
    expect(flagged()).toBe(false);
  });
});
