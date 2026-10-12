import type { SearchItem } from "@/lib/engine/search";
import { artworkCandidatesById } from "@/lib/engine/sprites";
import { formatDexNumber } from "@/lib/ui/format";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import { TypeBadge } from "@/components/pokemon/type-badge";

export function SearchResultRow({ item }: { item: SearchItem }) {
  return (
    <div className="flex w-full items-center gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/5">
        <PokemonImage
          candidates={artworkCandidatesById(item.id)}
          alt=""
          size={40}
          sizes="40px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{item.es}</div>
        <div className="text-xs text-muted-foreground tabular">
          {formatDexNumber(item.dex)}
          {item.en !== item.es && <span className="ml-2 opacity-70">{item.en}</span>}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        {item.types.map((t) => (
          <TypeBadge key={t} type={t} size="xs" />
        ))}
      </div>
    </div>
  );
}
