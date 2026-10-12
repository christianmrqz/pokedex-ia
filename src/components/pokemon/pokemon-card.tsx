import Link from "next/link";
import type { PokemonIndexEntry } from "@/lib/domain";
import { artworkCandidatesById } from "@/lib/engine/sprites";
import { formatDexNumber } from "@/lib/ui/format";
import { TYPE_COLORS } from "@/lib/ui/type-colors";
import { PokemonImage } from "./pokemon-image";
import { TypeBadge } from "./type-badge";

interface Props {
  entry: PokemonIndexEntry;
  /** Dato destacado opcional (p. ej. la estadística por la que se ordena). */
  metric?: { label: string; value: number };
}

export function PokemonCard({ entry, metric }: Props) {
  const color = TYPE_COLORS[entry.types[0]];
  return (
    <Link
      href={`/pokemon/${entry.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl surface p-3 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-white/20"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-28 opacity-40 transition-opacity group-hover:opacity-70"
        style={{ background: `radial-gradient(70% 90% at 50% 0%, ${color}66, transparent 70%)` }}
      />
      <div className="relative mx-auto aspect-square w-full max-w-36">
        <PokemonImage
          candidates={artworkCandidatesById(entry.id)}
          alt={entry.es}
          size={160}
          sizes="(max-width: 640px) 40vw, 160px"
          className="size-full transition-transform duration-300 group-hover:scale-110"
        />
      </div>
      <div className="relative mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-mono tabular">{formatDexNumber(entry.speciesId)}</span>
        {metric && (
          <span>
            {metric.label} <span className="font-mono font-semibold text-foreground tabular">{metric.value}</span>
          </span>
        )}
      </div>
      <h3 className="relative mt-0.5 truncate text-sm font-semibold" title={entry.es}>
        {entry.es}
      </h3>
      <div className="relative mt-2 flex flex-wrap gap-1">
        {entry.types.map((t) => (
          <TypeBadge key={t} type={t} size="xs" />
        ))}
      </div>
    </Link>
  );
}
