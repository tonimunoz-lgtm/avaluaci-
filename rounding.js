// rounding.js
export function applyRounding(value, multiplier = 1) {
  if (multiplier === 1) return Math.round(value);
  if (multiplier === 0.5) return Math.round(value * 2) / 2;
  return value; // per defecte, sense canvi
}
