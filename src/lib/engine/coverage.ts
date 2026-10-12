/**
 * Cobertura ofensiva: qué combinaciones de tipos de ataque golpean con eficacia
 * al mayor número de combinaciones defensivas reales (las de los Pokémon existentes).
 */
import type { Generation, PokemonIndexEntry, TypeName } from "@/lib/domain";
import { typeEffectiveness, typesForGen, typesInGen } from "./type-chart";

export interface CoverageResult {
  attackTypes: TypeName[];
  /** Combinaciones defensivas golpeadas al menos ×2. */
  superEffective: number;
  /** Combinaciones que resisten o son inmunes a todos los tipos elegidos. */
  walled: number;
  total: number;
  /** Ejemplos de combinaciones que lo bloquean todo. */
  walledBy: TypeName[][];
}

/** Combinaciones defensivas únicas de los Pokémon (formas base) que existen en la generación. */
export function defensiveCombos(pool: PokemonIndexEntry[], gen: Generation): TypeName[][] {
  const seen = new Map<string, TypeName[]>();
  for (const p of pool) {
    if (!p.isDefault || p.gen > gen) continue;
    const types = typesForGen(p, gen);
    const key = [...types].sort().join("/");
    if (key && !seen.has(key)) seen.set(key, types);
  }
  return [...seen.values()];
}

export function evaluateCoverage(attackTypes: TypeName[], combos: TypeName[][], gen: Generation): CoverageResult {
  let superEffective = 0;
  const walledBy: TypeName[][] = [];
  for (const combo of combos) {
    const best = Math.max(...attackTypes.map((t) => typeEffectiveness(t, combo, gen)));
    if (best >= 2) superEffective++;
    if (best < 1) walledBy.push(combo);
  }
  return { attackTypes, superEffective, walled: walledBy.length, total: combos.length, walledBy: walledBy.slice(0, 8) };
}

/**
 * Mejores combinaciones de `size` tipos de ataque (búsqueda exhaustiva: C(18,3) = 816 casos).
 * Criterio: más combinaciones golpeadas ×2 y, a igualdad, menos combinaciones que lo bloquean.
 */
export function bestCoverage(pool: PokemonIndexEntry[], gen: Generation, size: 2 | 3 | 4 = 2, fixed: TypeName[] = [], limit = 5): CoverageResult[] {
  const types = typesInGen(gen);
  const combos = defensiveCombos(pool, gen);
  const results: CoverageResult[] = [];
  const pick = (start: number, chosen: TypeName[]) => {
    if (chosen.length === size) {
      results.push(evaluateCoverage(chosen, combos, gen));
      return;
    }
    for (let i = start; i < types.length; i++) {
      if (chosen.includes(types[i])) continue;
      pick(i + 1, [...chosen, types[i]]);
    }
  };
  pick(0, fixed.filter((t) => types.includes(t)).slice(0, size));
  return results.sort((a, b) => b.superEffective - a.superEffective || a.walled - b.walled).slice(0, limit);
}
