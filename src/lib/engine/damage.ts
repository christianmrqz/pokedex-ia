/**
 * Calculadora de daño: envoltorio de @smogon/calc (el motor de Pokémon Showdown).
 *
 * Este módulo NO implementa la fórmula de daño: traduce la entrada de la aplicación
 * (slugs de PokéAPI) al formato de @smogon/calc y presenta su resultado en español.
 */
import { Field, Generations, Move, Pokemon, calculate, toID } from "@smogon/calc";
import type { Generation, StatTuple, TypeName } from "@/lib/domain";

const STAT_IDS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;

type SmogonGen = ReturnType<typeof Generations.get>;

const nameMaps = new Map<Generation, { moves: Map<string, string>; abilities: Map<string, string>; items: Map<string, string> }>();

function maps(gen: Generation) {
  const cached = nameMaps.get(gen);
  if (cached) return cached;
  const g = Generations.get(gen);
  const index = (it: Iterable<{ name: string }>) => new Map([...it].map((x) => [toID(x.name), x.name]));
  const m = { moves: index(g.moves), abilities: index(g.abilities), items: index(g.items) };
  nameMaps.set(gen, m);
  return m;
}

/** slug de PokéAPI ("u-turn", "kings-shield") → nombre de @smogon/calc ("U-turn", "King's Shield"). */
export function smogonMoveName(slug: string, gen: Generation): string | undefined {
  // PokéAPI separa los movimientos Z en variante física y especial; @smogon/calc los trata como uno.
  const base = MOVE_ALIASES[slug] ?? slug.replace(/--(physical|special)$/, "");
  return maps(gen).moves.get(base.replace(/-/g, ""));
}

/** Movimientos con distinto nombre en PokéAPI y en @smogon/calc. */
const MOVE_ALIASES: Record<string, string> = { "vice-grip": "vise-grip" };

export function smogonAbilityName(slug: string, gen: Generation): string | undefined {
  return maps(gen).abilities.get(slug.replace(/-/g, ""));
}

/** Objetos válidos en la generación (nombres de @smogon/calc). */
export function smogonItems(gen: Generation): string[] {
  return [...maps(gen).items.values()].sort();
}

export function speciesExistsInGen(smogonName: string, gen: Generation): boolean {
  return !!Generations.get(gen).species.get(toID(smogonName));
}

export interface CombatantInput {
  /** Nombre de especie en @smogon/calc. */
  species: string;
  level: number;
  /** Slug de naturaleza de PokéAPI (se ignora en Gen 1-2). */
  nature: string | null;
  /** Slug de habilidad de PokéAPI. */
  ability: string | null;
  /** Nombre de objeto de @smogon/calc. */
  item: string | null;
  /** IV 0-31 (en Gen 1-2 @smogon/calc usa DV = IV/2). */
  ivs: StatTuple;
  /** EV 0-252. */
  evs: StatTuple;
  /** Modificadores de −6 a +6 (el índice de PS se ignora). */
  boosts: StatTuple;
  status: "" | "brn" | "par" | "psn" | "tox" | "slp" | "frz";
  teraType: TypeName | null;
  /** PS actuales en porcentaje (100 = completos). */
  hpPercent: number;
}

export interface FieldInput {
  weather: "" | "Sun" | "Rain" | "Sand" | "Snow" | "Hail" | "Harsh Sunshine" | "Heavy Rain" | "Strong Winds";
  terrain: "" | "Electric" | "Grassy" | "Psychic" | "Misty";
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
  isCrit: boolean;
  doubles: boolean;
  helpingHand: boolean;
  gravity: boolean;
}

