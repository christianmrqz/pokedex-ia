/**
 * Modelos de vista que el servidor prepara para los componentes cliente de la ficha.
 * Se envía solo lo necesario (no los catálogos completos).
 */
import { ABILITIES, MOVES, abilityName } from "@/lib/data/catalog";
import { POKEMON } from "@/lib/data/pokedex";
import { GENERATIONS, type Generation, type MoveEntry, type PokemonIndexEntry, type StatTuple, type TypeName } from "@/lib/domain";
import type { Learnset } from "@/lib/engine/learnset";
import { analyzeOpponent, suggestCounters, type AttackSide, type CounterReason } from "@/lib/engine/strategy";
import { typesForGen } from "@/lib/engine/type-chart";

export interface AbilityView {
  slug: string;
  name: string;
  nameEn: string;
  hidden: boolean;
  description: string | null;
}

export function buildAbilities(entry: PokemonIndexEntry, fromDetail?: { slug: string; hidden: boolean }[]): AbilityView[] {
  const list = fromDetail ?? [...entry.abilities.map((slug) => ({ slug, hidden: false })), ...(entry.hidden ? [{ slug: entry.hidden, hidden: true }] : [])];
  return list.map(({ slug, hidden }) => {
    const a = ABILITIES[slug];
    return {
      slug,
      hidden,
      name: abilityName(slug),
      nameEn: a?.en ?? slug,
      description: a?.descEs ?? a?.effectEn ?? null,
    };
  });
}

export type MoveView = Pick<MoveEntry, "es" | "en" | "type" | "category" | "power" | "accuracy" | "pp" | "priority" | "changes" | "chance"> & {
  description: string | null;
};

/** Datos de los movimientos que aparecen en un learnset. */
export function buildMoveSubset(learnset: Learnset): Record<string, MoveView> {
  const out: Record<string, MoveView> = {};
  for (const { move } of learnset) {
    const m = MOVES[move];
    if (!m) continue;
    out[move] = {
      es: m.es,
      en: m.en,
      type: m.type,
      category: m.category,
      power: m.power,
      accuracy: m.accuracy,
      pp: m.pp,
      priority: m.priority,
      chance: m.chance,
      changes: m.changes,
      description: m.descEs ?? m.effectEn ?? null,
    };
  }
  return out;
}

export interface CounterView {
  slug: string;
  id: number;
  name: string;
  types: TypeName[];
  reasons: CounterReason[];
}

export interface StrategyView {
  gen: Generation;
  types: TypeName[];
  stats: StatTuple;
  side: AttackSide;
  quad: TypeName[];
  double: TypeName[];
  half: TypeName[];
  quarter: TypeName[];
  immune: TypeName[];
  stabThreats: { type: TypeName; hitsSuperEffective: TypeName[] }[];
  counters: CounterView[];
}

/** Análisis precalculado para cada generación en la que existe el Pokémon. */
export function buildStrategyByGen(entry: PokemonIndexEntry): Partial<Record<Generation, StrategyView>> {
  const out: Partial<Record<Generation, StrategyView>> = {};
  for (const gen of GENERATIONS) {
    if (gen < entry.gen) continue;
    const a = analyzeOpponent(entry, gen);
    out[gen] = {
      gen,
      types: a.types,
      stats: a.stats,
      side: a.side,
      quad: a.profile.quad,
      double: a.profile.double,
      half: a.profile.half,
      quarter: a.profile.quarter,
      immune: a.profile.immune,
      stabThreats: a.stabThreats,
      counters: suggestCounters(entry, POKEMON, gen).map((c) => ({
        slug: c.entry.slug,
        id: c.entry.id,
        name: c.entry.es,
        types: typesForGen(c.entry, gen),
        reasons: c.reasons,
      })),
    };
  }
  return out;
}
