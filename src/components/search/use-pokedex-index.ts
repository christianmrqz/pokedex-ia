"use client";

import { useQuery } from "@tanstack/react-query";
import type { PokemonIndexEntry } from "@/lib/domain";

/** Índice completo de Pokémon (estadísticas, habilidades…) cargado bajo demanda. */
export function usePokedexIndex() {
  return useQuery({
    queryKey: ["pokedex-index"],
    queryFn: async () => {
      const entries = (await import("@/data/generated/pokemon.json")).default as PokemonIndexEntry[];
      return { entries, bySlug: new Map(entries.map((e) => [e.slug, e])) };
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
