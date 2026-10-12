/**
 * Transformaciones puras de las respuestas de PokéAPI al modelo de la aplicación.
 * Recortan los datos (una ficha REST de Pokémon puede pesar cientos de KB) y no
 * hacen peticiones, por lo que se pueden probar con datos reales guardados.
 */
import { isTypeName, type StatTuple, type TypeName } from "@/lib/domain";
import type { Learnset } from "@/lib/engine/learnset";
import type { PokemonSprites } from "@/lib/engine/sprites";
import { idFromUrl } from "./client";
import type { RawChainLink, RawEvolutionDetail, RawPokemon, RawSpecies } from "./raw-types";

export interface PokemonAbilitySlot {
  slug: string;
  hidden: boolean;
  slot: number;
}

export interface PokemonDetail {
  id: number;
  slug: string;
  speciesId: number;
  speciesSlug: string;
  isDefault: boolean;
  baseExperience: number | null;
  height: number;
  weight: number;
  types: TypeName[];
  pastTypes: { untilGen: number; types: TypeName[] }[];
  abilities: PokemonAbilitySlot[];
  pastAbilities: { untilGen: number; abilities: PokemonAbilitySlot[] }[];
  stats: StatTuple;
  evYield: StatTuple;
  sprites: PokemonSprites;
  cry: string | null;
  heldItems: string[];
  learnset: Learnset;
}

const STAT_ORDER = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];

const genFromUrl = (url: string) => idFromUrl(url);

export function transformPokemon(raw: RawPokemon): PokemonDetail {
  const statMap = new Map(raw.stats.map((s) => [s.stat.name, s]));
  const stats = STAT_ORDER.map((k) => statMap.get(k)?.base_stat ?? 0) as StatTuple;
  const evYield = STAT_ORDER.map((k) => statMap.get(k)?.effort ?? 0) as StatTuple;

  const types = raw.types
    .sort((a, b) => a.slot - b.slot)
    .map((t) => t.type.name)
    .filter(isTypeName);

  const pastTypes = raw.past_types.map((p) => ({
    untilGen: genFromUrl(p.generation.url),
    types: p.types
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name)
      .filter(isTypeName),
  }));

  const abilities = raw.abilities
    .filter((a) => a.ability)
    .map((a) => ({ slug: a.ability!.name, hidden: a.is_hidden, slot: a.slot }));

  const pastAbilities = (raw.past_abilities ?? []).map((p) => ({
    untilGen: genFromUrl(p.generation.url),
    abilities: p.abilities.filter((a) => a.ability).map((a) => ({ slug: a.ability!.name, hidden: a.is_hidden, slot: a.slot })),
  }));

  const art = raw.sprites.other?.["official-artwork"];
  const home = raw.sprites.other?.home;
  const sprites: PokemonSprites = {
    artwork: art?.front_default ?? null,
    artworkShiny: art?.front_shiny ?? null,
    home: home?.front_default ?? null,
    homeShiny: home?.front_shiny ?? null,
    front: raw.sprites.front_default,
    frontShiny: raw.sprites.front_shiny ?? null,
  };

  const learnset: Learnset = raw.moves.map((m) => ({
    move: m.move.name,
    details: m.version_group_details.map((d) => ({
      vg: d.version_group.name,
      method: d.move_learn_method.name,
      level: d.level_learned_at,
    })),
  }));

  return {
    id: raw.id,
    slug: raw.name,
    speciesId: idFromUrl(raw.species.url),
    speciesSlug: raw.species.name,
    isDefault: raw.is_default,
    baseExperience: raw.base_experience,
    height: raw.height,
    weight: raw.weight,
    types,
    pastTypes,
    abilities,
    pastAbilities,
    stats,
    evYield,
    sprites,
    cry: raw.cries?.latest ?? raw.cries?.legacy ?? null,
    heldItems: raw.held_items.map((h) => h.item.name),
    learnset,
  };
}

export interface SpeciesDetail {
  id: number;
  slug: string;
  name: { es: string; en: string };
  genus: { es: string | null; en: string | null };
  flavor: { es: string | null; en: string | null; version: string | null };
  generation: number;
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
  captureRate: number;
  baseHappiness: number | null;
  /** Probabilidad de ser hembra en octavos; -1 = sin género. */
  genderRate: number;
  hatchCounter: number | null;
  growthRate: string | null;
  eggGroups: string[];
  color: string | null;
  habitat: string | null;
  evolvesFrom: string | null;
  evolutionChainId: number | null;
  varieties: { slug: string; isDefault: boolean }[];
}

const cleanText = (s: string) => s.replace(/[\n\f\r­]+/g, " ").replace(/\s+/g, " ").trim();