export interface DamageResult {
  rolls: number[];
  min: number;
  max: number;
  defenderHp: number;
  defenderMaxHp: number;
  minPercent: number;
  maxPercent: number;
  /** Probabilidad de KO calculada por @smogon/calc (null si no se puede determinar). */
  ko: { hits: number; chance: number | null } | null;
  koText: string;
  /** Descripción original de @smogon/calc (inglés, notación de Showdown). */
  showdownDesc: string;
  attackerStats: StatTuple;
  defenderStats: StatTuple;
  moveType: TypeName;
  moveCategory: "Physical" | "Special" | "Status";
  basePower: number;
  hasStab: boolean;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function toStats(t: StatTuple) {
  return Object.fromEntries(STAT_IDS.map((k, i) => [k, t[i]]));
}

function buildPokemon(g: SmogonGen, gen: Generation, input: CombatantInput) {
  const ability = input.ability ? smogonAbilityName(input.ability, gen) : undefined;
  const boosts = Object.fromEntries(STAT_IDS.slice(1).map((k, i) => [k, input.boosts[i + 1]]));
  const p = new Pokemon(g, input.species, {
    level: input.level,
    nature: gen >= 3 && input.nature ? cap(input.nature) : undefined,
    ability,
    item: gen >= 2 && input.item ? input.item : undefined,
    ivs: toStats(input.ivs),
    evs: toStats(input.evs),
    boosts,
    status: input.status || undefined,
    teraType: gen >= 9 && input.teraType ? (cap(input.teraType) as never) : undefined,
  });
  if (input.hpPercent < 100) {
    p.originalCurHP = Math.max(1, Math.floor((p.maxHP() * input.hpPercent) / 100));
  }
  return p;
}

export function koDescription(ko: DamageResult["ko"]): string {
  if (!ko || ko.hits === 0) return "No consigue debilitarlo en 4 golpes o menos (sin contar efectos adicionales).";
  const hits = ko.hits === 1 ? "de un golpe" : `en ${ko.hits} golpes`;
  if (ko.chance === null) return `Posible KO ${hits}.`;
  if (ko.chance >= 1) return `KO asegurado ${hits}.`;
  return `${(ko.chance * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 })} % de probabilidad de KO ${hits}.`;
}

export function computeDamage(gen: Generation, attacker: CombatantInput, defender: CombatantInput, moveSlug: string, field: FieldInput): DamageResult {
  const g = Generations.get(gen);
  const moveName = smogonMoveName(moveSlug, gen);
  if (!moveName) throw new Error(`El movimiento «${moveSlug}» no existe en la Gen ${gen}.`);

  const atk = buildPokemon(g, gen, attacker);
  const def = buildPokemon(g, gen, defender);
  const move = new Move(g, moveName, { isCrit: field.isCrit });
  const f = new Field({
    gameType: field.doubles ? "Doubles" : "Singles",
    weather: field.weather || undefined,
    terrain: gen >= 6 && field.terrain ? field.terrain : undefined,
    isGravity: field.gravity,
    attackerSide: { isHelpingHand: field.helpingHand },
    defenderSide: { isReflect: field.reflect, isLightScreen: field.lightScreen, isAuroraVeil: field.auroraVeil },
  });

  const result = calculate(g, atk, def, move, f);
  const raw = result.damage;
  const rolls = (Array.isArray(raw) ? (Array.isArray(raw[0]) ? (raw as number[][]).map((r) => r.reduce((a, b) => a + b, 0)) : (raw as number[])) : [raw]).slice();
  const [min, max] = result.range();
  const hp = def.curHP();
  const maxHp = def.maxHP();
  let ko: DamageResult["ko"] = null;
  let showdownDesc = "";
  if (max > 0) {
    const k = result.kochance();
    ko = { hits: k.n, chance: k.chance ?? null };
    showdownDesc = result.desc();
  }
  const statTuple = (p: Pokemon) => STAT_IDS.map((k) => p.stats[k]) as StatTuple;
  const moveType = result.move.type.toLowerCase() as TypeName;
  const attackerTypes = (gen >= 9 && attacker.teraType ? [attacker.teraType, ...atk.types.map((x) => x.toLowerCase())] : atk.types.map((x) => x.toLowerCase())) as string[];

  return {
    rolls,
    min,
    max,
    defenderHp: hp,
    defenderMaxHp: maxHp,
    minPercent: (min / maxHp) * 100,
    maxPercent: (max / maxHp) * 100,
    ko,
    koText: koDescription(max > 0 ? ko : null),
    showdownDesc,
    attackerStats: statTuple(atk),
    defenderStats: statTuple(def),
    moveType,
    moveCategory: result.move.category,
    basePower: result.move.bp,
    hasStab: attackerTypes.includes(moveType),
  };
}

export function defaultCombatant(species: string): CombatantInput {
  return {
    species,
    level: 50,
    nature: "hardy",
    ability: null,
    item: null,
    ivs: [31, 31, 31, 31, 31, 31],
    evs: [0, 0, 0, 0, 0, 0],
    boosts: [0, 0, 0, 0, 0, 0],
    status: "",
    teraType: null,
    hpPercent: 100,
  };
}

export const DEFAULT_FIELD: FieldInput = {
  weather: "",
  terrain: "",
  reflect: false,
  lightScreen: false,
  auroraVeil: false,
  isCrit: false,
  doubles: false,
  helpingHand: false,
  gravity: false,
};
