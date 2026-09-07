/**
 * Turns a database decimal into something worth showing a person.
 *
 * Postgres NUMERIC columns come back at their full declared scale, so a
 * quantity of 2 arrives as "2.0000" and a rate of 400.32 as "400.3200". In a
 * form field that reads as noise at best and as a different number at worst —
 * nobody types "2.0000", so seeing it on an edit screen makes you wonder what
 * else changed.
 *
 * Only trailing zeros go. 400 shows as "400", 400.32 stays "400.32", and
 * 400.3050 becomes "400.305" — the value itself is never rounded or altered.
 *
 * Deliberately string-based. Going through Number() would introduce float
 * artifacts on values this application keeps exact on purpose (quantities are
 * DECIMAL(14,4) precisely so they are not floats), and would turn a very large
 * or very precise value into exponential notation.
 */
export const trimDecimals = (value) => {
  if (value === null || value === undefined || value === '') return '';

  const text = String(value).trim();

  // Anything that is not a plain decimal — a formatted string, an expression,
  // something unexpected — is handed back untouched rather than mangled.
  if (!/^-?\d+(\.\d+)?$/.test(text)) return text;
  if (!text.includes('.')) return text;

  return text.replace(/\.?0+$/, '');
};

/**
 * The same thing for a form field, with a fallback when there is no value.
 *
 *   toInput(product.openingStockQty)        -> '2'      (from "2.0000")
 *   toInput(item.minQuantity, '1')          -> '1'      (when null)
 */
export const toInput = (value, fallback = '') => {
  if (value === null || value === undefined || value === '') return fallback;
  return trimDecimals(value);
};
