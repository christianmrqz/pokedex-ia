"use client";

import Link from "next/link";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import { useSearchIndex } from "@/components/search/use-search-index";
import { artworkCandidatesById } from "@/lib/engine/sprites";
import { useFavorites } from "./use-favorites";

/** Accesos rápidos a los favoritos (solo se muestra si hay alguno). */
export function FavoritesStrip() {
  const { favorites } = useFavorites();
  const { data: items } = useSearchIndex(favorites.length > 0);
  if (!favorites.length || !items) return null;
  const list = favorites.map((slug) => items.find((i) => i.slug === slug)).filter((x) => !!x);
  if (!list.length) return null;
  return (
    <section className="mt-12" aria-labelledby="fav-title">
      <h2 id="fav-title" className="mb-4 text-2xl font-semibold">
        Tus favoritos
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {list.map((p) => (
          <Link key={p.slug} href={`/pokemon/${p.slug}`} className="flex w-28 shrink-0 flex-col items-center gap-1 rounded-2xl surface p-3 text-center hover:border-primary/40">
            <PokemonImage candidates={artworkCandidatesById(p.id)} alt={p.es} size={80} sizes="80px" className="size-20" />
            <span className="truncate text-xs font-medium">{p.es}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
