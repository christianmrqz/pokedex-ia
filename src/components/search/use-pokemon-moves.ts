"use client";

import { useQuery } from "@tanstack/react-query";
import type { Learnset } from "@/lib/engine/learnset";
import type { MoveView } from "@/lib/pokemon/view-models";

export interface PokemonMovesResponse {
  slug: string;
  learnset: Learnset;
  moves: Record<string, MoveView>;
  versionGroups: string[];
  abilities: { slug: string; hidden: boolean; slot: number }[];
}

export function usePokemonMoves(slug: string | null) {
  return useQuery({
    queryKey: ["pokemon-moves", slug],
    enabled: !!slug,
    queryFn: async (): Promise<PokemonMovesResponse> => {
      const res = await fetch(`/api/pokemon/${slug}`);
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Error ${res.status}`);
      return res.json();
    },
    staleTime: 1000 * 60 * 60,
  });
}
