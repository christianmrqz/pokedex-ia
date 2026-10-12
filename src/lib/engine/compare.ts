/**
 * Comparación determinista entre dos Pokémon: tipos, velocidad real y movimientos destacados.
 */
import type { Generation, MoveEntry, PokemonIndexEntry, StatTuple, TypeName } from "@/lib/domain";
import { moveCategoryForGen, moveValuesForVersionGroup, movesForVersionGroup, type Learnset } from "./learnset";
import { calcStats, evRules } from "./stats";
import { statsForGen } from "./strategy";
import { typeEffectiveness, typesForGen } from "./type-chart";

export interface StatRange {
  min: number;
  neutral: number;
  max: number;
}

/** Rango real de una estadística a un nivel: mínimo (IV 0, sin EV, naturaleza −), neutro (IV máx., sin EV) y máximo (IV y EV máx., naturaleza +). */
export function statRange(base: StatTuple, index: number, level: number, gen: Generation): StatRange {
  const rules = evRules(gen);
  const at = (iv: number, ev: number, mult: "down" | "none" | "up") => {
    const ivs = [iv, iv, iv, iv, iv, iv] as StatTuple;
    const evs = [0, 0, 0, 0, 0, 0] as StatTuple;
    evs[index] = ev;
    // Naturaleza ficticia que solo afecta a la estadística pedida (PS no tiene naturaleza).
    const statName = (["hp", "attack", "defense", "special-attack", "special-defense", "speed"] as const)[index];
    const other = index === 1 ? "defense" : "attack";
    const nature =
      mult === "none" || index === 0 || !rules.hasNatures
        ? null
        : mult === "up"
          ? { up: statName, down: other }
          : { up: other, down: statName };
    return calcStats({ gen, base, level, ivs, evs, nature: nature as never })[index];
  };
  return { min: at(0, 0, "down"), neutral: at(rules.maxIv, 0, "none"), max: at(rules.maxIv, rules.perStat === 65535 ? 65535 : 252, "up") };
}

export interface MatchupSummary {
  aTypes: TypeName[];
  bTypes: TypeName[];
  aStats: StatTuple;
  bStats: StatTuple;
  /** Mejor multiplicador de los tipos de A contra B (STAB). */
  aOffense: { type: TypeName; multiplier: number };
  bOffense: { type: TypeName; multiplier: number };
  speed: { a: StatRange; b: StatRange; level: number };
}

export function compareMatchup(a: PokemonIndexEntry, b: PokemonIndexEntry, gen: Generation, level = 50): MatchupSummary {
  const aTypes = typesForGen(a, gen);
  const bTypes = typesForGen(b, gen);
  const best = (atk: TypeName[], def: TypeName[]) =>
    atk.map((t) => ({ type: t, multiplier: typeEffectiveness(t, def, gen) })).sort((x, y) => y.multiplier - x.multiplier)[0];
  const aStats = statsForGen(a, gen);
  const bStats = statsForGen(b, gen);
  return {
    aTypes,
    bTypes,
    aStats,
    bStats,
    aOffense: best(aTypes, bTypes),
    bOffense: best(bTypes, aTypes),
    speed: { a: statRange(aStats, 5, level, gen), b: statRange(bStats, 5, level, gen), level },
  };
}

export interface HighlightedMove {
  move: string;
  type: TypeName;
  category: "physical" | "special";
  power: number;
  accuracy: number | null;
  stab: boolean;
  /** Multiplicador de tipo contra el objetivo (1 si no hay objetivo). */
  effectiveness: number;
  /** Potencia × STAB × efectividad × precisión: solo para ordenar. */
  score: number;
}

type MoveData = Pick<MoveEntry, "type" | "category" | "power" | "accuracy" | "changes" | "chance" | "pp" | "priority" | "es" | "en">;

/**
 * Movimientos de daño más fuertes que puede aprender en un juego, uno por tipo,
 * ordenados por su valor contra el objetivo (si se indica).
 */
export function highlightMoves(
  learnset: Learnset,
  moves: Record<string, MoveData>,
  vg: { slug: string; order: number; gen: Generation },
  ownTypes: TypeName[],
  targetTypes: TypeName[] | null,
  limit = 6,
): HighlightedMove[] {
  const bestByType = new Map<TypeName, HighlightedMove>();
  for (const row of movesForVersionGroup(learnset, vg.slug)) {
    const m = moves[row.move];
    if (!m) continue;
    const values = moveValuesForVersionGroup({ ...m, id: 0, gen: 0 } as MoveEntry, vg.order);
    const category = moveCategoryForGen(m.category, values.type, vg.gen);
    // Se excluyen los movimientos de estado y los de potencia variable (sin valor fijo).
    if (category === "status" || !values.power || values.power <= 1) continue;
    const stab = ownTypes.includes(values.type);
    const effectiveness = targetTypes ? typeEffectiveness(values.type, targetTypes, vg.gen) : 1;
    const score = values.power * (stab ? 1.5 : 1) * effectiveness * ((values.accuracy ?? 100) / 100);
    const candidate: HighlightedMove = {
      move: row.move,
      type: values.type,
      category,
      power: values.power,
      accuracy: values.accuracy,
      stab,
      effectiveness,
      score,
    };
    const current = bestByType.get(values.type);
    if (!current || candidate.score > current.score) bestByType.set(values.type, candidate);
  }
  return [...bestByType.values()].sort((x, y) => y.score - x.score).slice(0, limit);
}
