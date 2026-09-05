import { describe, it, expect } from 'vitest';
import { trimDecimals, toInput } from './decimal';

describe('trimDecimals', () => {
  it('drops a scale that carries no information', () => {
    // What Postgres actually returns for DECIMAL(14,4).
    expect(trimDecimals('2.0000')).toBe('2');
    expect(trimDecimals('400.0000')).toBe('400');
    expect(trimDecimals('0.0000')).toBe('0');
  });

  it('keeps every digit the user actually entered', () => {
    expect(trimDecimals('400.3200')).toBe('400.32');
    expect(trimDecimals('400.3050')).toBe('400.305');
    expect(trimDecimals('0.0001')).toBe('0.0001');
    expect(trimDecimals('1.5')).toBe('1.5');
  });

  it('leaves whole numbers alone, trailing zeros included', () => {
    // The zeros in 1000 are not scale — stripping them would change the number.
    expect(trimDecimals('1000')).toBe('1000');
    expect(trimDecimals('100')).toBe('100');
    expect(trimDecimals(2)).toBe('2');
  });

  it('handles negatives and empties', () => {
    expect(trimDecimals('-12.5000')).toBe('-12.5');
    expect(trimDecimals('')).toBe('');
    expect(trimDecimals(null)).toBe('');
    expect(trimDecimals(undefined)).toBe('');
  });

  it('hands back anything that is not a plain decimal untouched', () => {
    // Better to show an odd value than to mangle it into a different one.
    expect(trimDecimals('1,000.00')).toBe('1,000.00');
    expect(trimDecimals('N/A')).toBe('N/A');
    expect(trimDecimals('1e5')).toBe('1e5');
  });

  it('does not go through Number, so precision survives', () => {
    // Quantities are DECIMAL(14,4) precisely so they are not floats; a value
    // beyond float precision must come back exactly as it went in.
    expect(trimDecimals('12345678901234.5678')).toBe('12345678901234.5678');
    expect(trimDecimals('0.1000')).toBe('0.1');
  });
});

describe('toInput', () => {
  it('falls back only when there is genuinely no value', () => {
    expect(toInput(null, '1')).toBe('1');
    expect(toInput(undefined, '0')).toBe('0');
    expect(toInput('', '30')).toBe('30');
    expect(toInput('')).toBe('');
  });

  it('does not mistake a real zero for a missing value', () => {
    // 0 is a legitimate quantity, and must not be replaced by the fallback.
    expect(toInput('0.0000', '5')).toBe('0');
    expect(toInput(0, '5')).toBe('0');
  });

  it('trims a present value', () => {
    expect(toInput('2.0000', '1')).toBe('2');
  });
});
