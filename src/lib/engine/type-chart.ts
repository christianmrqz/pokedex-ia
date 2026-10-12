/**
 * Motor de efectividad de tipos.
 *
 * Fuente: tabla oficial de PokéAPI (type efficacy) más sus valores históricos
 * (type efficacy past), generados en src/data/generated/types.json.
 *
 * Este módulo SOLO conoce la relación entre tipos. Las habilidades, objetos,
 * teracristalización y efectos de campo se aplican en ./battle-effectiveness.ts.
 */
import typeData from "@/data/generated/types.json";
import { TYPE_NAMES, type Generation, type TypeName } from "@/lib/domain";

interface TypeData {
  types: { slug: string; introducedIn: number; es: string; en: string }[];
  current: [string, string, number][];
  past: { attack: string; defense: string; factor: number; untilGen: number }[];
}

const data = typeData as unknown as TypeData;

const INTRODUCED_IN = new Map(data.types.map((t) => [t.slug as TypeName, t.introducedIn]));

export type Multiplier = 0 | 0.25 | 0.5 | 1 | 2 | 4;

/** Tipos que existen en una generación (Siniestro y Acero desde Gen 2; Hada desde Gen 6). */
export function typesInGen(gen: Generation): TypeName[] {
  return TYPE_NAMES.filter((t) => (INTRODUCED_IN.get(t) ?? 1) <= gen);
}

export function typeExistsInGen(type: TypeName, gen: Generation): boolean {
  return (INTRODUCED_IN.get(type) ?? 1) <= gen;
}

type Chart = Record<TypeName, Record<TypeName, number>>;
const chartCache = new Map<Generation, Chart>();

/** Tabla completa atacante → defensor para una generación. */
export function getTypeChart(gen: Generation): Chart {
  const cached = chartCache.get(gen);
  if (cached) return cached;

  const chart = {} as Chart;
  for (const atk of TYPE_NAMES) {
    chart[atk] = {} as Record<TypeName, number>;
    for (const def of TYPE_NAMES) chart[atk][def] = 1;
  }
  for (const [atk, def, factor] of data.current) chart[atk as TypeName][def as TypeName] = factor;

  // Un valor histórico se aplica a todas las generaciones <= untilGen. Si hay varios
  // para el mismo par, gana el de untilGen más bajo que siga cubriendo la generación.
  const applicable = data.past
    .filter((p) => p.untilGen >= gen)
    .sort((a, b) => b.untilGen - a.untilGen);
  for (const p of applicable) chart[p.attack as TypeName][p.defense as TypeName] = p.factor;

  chartCache.set(gen, chart);
  return chart;
}

/** Efectividad de un tipo atacante contra un único tipo defensivo. */
export function singleEffectiveness(attack: TypeName, defense: TypeName, gen: Generation): number {
  return getTypeChart(gen)[attack][defense];
}

/**
 * Multiplicador final = efectividad contra el primer tipo × efectividad contra el segundo.
 * Los tipos inexistentes en la generación se ignoran.
 */
export function typeEffectiveness(attack: TypeName, defenders: readonly TypeName[], gen: Generation): Multiplier {
  const chart = getTypeChart(gen);
  let result = 1;
  for (const def of new Set(defenders)) {
    if (!typeExistsInGen(def, gen)) continue;
    result *= chart[attack][def];
  }
  return result as Multiplier;
}

export interface DefensiveEntry {
  type: TypeName;
  multiplier: Multiplier;
}

export interface DefensiveProfile {
  entries: DefensiveEntry[];
  /** Agrupado por categoría para la interfaz. */
  quad: TypeName[];
  double: TypeName[];
  neutral: TypeName[];
  half: TypeName[];
  quarter: TypeName[];
  immune: TypeName[];
}

/** Perfil defensivo de una combinación de tipos frente a todos los tipos atacantes de la generación. */
export function defensiveProfile(defenders: readonly TypeName[], gen: Generation): DefensiveProfile {
  const entries = typesInGen(gen).map((type) => ({ type, multiplier: typeEffectiveness(type, defenders, gen) }));
  return {
    entries,
    quad: entries.filter((e) => e.multiplier === 4).map((e) => e.type),
    double: entries.filter((e) => e.multiplier === 2).map((e) => e.type),
    neutral: entries.filter((e) => e.multiplier === 1).map((e) => e.type),
    half: entries.filter((e) => e.multiplier === 0.5).map((e) => e.type),
    quarter: entries.filter((e) => e.multiplier === 0.25).map((e) => e.type),
    immune: entries.filter((e) => e.multiplier === 0).map((e) => e.type),
  };
}

/** Efectividad ofensiva de un tipo atacante contra cada tipo defensivo de la generación. */
export function offensiveProfile(attack: TypeName, gen: Generation): DefensiveEntry[] {
  return typesInGen(gen).map((type) => ({ type, multiplier: typeEffectiveness(attack, [type], gen) }));
}

/** Mejor multiplicador que consigue un conjunto de tipos atacantes contra una combinación defensiva. */
export function bestCoverage(attackTypes: readonly TypeName[], defenders: readonly TypeName[], gen: Generation): number {
  return attackTypes.reduce((best, t) => Math.max(best, typeEffectiveness(t, defenders, gen)), 0);
}

export function typeLabel(type: TypeName, locale: "es" | "en" = "es"): string {
  const t = data.types.find((x) => x.slug === type);
  return t ? t[locale] : type;
}

/** Tipos que tenía un Pokémon en una generación concreta (p. ej. Clefairy era Normal hasta Gen 5). */
export function typesForGen(
  entry: { types: TypeName[]; pastTypes?: { untilGen: number; types: TypeName[] }[] },
  gen: Generation,
): TypeName[] {
  const past = (entry.pastTypes ?? []).filter((p) => p.untilGen >= gen).sort((a, b) => a.untilGen - b.untilGen)[0];
  const types = past ? past.types : entry.types;
  return types.filter((t) => typeExistsInGen(t, gen));
}
