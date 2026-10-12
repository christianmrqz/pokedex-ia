/**
 * Análisis estratégico determinista de un Pokémon rival.
 * Todo se deriva de la tabla de tipos y de las estadísticas base; no hay texto generado.
 */
import type { Generation, PokemonIndexEntry, StatTuple, TypeName } from "@/lib/domain";
import { defensiveProfile, typeEffectiveness, typesForGen, type DefensiveProfile } from "./type-chart";

/** Estadísticas base de una entrada en una generación concreta (historial de @smogon/calc). */
export function statsForGen(entry: Pick<PokemonIndexEntry, "stats" | "statHistory">, gen: Generation): StatTuple {
  const past = (entry.statHistory ?? []).filter((h) => h.untilGen >= gen).sort((a, b) => a.untilGen - b.untilGen)[0];
  return past ? past.stats : entry.stats;
}

export type AttackSide = "physical" | "special" | "either";

export interface OpponentAnalysis {
  types: TypeName[];
  profile: DefensiveProfile;
  stats: StatTuple;
  /** Lado por el que conviene atacar según Defensa vs Defensa Especial. */
  side: AttackSide;
  /** Tipos que el rival golpea con eficacia usando ataques de su propio tipo (STAB). */
  stabThreats: { type: TypeName; hitsSuperEffective: TypeName[] }[];
  /** Índices de aguante simplificados: PS × Def y PS × Def. Esp. */
  physicalBulk: number;
  specialBulk: number;
}

export function analyzeOpponent(entry: PokemonIndexEntry, gen: Generation): OpponentAnalysis {
  const types = typesForGen(entry, gen);
  const stats = statsForGen(entry, gen);
  const [hp, , def, , spd] = stats;
  const diff = def - spd;
  const side: AttackSide = Math.abs(diff) < 15 ? "either" : diff > 0 ? "special" : "physical";
  const stabThreats = types.map((t) => ({
    type: t,
    hitsSuperEffective: defensiveTargets(t, gen),
  }));
  return {
    types,
    profile: defensiveProfile(types, gen),
    stats,
    side,
    stabThreats,
    physicalBulk: hp * def,
    specialBulk: hp * spd,
  };
}

function defensiveTargets(attack: TypeName, gen: Generation): TypeName[] {
  return defensiveProfile([], gen).entries.map((e) => e.type).filter((t) => typeEffectiveness(attack, [t], gen) > 1);
}

export type CounterReason =
  | { key: "stab"; type: TypeName; multiplier: number }
  | { key: "resists"; type: TypeName; multiplier: number }
  | { key: "weakTo"; type: TypeName; multiplier: number }
  | { key: "faster"; own: number; rival: number }
  | { key: "slower"; own: number; rival: number }
  | { key: "physicalEdge"; atk: number; def: number }
  | { key: "specialEdge"; spa: number; spd: number };

export interface CounterSuggestion {
  entry: PokemonIndexEntry;
  score: number;
  offense: number;
  defense: number;
  reasons: CounterReason[];
}

export interface CounterOptions {
  includeLegendary?: boolean;
  limit?: number;
}

const OFFENSE_SCORE: Record<number, number> = { 4: 3, 2: 2, 1: 0.4, 0.5: -1, 0.25: -1.5, 0: -2 };
const DEFENSE_SCORE: Record<number, number> = { 0: 2.5, 0.25: 2, 0.5: 1.5, 1: 0, 2: -2, 4: -3 };

/**
 * Sugiere Pokémon con ventaja frente al rival. Combina:
 *  - ataque: mejor multiplicador de sus tipos (STAB) contra el rival;
 *  - defensa: peor multiplicador de los tipos del rival (su STAB) contra él;
 *  - estadísticas: su mejor ataque frente a la defensa correspondiente del rival y la velocidad.
 * No comprueba movimientos concretos: es una orientación basada en tipos y estadísticas base.
 */
export function suggestCounters(
  rival: PokemonIndexEntry,
  pool: PokemonIndexEntry[],
  gen: Generation,
  { includeLegendary = false, limit = 6 }: CounterOptions = {},
): CounterSuggestion[] {
  const rivalTypes = typesForGen(rival, gen);
  const [, , rDef, , rSpd, rSpe] = statsForGen(rival, gen);
  const out: CounterSuggestion[] = [];

  for (const cand of pool) {
    if (cand.gen > gen || cand.speciesId === rival.speciesId) continue;
    if (cand.battleOnly || cand.kind === "gmax" || cand.kind === "mega") continue;
    if (!cand.isDefault && cand.kind !== "regional") continue;
    if (!includeLegendary && (cand.legendary || cand.mythical)) continue;
    if (cand.kind === "regional" && gen < 7) continue;

    const types = typesForGen(cand, gen);
    if (!types.length) continue;
    const stats = statsForGen(cand, gen);
    const [, atk, , spa, , spe] = stats;

    const stabs = types.map((t) => ({ type: t, m: typeEffectiveness(t, rivalTypes, gen) })).sort((a, b) => b.m - a.m);
    const offense = stabs[0].m;
    const threats = rivalTypes.map((t) => ({ type: t, m: typeEffectiveness(t, types, gen) })).sort((a, b) => b.m - a.m);
    const defense = threats.length ? threats[0].m : 1;

    const physical = atk / Math.max(rDef, 1);
    const special = spa / Math.max(rSpd, 1);
    const power = Math.max(physical, special);
    const total = stats.reduce((a, b) => a + b, 0);
    const statScore =
      Math.max(-1, Math.min(1.5, (power - 1) * 1.5)) +
      (spe > rSpe ? 0.6 : spe === rSpe ? 0 : -0.2) +
      // Las estadísticas totales favorecen a las formas evolucionadas frente a las intermedias.
      Math.max(-0.8, Math.min(0.6, (total - 480) / 150));
    // Un buen enfrentamiento necesita ventaja real: se exige ataque eficaz o resistencia clara.
    if (offense < 2 && defense > 0.5) continue;

    const score = (OFFENSE_SCORE[offense] ?? 0) + (DEFENSE_SCORE[defense] ?? 0) + statScore;

    const reasons: CounterReason[] = [];
    if (offense >= 2) reasons.push({ key: "stab", type: stabs[0].type, multiplier: offense });
    for (const t of threats) {
      if (t.m < 1) reasons.push({ key: "resists", type: t.type, multiplier: t.m });
      if (t.m > 1) reasons.push({ key: "weakTo", type: t.type, multiplier: t.m });
    }
    if (spe > rSpe) reasons.push({ key: "faster", own: spe, rival: rSpe });
    else if (spe < rSpe) reasons.push({ key: "slower", own: spe, rival: rSpe });
    if (physical >= special) reasons.push({ key: "physicalEdge", atk, def: rDef });
    else reasons.push({ key: "specialEdge", spa, spd: rSpd });

    out.push({ entry: cand, score, offense, defense, reasons });
  }

  // Una sugerencia por especie.
  const seen = new Set<number>();
  return out
    .sort((a, b) => b.score - a.score || a.entry.speciesId - b.entry.speciesId)
    .filter((s) => (seen.has(s.entry.speciesId) ? false : (seen.add(s.entry.speciesId), true)))
    .slice(0, limit);
}
