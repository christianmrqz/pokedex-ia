import { Layers } from "lucide-react";
import Link from "next/link";
import { getDictionary } from "@/i18n";
import type { PokemonIndexEntry } from "@/lib/domain";
import { artworkCandidatesById } from "@/lib/engine/sprites";
import { cn } from "@/lib/utils";
import { PokemonImage } from "./pokemon-image";
import { Section } from "./section";
import { TypeBadge } from "./type-badge";

const t = getDictionary();

export function FormsStrip({ varieties, currentSlug }: { varieties: PokemonIndexEntry[]; currentSlug: string }) {
  if (varieties.length < 2) return null;
  return (
    <Section id="formas" title={t.pokemon.sections.forms} icon={<Layers />}>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {varieties.map((v) => (
          <Link
            key={v.slug}
            href={`/pokemon/${v.slug}`}
            aria-current={v.slug === currentSlug ? "page" : undefined}
            className={cn(
              "group flex w-36 shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-border bg-background/40 p-3 text-center transition-colors hover:border-primary/40",
              v.slug === currentSlug && "border-primary/50 bg-primary/[0.06]",
            )}
          >
            <PokemonImage
              candidates={artworkCandidatesById(v.id)}
              alt={v.es}
              size={96}
              sizes="96px"
              className="size-24 transition-transform group-hover:scale-110"
            />
            <span className="line-clamp-2 text-xs font-medium">{v.es}</span>
            <span className="flex gap-1">
              {v.types.map((ty) => (
                <TypeBadge key={ty} type={ty} size="xs" />
              ))}
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}
