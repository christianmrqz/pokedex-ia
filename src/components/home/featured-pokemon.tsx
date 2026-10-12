import { ArrowRight } from "lucide-react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { POKEMON, totalStats } from "@/lib/data/pokedex";
import { artworkCandidatesById } from "@/lib/engine/sprites";
import { defensiveProfile, typeLabel } from "@/lib/engine/type-chart";
import { formatDexNumber } from "@/lib/ui/format";
import { TYPE_COLORS, typeGradient } from "@/lib/ui/type-colors";

/** Elige el Pokémon del día; el resultado se cachea durante un día. */
async function pickFeatured() {
  "use cache";
  cacheLife("days");
  const pool = POKEMON.filter((p) => p.isDefault);
  const day = Math.floor(Date.now() / 86_400_000);
  return pool[(day * 7919) % pool.length];
}

export async function FeaturedPokemon() {
  const entry = await pickFeatured();
  const profile = defensiveProfile(entry.types, 9);
  const weak = [...profile.quad, ...profile.double];

  return (
    <Link
      href={`/pokemon/${entry.slug}`}
      className="group relative grid overflow-hidden rounded-3xl surface p-6 transition-colors hover:border-primary/30 sm:grid-cols-[220px_1fr] sm:items-center sm:gap-8 sm:p-8"
    >
      <div aria-hidden className="absolute inset-0 opacity-80" style={{ background: typeGradient(entry.types, 0.32) }} />
      <div className="relative mx-auto size-48 sm:size-56">
        <div
          aria-hidden
          className="absolute inset-[15%] rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle, ${TYPE_COLORS[entry.types[0]]}77, transparent 70%)` }}
        />
        <PokemonImage
          candidates={artworkCandidatesById(entry.id)}
          alt={entry.es}
          size={224}
          sizes="224px"
          className="relative size-full drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="relative mt-4 sm:mt-0">
        <p className="text-xs font-medium tracking-widest text-primary uppercase">Pokémon del día</p>
        <div className="mt-1 flex items-baseline gap-3">
          <h2 className="text-3xl font-bold">{entry.es}</h2>
          <span className="font-mono text-sm text-muted-foreground">{formatDexNumber(entry.speciesId)}</span>
        </div>
        <div className="mt-3 flex gap-2">
          {entry.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:max-w-md">
          <div>
            <dt className="text-xs text-muted-foreground">Debilidades</dt>
            <dd className="mt-0.5">{weak.length ? weak.map((w) => `${typeLabel(w)} ×${profile.quad.includes(w) ? 4 : 2}`).join(", ") : "Ninguna"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Estadísticas base</dt>
            <dd className="mt-0.5">{totalStats(entry)} en total</dd>
          </div>
        </dl>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          Ver ficha completa <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
