import { ChevronRight, GitBranch } from "lucide-react";
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { getDefaultForSpecies } from "@/lib/data/pokedex";
import { artworkCandidatesById } from "@/lib/engine/sprites";
import type { EvolutionChainResult } from "@/lib/pokeapi/services";
import type { EvolutionNode } from "@/lib/pokeapi/transform";
import { describeEvolution } from "@/lib/pokemon/evolution-text";
import { cn } from "@/lib/utils";
import { PokemonImage } from "./pokemon-image";
import { Section } from "./section";
import { TypeBadge } from "./type-badge";

const t = getDictionary();

export function EvolutionChain({ chain, currentSpeciesId }: { chain: EvolutionChainResult | null; currentSpeciesId: number }) {
  const single = !chain || chain.root.evolvesTo.length === 0;
  return (
    <Section id="evoluciones" title={t.pokemon.sections.evolutions} icon={<GitBranch />}>
      {single ? (
        <p className="text-sm text-muted-foreground">{t.pokemon.noEvolution}</p>
      ) : (
        <div className="overflow-x-auto pb-2">
          <Stage node={chain.root} names={chain.names} current={currentSpeciesId} />
        </div>
      )}
    </Section>
  );
}

function Stage({ node, names, current }: { node: EvolutionNode; names: Record<string, string>; current: number }) {
  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <SpeciesCard speciesId={node.speciesId} current={current} />
      {node.evolvesTo.length > 0 && (
        <div className="flex flex-col gap-3">
          {node.evolvesTo.map((child) => (
            <div key={child.speciesSlug} className="flex items-center gap-2 sm:gap-4">
              <div className="flex w-28 shrink-0 flex-col items-center gap-1 text-center sm:w-40">
                {child.conditions.map((c, i) => (
                  <span key={i} className="text-[11px] leading-tight text-muted-foreground sm:text-xs">
                    {describeEvolution(c, names)}
                  </span>
                ))}
                <ChevronRight className="size-5 text-primary/70" />
              </div>
              <Stage node={child} names={names} current={current} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SpeciesCard({ speciesId, current }: { speciesId: number; current: number }) {
  const entry = getDefaultForSpecies(speciesId);
  if (!entry) return null;
  const isCurrent = speciesId === current;
  return (
    <Link
      href={`/pokemon/${entry.slug}`}
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "group flex w-28 shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-border bg-background/40 p-3 text-center transition-colors hover:border-primary/40 sm:w-36",
        isCurrent && "border-primary/50 bg-primary/[0.06]",
      )}
    >
      <PokemonImage
        candidates={artworkCandidatesById(entry.id)}
        alt={entry.es}
        size={96}
        sizes="96px"
        className="size-20 transition-transform group-hover:scale-110 sm:size-24"
      />
      <span className="text-sm font-medium">{entry.es}</span>
      <span className="flex gap-1">
        {entry.types.map((ty) => (
          <TypeBadge key={ty} type={ty} size="xs" />
        ))}
      </span>
    </Link>
  );
}
