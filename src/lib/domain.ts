/** Tipos de dominio compartidos por la capa de datos, los motores de cálculo y la interfaz. */

export const TYPE_NAMES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type TypeName = (typeof TYPE_NAMES)[number];

export const isTypeName = (value: string): value is TypeName => (TYPE_NAMES as readonly string[]).includes(value);

export type Generation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export const GENERATIONS: Generation[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const LATEST_GEN: Generation = 9;

export const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
/** Estadísticas en orden PS, Ataque, Defensa, At. Esp., Def. Esp., Velocidad. */
export type StatTuple = [number, number, number, number, number, number];

export type MoveCategory = "physical" | "special" | "status";

export type Locale = "es" | "en";

/** Entrada del índice estático de Pokémon (una por variedad de PokéAPI). */
export interface PokemonIndexEntry {
  id: number;
  slug: string;
  speciesId: number;
  speciesSlug: string;
  es: string;
  en: string;
  /** Generación en la que se introdujo la especie. */
  gen: number;
  types: TypeName[];
  /** Tipos anteriores: válidos hasta la generación indicada (incluida). */
  pastTypes?: { untilGen: number; types: TypeName[] }[];
  stats: StatTuple;
  /** Estadísticas base anteriores (fuente: @smogon/calc), válidas hasta la generación indicada. */
  statHistory?: { untilGen: number; stats: StatTuple }[];
  abilities: string[];
  hidden?: string;
  /** Altura en decímetros y peso en hectogramos (unidades de PokéAPI). */
  height: number;
  weight: number;
  isDefault: boolean;
  kind?: "mega" | "gmax" | "regional" | "form";
  battleOnly?: boolean;
  legendary?: boolean;
  mythical?: boolean;
  /** Nombre de la especie en @smogon/calc, si existe equivalencia. */
  smogon?: string;
}

export interface MoveChange {
  /** Valores vigentes ANTES del grupo de versiones con este orden. */
  beforeVgOrder: number;
  power?: number;
  accuracy?: number;
  pp?: number;
  chance?: number;
  type?: TypeName;
}

export interface MoveEntry {
  id: number;
  es: string;
  en: string;
  type: TypeName;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: number;
  gen: number;
  chance?: number;
  descEs?: string;
  effectEn?: string;
  changes?: MoveChange[];
}

export interface AbilityEntry {
  es: string;
  en: string;
  gen: number;
  descEs?: string;
  effectEn?: string;
}

export interface NatureEntry {
  slug: string;
  es: string;
  en: string;
  up: PokeApiStatName | null;
  down: PokeApiStatName | null;
}

export type PokeApiStatName = "hp" | "attack" | "defense" | "special-attack" | "special-defense" | "speed";

export interface VersionGroupEntry {
  slug: string;
  order: number;
  gen: Generation;
  es: string;
  en: string;
}
