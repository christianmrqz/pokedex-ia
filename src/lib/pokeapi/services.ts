/**
 * Servicios de datos de PokéAPI para el servidor.
 *
 * Cada función se cachea con `use cache` (los datos de PokéAPI cambian muy poco), de modo
 * que una ficha solo se pide una vez por despliegue y por recurso. Se guarda el modelo
 * recortado, no la respuesta completa.
 */
import { cacheLife, cacheTag } from "next/cache";
import { PokeApiError, pokeApiFetch } from "./client";
import type { RawEvolutionChain, RawNamedWithNames, RawPokemon, RawSpecies } from "./raw-types";
import {
  transformEvolutionChain,
  transformPokemon,
  transformSpecies,
  type EvolutionNode,
  type PokemonDetail,
  type SpeciesDetail,
} from "./transform";

async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof PokeApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getPokemonDetail(slug: string): Promise<PokemonDetail | null> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`pokemon:${slug}`);
  const raw = await orNull(pokeApiFetch<RawPokemon>(`pokemon/${slug}`));
  return raw ? transformPokemon(raw) : null;
}

export async function getSpeciesDetail(idOrSlug: number | string): Promise<SpeciesDetail | null> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`species:${idOrSlug}`);
  const raw = await orNull(pokeApiFetch<RawSpecies>(`pokemon-species/${idOrSlug}`));
  return raw ? transformSpecies(raw) : null;
}

export interface EvolutionChainResult {
  root: EvolutionNode;
  /** Nombres en español de objetos y localizaciones citados en la cadena. */
  names: Record<string, string>;
}

export async function getEvolutionChain(id: number): Promise<EvolutionChainResult | null> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`evolution:${id}`);
  const raw = await orNull(pokeApiFetch<RawEvolutionChain>(`evolution-chain/${id}`));
  if (!raw) return null;
  const root = transformEvolutionChain(raw.chain);

  const items = new Set<string>();
  const locations = new Set<string>();
  const walk = (n: EvolutionNode) => {
    for (const c of n.conditions) {
      if (c.item) items.add(c.item);
      if (c.heldItem) items.add(c.heldItem);
      for (const l of c.locations ?? []) locations.add(l);
    }
    n.evolvesTo.forEach(walk);
  };
  walk(root);

  const names: Record<string, string> = {};
  const lookups = [
    ...[...items].map((slug) => ({ slug, path: `item/${slug}` })),
    ...[...locations].map((slug) => ({ slug, path: `location/${slug}` })),
  ];
  await Promise.all(
    lookups.map(async ({ slug, path }) => {
      const res = await orNull(getNamedResource(path)).catch(() => null);
      const es = res?.names.find((n) => n.language.name === "es")?.name;
      const en = res?.names.find((n) => n.language.name === "en")?.name;
      if (es || en) names[slug] = (es ?? en)!;
    }),
  );
  return { root, names };
}

async function getNamedResource(path: string): Promise<RawNamedWithNames> {
  "use cache";
  cacheLife("max");
  return pokeApiFetch<RawNamedWithNames>(path);
}
