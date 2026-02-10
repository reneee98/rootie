/**
 * Slovenské štítky pre hodnoty z formulárov (stav, veľkosť).
 * Používa sa v create wizard, review a v detaile inzerátu.
 */

export const CONDITION_LABELS: Record<string, string> = {
  healthy: "Zdravá",
  slightly_damaged: "Mierne poškodená",
  needs_care: "Potrebuje starostlivosť",
  cutting: "Odrezok",
  seedling: "Semenáčik",
  rooted_cutting: "Zakorenený odrezok",
};

export const SIZE_LABELS: Record<string, string> = {
  mini: "Mini (do 10 cm)",
  small: "Malá (10–25 cm)",
  medium: "Stredná (25–50 cm)",
  large: "Veľká (50–100 cm)",
  xl: "XL (nad 100 cm)",
};

/** Vráti slovenský label pre stav, alebo pôvodnú hodnotu ak nie je v mape. */
export function getConditionLabel(value: string | null): string {
  if (!value) return "";
  return CONDITION_LABELS[value] ?? value;
}

/** Vráti slovenský label pre veľkosť, alebo pôvodnú hodnotu ak nie je v mape. */
export function getSizeLabel(value: string | null): string {
  if (!value) return "";
  return SIZE_LABELS[value] ?? value;
}
