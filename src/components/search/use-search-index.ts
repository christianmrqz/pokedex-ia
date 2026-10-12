"use client";

import { useQuery } from "@tanstack/react-query";
import { toSearchItems, type RawSearchRow } from "@/lib/engine/search";

/** Índice de búsqueda (≈90 KB) cargado bajo demanda y cacheado durante la sesión. */
export function useSearchIndex(enabled = true) {
  return useQuery({
    queryKey: ["search-index"],
    queryFn: async () => toSearchItems((await import("@/data/generated/search-index.json")).default as RawSearchRow[]),
    staleTime: Infinity,
    gcTime: Infinity,
    enabled,
  });
}
