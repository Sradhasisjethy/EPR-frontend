import { useEffect } from 'react';

/**
 * M19: keyboard-first data entry framework, baseline.
 *
 * Registers a single global shortcut (e.g. "n" for "new record") that fires
 * `handler` unless focus is currently inside a text input, textarea, select,
 * or contenteditable — so typing "n" while filling a form field doesn't
 * accidentally trigger the page action. Modifier combos (e.g. "mod+s") are
 * always allowed even from within a field, since those aren't printable
 * character collisions.
 *
 * Usage: useHotkey('n', () => setDialogOpen(true), { label: 'New Sales Order' })
 * — every page that wants a keyboard shortcut for its primary "Add" action
 * follows this one-line pattern; see SalesOrdersPage / DispatchPage for the
 * reference usage this was built for.
 */
const isTypingTarget = (el) => {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
};

export function useHotkey(key, handler, { enabled = true, allowWhileTyping = false } = {}) {
  useEffect(() => {
    if (!enabled) return undefined;

    const [mod, mainKey] = key.includes('+') ? key.split('+') : [null, key];

    const onKeyDown = (e) => {
      const matchesKey = e.key.toLowerCase() === mainKey.toLowerCase();
      const matchesMod = mod === 'mod' ? e.metaKey || e.ctrlKey : true;
      if (!matchesKey || !matchesMod) return;
      if (!allowWhileTyping && !mod && isTypingTarget(document.activeElement)) return;

      e.preventDefault();
      handler(e);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, handler, enabled, allowWhileTyping]);
}
