// Mirrors backend src/utils/money.js — the API speaks integer paise (BR-17),
// forms speak rupees for the human entering data.
export const toPaise = (rupees) => {
  if (rupees === '' || rupees === null || rupees === undefined) return 0;
  return Math.round(Number(rupees) * 100);
};

export const fromPaise = (paise) => {
  if (paise === null || paise === undefined) return '';
  return (Number(paise) / 100).toString();
};

export const formatINR = (paise) => {
  if (paise === null || paise === undefined) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(paise) / 100);
};
