/**
 * Applies a tenant's sidebar customisation on top of the built-in menu.
 *
 * Shape stored under the `navigation` tenant setting:
 *
 *   { hidden: ['Data Migration', 'Expenses'], order: { Production: 1, Sales: 2 } }
 *
 * Titles are the key rather than ids, because NAVIGATION has no ids and giving
 * it some would only move the coupling — a renamed item would still lose its
 * preference either way, and titles are at least legible in the stored JSON.
 *
 * Two rules make this safe to apply blind:
 *
 *   - Permissions win. Hiding is cosmetic; it can never reveal something the
 *     user has no grant for, because the sidebar filters by permission first
 *     and this runs afterwards.
 *   - The dashboard can never be hidden. Hiding every item would otherwise
 *     leave someone with an empty sidebar and no way back.
 */

const UNHIDEABLE = new Set(['Dashboard']);

export function applyNavPreferences(navigation, preferences) {
  if (!preferences || typeof preferences !== 'object') return navigation;

  const hidden = new Set(Array.isArray(preferences.hidden) ? preferences.hidden : []);
  const order = preferences.order && typeof preferences.order === 'object' ? preferences.order : {};

  const visible = navigation
    .filter((item) => UNHIDEABLE.has(item.title) || !hidden.has(item.title))
    .map((item) =>
      item.children
        ? { ...item, children: item.children.filter((child) => !hidden.has(child.title)) }
        : item
    )
    // A group whose every leaf was hidden is an empty accordion, so drop it.
    .filter((item) => !item.children || item.children.length > 0);

  // Items with no explicit position keep their built-in order, after the ones
  // that were placed deliberately.
  const positionOf = (item, index) =>
    Object.prototype.hasOwnProperty.call(order, item.title) ? Number(order[item.title]) : 1000 + index;

  return visible
    .map((item, index) => ({ item, key: positionOf(item, index), index }))
    .sort((a, b) => a.key - b.key || a.index - b.index)
    .map((entry) => entry.item);
}

/** Every title a preference can address, for the admin screen. */
export function navigationTitles(navigation) {
  return navigation.flatMap((item) => [
    { title: item.title, isGroup: Boolean(item.children), parent: null },
    ...(item.children || []).map((child) => ({ title: child.title, isGroup: false, parent: item.title })),
  ]);
}
