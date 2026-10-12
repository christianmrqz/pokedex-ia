/** Utilidades de formato compartidas por servidor y cliente. */

export function formatDexNumber(n: number): string {
  return `#${String(n).padStart(4, "0")}`;
}

/** Altura de PokéAPI (decímetros) a metros. */
export function formatHeight(dm: number): string {
  return `${(dm / 10).toLocaleString("es-ES", { maximumFractionDigits: 1 })} m`;
}

/** Peso de PokéAPI (hectogramos) a kilogramos. */
export function formatWeight(hg: number): string {
  return `${(hg / 10).toLocaleString("es-ES", { maximumFractionDigits: 1 })} kg`;
}

export function formatMultiplier(m: number): string {
  if (m === 0.25) return "¼";
  if (m === 0.5) return "½";
  return String(m).replace(".", ",");
}
