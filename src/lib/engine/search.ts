/**
 * Buscador tolerante a errores para nombres de Pokémon en español e inglés.
 * Sin dependencias: normalización de acentos + coincidencias exactas, por prefijo,
 * por palabra, por subcadena y, en último lugar, distancia de edición (Damerau-Levenshtein).
 */
import type { TypeName } from "@/lib/domain";

export interface SearchItem {
  id: number;
  slug: string;
  dex: number;
  es: string;
  en: string;
  types: TypeName[];
  isDefault: boolean;
}

export type RawSearchRow = [number, string, number, string, string, string[], number];

export function toSearchItems(rows: RawSearchRow[]): SearchItem[] {
  return rows.map(([id, slug, dex, es, en, types, isDefault]) => ({
    id,
    slug,
    dex,
    es,
    en,
    types: types as TypeName[],
    isDefault: isDefault === 1,
  }));
}

/** Minúsculas, sin acentos y sin signos: "Mr. Mime" → "mr mime", "Flabébé" → "flabebe". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/♀/g, " f")
    .replace(/♂/g, " m")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const compact = (s: string) => s.replace(/ /g, "");

/** Distancia de Damerau-Levenshtein (variante OSA), con corte temprano. */
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array<number>(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let curr = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      curr[j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

function allowedTypos(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  return 2;
}

interface PreparedItem {
  item: SearchItem;
  names: { full: string; compact: string; words: string[] }[];
}

const preparedCache = new WeakMap<SearchItem[], PreparedItem[]>();

function prepare(items: SearchItem[]): PreparedItem[] {
  const cached = preparedCache.get(items);
  if (cached) return cached;
  const prepared = items.map((item) => {
    const variants = new Set([normalize(item.es), normalize(item.en), normalize(item.slug)]);
    return {
      item,
      names: [...variants].map((full) => ({ full, compact: compact(full), words: full.split(" ") })),
    };
  });
  preparedCache.set(items, prepared);
  return prepared;
}

function scoreName(q: string, qc: string, name: PreparedItem["names"][number]): number {
  if (name.compact === qc) return 1000;
  if (name.compact.startsWith(qc)) return 800 - (name.compact.length - qc.length);
  if (name.words.some((w) => w.startsWith(q))) return 650 - (name.compact.length - qc.length);
  if (name.compact.includes(qc)) return 500 - (name.compact.length - qc.length);
  const max = allowedTypos(qc.length);
  if (max === 0) return 0;
  // Errores tecleando el nombre completo o el principio del nombre (autocompletado).
  const whole = editDistance(qc, name.compact, max);
  const prefix = editDistance(qc, name.compact.slice(0, qc.length), max);
  const best = Math.min(whole, prefix + 0.5);
  if (best <= max) return 300 - best * 60 - (whole <= max ? 0 : name.compact.length - qc.length);
  return 0;
}

export interface SearchResult {
  item: SearchItem;
  score: number;
}

export function searchPokemon(items: SearchItem[], query: string, limit = 8): SearchResult[] {
  const raw = query.trim();
  if (!raw) return [];

  // Número de Pokédex: "452", "#452", "0452".
  const numeric = raw.replace(/^#/, "");
  if (/^\d+$/.test(numeric)) {
    const n = Number(numeric);
    return items
      .filter((i) => i.dex === n || (String(i.dex).startsWith(numeric) && i.isDefault))
      .map((item) => ({ item, score: item.dex === n ? (item.isDefault ? 1000 : 900) : 500 - item.dex }))
      .sort((a, b) => b.score - a.score || a.item.id - b.item.id)
      .slice(0, limit);
  }

  const q = normalize(raw);
  if (!q) return [];
  const qc = compact(q);
  const results: SearchResult[] = [];
  for (const p of prepare(items)) {
    let best = 0;
    for (const name of p.names) best = Math.max(best, scoreName(q, qc, name));
    if (best > 0) results.push({ item: p.item, score: best + (p.item.isDefault ? 40 : 0) });
  }
  return results.sort((a, b) => b.score - a.score || a.item.dex - b.item.dex || a.item.id - b.item.id).slice(0, limit);
}