export function transformSpecies(raw: RawSpecies): SpeciesDetail {
  const byLang = <T extends { language: { name: string } }>(list: T[], lang: string) => list.filter((x) => x.language.name === lang);
  // PokéAPI ordena las descripciones cronológicamente: se usa la más reciente.
  const flavorEs = byLang(raw.flavor_text_entries, "es").at(-1);
  const flavorEn = byLang(raw.flavor_text_entries, "en").at(-1);
  return {
    id: raw.id,
    slug: raw.name,
    name: {
      es: byLang(raw.names, "es")[0]?.name ?? byLang(raw.names, "en")[0]?.name ?? raw.name,
      en: byLang(raw.names, "en")[0]?.name ?? raw.name,
    },
    genus: { es: byLang(raw.genera, "es")[0]?.genus ?? null, en: byLang(raw.genera, "en")[0]?.genus ?? null },
    flavor: {
      es: flavorEs ? cleanText(flavorEs.flavor_text) : null,
      en: flavorEn ? cleanText(flavorEn.flavor_text) : null,
      version: (flavorEs ?? flavorEn)?.version.name ?? null,
    },
    generation: idFromUrl(raw.generation.url),
    isLegendary: raw.is_legendary,
    isMythical: raw.is_mythical,
    isBaby: raw.is_baby,
    captureRate: raw.capture_rate,
    baseHappiness: raw.base_happiness,
    genderRate: raw.gender_rate,
    hatchCounter: raw.hatch_counter,
    growthRate: raw.growth_rate?.name ?? null,
    eggGroups: raw.egg_groups.map((e) => e.name),
    color: raw.color?.name ?? null,
    habitat: raw.habitat?.name ?? null,
    evolvesFrom: raw.evolves_from_species?.name ?? null,
    evolutionChainId: raw.evolution_chain ? idFromUrl(raw.evolution_chain.url) : null,
    varieties: raw.varieties.map((v) => ({ slug: v.pokemon.name, isDefault: v.is_default })),
  };
}

/** Condición de evolución normalizada (independiente del idioma). */
export interface EvolutionCondition {
  trigger: string;
  minLevel?: number;
  item?: string;
  heldItem?: string;
  knownMove?: string;
  knownMoveType?: string;
  locations?: string[];
  minHappiness?: number;
  minAffection?: number;
  minBeauty?: number;
  timeOfDay?: string;
  gender?: "female" | "male";
  needsRain?: boolean;
  partySpecies?: string;
  partyType?: string;
  relativeStats?: -1 | 0 | 1;
  tradeSpecies?: string;
  upsideDown?: boolean;
  usedMove?: string;
  minMoveCount?: number;
  minSteps?: number;
  minDamageTaken?: number;
  region?: string;
}

export interface EvolutionNode {
  speciesSlug: string;
  speciesId: number;
  /** Cómo se llega a esta especie desde la anterior (vacío en la base de la cadena). */
  conditions: EvolutionCondition[];
  evolvesTo: EvolutionNode[];
}

type ExtendedDetail = RawEvolutionDetail & {
  used_move?: { name: string } | null;
  min_move_count?: number | null;
  min_steps?: number | null;
  min_damage_taken?: number | null;
  region?: { name: string } | null;
};

export function transformEvolutionDetail(d: ExtendedDetail): EvolutionCondition {
  const c: EvolutionCondition = { trigger: d.trigger.name };
  if (d.min_level != null) c.minLevel = d.min_level;
  if (d.item) c.item = d.item.name;
  if (d.held_item) c.heldItem = d.held_item.name;
  if (d.known_move) c.knownMove = d.known_move.name;
  if (d.known_move_type) c.knownMoveType = d.known_move_type.name;
  if (d.location) c.locations = [d.location.name];
  if (d.min_happiness != null) c.minHappiness = d.min_happiness;
  if (d.min_affection != null) c.minAffection = d.min_affection;
  if (d.min_beauty != null) c.minBeauty = d.min_beauty;
  if (d.time_of_day) c.timeOfDay = d.time_of_day;
  if (d.gender === 1) c.gender = "female";
  if (d.gender === 2) c.gender = "male";
  if (d.needs_overworld_rain) c.needsRain = true;
  if (d.party_species) c.partySpecies = d.party_species.name;
  if (d.party_type) c.partyType = d.party_type.name;
  if (d.relative_physical_stats != null) c.relativeStats = d.relative_physical_stats as -1 | 0 | 1;
  if (d.trade_species) c.tradeSpecies = d.trade_species.name;
  if (d.turn_upside_down) c.upsideDown = true;
  if (d.used_move) c.usedMove = d.used_move.name;
  if (d.min_move_count != null) c.minMoveCount = d.min_move_count;
  if (d.min_steps != null) c.minSteps = d.min_steps;
  if (d.min_damage_taken != null) c.minDamageTaken = d.min_damage_taken;
  if (d.region) c.region = d.region.name;
  return c;
}

export function transformEvolutionChain(link: RawChainLink): EvolutionNode {
  // El mismo método aparece repetido por cada localización (una por juego): se agrupan.
  const byKey = new Map<string, EvolutionCondition>();
  for (const c of link.evolution_details.map(transformEvolutionDetail)) {
    const key = JSON.stringify({ ...c, locations: undefined });
    const existing = byKey.get(key);
    if (!existing) byKey.set(key, c);
    else if (c.locations) existing.locations = [...new Set([...(existing.locations ?? []), ...c.locations])];
  }
  const conditions = [...byKey.values()];
  return {
    speciesSlug: link.species.name,
    speciesId: idFromUrl(link.species.url),
    conditions,
    evolvesTo: link.evolves_to.map(transformEvolutionChain),
  };
}
