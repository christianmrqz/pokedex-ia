"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PokemonPicker } from "@/components/search/pokemon-picker";
import { usePokedexIndex } from "@/components/search/use-pokedex-index";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCalculator } from "./stat-calculator";

export function StatCalculatorStandalone() {
  const router = useRouter();
  const params = useSearchParams();
  const slug = params.get("pokemon") ?? "garchomp";
  const { data } = usePokedexIndex();
  const pokemon = data?.bySlug.get(slug) ?? data?.bySlug.get("garchomp");

  return (
    <div className="space-y-6">
      <div className="max-w-md">
        <PokemonPicker value={pokemon?.slug ?? null} onChange={(s) => router.replace(`?pokemon=${s}`, { scroll: false })} label="Elige un Pokémon" />
      </div>
      <div className="rounded-3xl surface p-5 sm:p-7">
        {pokemon ? <StatCalculator key={pokemon.slug} pokemon={pokemon} /> : <Skeleton className="h-96 w-full" />}
      </div>
    </div>
  );
}
