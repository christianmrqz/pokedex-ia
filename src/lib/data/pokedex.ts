/**
 * Acceso al índice estático de Pokémon (src/data/generated/pokemon.json).
 * Contiene todas las variedades de PokéAPI con datos ligeros: nombres, tipos,
 * estadísticas base, habilidades y generación. No incluye movimientos ni textos.
 */
import pokemonData from "@/data/generated/pokemon.json";
import type { PokemonIndexEntry } from "@/lib/domain";

export const POKEMON: PokemonIndexEntry[] = pokemonData as PokemonIndexEntry[];

const bySlug = new Map(POKEMON.map((p) => [p.slug, p]));
const byId = new Map(POKEMON.map((p) => [p.id, p]));
const defaultBySpecies = new Map<number, PokemonIndexEntry>();
const bySpeciesSlug = new Map<string, PokemonIndexEntry>();
const varietiesBySpecies = new Map<number, PokemonIndexEntry[]>();

for (const p of POKEMON) {
  if (p.isDefault) {
    defaultBySpecies.set(p.speciesId, p);
    bySpeciesSlug.set(p.speciesSlug, p);
  }
  const list = varietiesBySpecies.get(p.speciesId) ?? [];
  list.push(p);
  varietiesBySpecies.set(p.speciesId, list);
}

export function getPokemonBySlug(slug: string): PokemonIndexEntry | undefined {
  return bySlug.get(slug);
}

export function getPokemonById(id: number): PokemonIndexEntry | undefined {
  return byId.get(id);
}

/** Forma por defecto de una especie (número de Pokédex nacional). */
export function getDefaultForSpecies(speciesId: number): PokemonIndexEntry | undefined {
  return defaultBySpecies.get(speciesId);
}

export function getVarieties(speciesId: number): PokemonIndexEntry[] {
  return varietiesBySpecies.get(speciesId) ?? [];
}

/**
 * Resuelve lo que el usuario puede escribir en la URL: slug de variedad
 * (rotom-wash), slug de especie (deoxys → deoxys-normal) o número (452).
 */
export function resolvePokemon(param: string): PokemonIndexEntry | undefined {
  const key = decodeURIComponent(param).trim().toLowerCase();
  if (/^\d+$/.test(key)) {
    const n = Number(key);
    return defaultBySpecies.get(n) ?? byId.get(n);
  }
  return bySlug.get(key) ?? bySpeciesSlug.get(key);
}

export const NATIONAL_DEX_SIZE = defaultBySpecies.size;

export function displayName(entry: Pick<PokemonIndexEntry, "es" | "en">, locale: "es" | "en" = "es"): string {
  return entry[locale];
}

export function totalStats(entry: Pick<PokemonIndexEntry, "stats">): number {
  return entry.stats.reduce((a, b) => a + b, 0);
}
