"use client";

import { AnimatePresence, motion } from "motion/react";
import { Sparkles, Volume2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useGame } from "@/components/game/game-context";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getDictionary } from "@/i18n";
import type { TypeName } from "@/lib/domain";
import { generationLabel } from "@/lib/data/games";
import { artworkCandidatesById, resolveArtwork, type PokemonSprites } from "@/lib/engine/sprites";
import { defensiveProfile, typeLabel, typesForGen } from "@/lib/engine/type-chart";
import { formatDexNumber, formatHeight, formatWeight } from "@/lib/ui/format";
import { TYPE_COLORS, typeGradient } from "@/lib/ui/type-colors";
import { cn } from "@/lib/utils";
import type { AbilityView } from "@/lib/pokemon/view-models";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { PokemonImage } from "./pokemon-image";
import { TypeBadge } from "./type-badge";

const t = getDictionary();

export interface PokemonHeroProps {
  id: number;
  slug: string;
  dex: number;
  name: string;
  nameEn: string;
  genus: string | null;
  flavor: string | null;
  types: TypeName[];
  pastTypes?: { untilGen: number; types: TypeName[] }[];
  introducedIn: number;
  sprites: PokemonSprites | null;
  cry: string | null;
  height: number;
  weight: number;
  abilities: AbilityView[];
  badges: string[];
}

export function PokemonHero(props: PokemonHeroProps) {
  const { gen } = useGame();
  const [shiny, setShiny] = useState(false);
  const existsInGen = gen >= props.introducedIn;
  const effectiveGen = existsInGen ? gen : 9;
  const types = useMemo(() => typesForGen(props, effectiveGen), [props, effectiveGen]);
  const typesChanged = types.join() !== props.types.join();

  const artwork = props.sprites
    ? resolveArtwork(props.sprites, shiny)
    : { candidates: artworkCandidatesById(props.id, shiny), shinyUnavailable: false };

  const profile = defensiveProfile(types, effectiveGen);
  const weak = [...profile.quad, ...profile.double];
  const weakText = weak.map((w) => `${typeLabel(w)} (×${profile.quad.includes(w) ? 4 : 2})`).join(", ");
  const summary =
    weak.length === 0
      ? t.weakness.noWeakness(props.name)
      : weak.length === 1
        ? t.weakness.onlyWeakness(props.name, weakText)
        : `${t.weakness.weaknesses(props.name, weak.length)}: ${weakText}`;

  const playCry = () => {
    if (!props.cry) return;
    const audio = new Audio(props.cry);
    audio.volume = 0.35;
    void audio.play().catch(() => undefined);
  };

  return (
    <section id="resumen" className="relative scroll-mt-28 overflow-hidden rounded-3xl surface">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-90" style={{ background: typeGradient(types, 0.4) }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at 30% 40%, black, transparent 70%)",
        }}
      />
      <div className="relative grid gap-6 p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center md:gap-10">
        {/* Artwork */}
        <div className="relative mx-auto aspect-square w-full max-w-[420px]">
          <div
            aria-hidden
            className="absolute inset-[12%] rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${TYPE_COLORS[types[0] ?? "normal"]}66, transparent 70%)` }}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={`${shiny}-${artwork.candidates[0]}`}
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative size-full animate-float"
            >
              <PokemonImage
                candidates={artwork.candidates}
                alt={`${props.name}${shiny ? " shiny" : ""}`}
                size={475}
                priority
                sizes="(max-width: 768px) 90vw, 420px"
                className="size-full drop-shadow-[0_24px_40px_rgba(0,0,0,0.55)]"
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-background/70 p-1 backdrop-blur">
            <button
              type="button"
              onClick={() => setShiny(false)}
              aria-pressed={!shiny}
              className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", !shiny ? "bg-white/10 text-foreground" : "text-muted-foreground")}
            >
              {t.common.normal}
            </button>
            <button
              type="button"
              onClick={() => setShiny(true)}
              aria-pressed={shiny}
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                shiny ? "bg-amber-300/15 text-amber-200" : "text-muted-foreground",
              )}
            >
              <Sparkles className="size-3" />
              {t.common.shiny}
            </button>
          </div>
        </div>

        {/* Información */}
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-mono tabular text-foreground/80">{formatDexNumber(props.dex)}</span>
            <span>·</span>
            <span>{generationLabel(props.introducedIn)}</span>
            {props.badges.map((b) => (
              <span key={b} className="rounded-full border border-border px-2 py-0.5 text-xs">
                {b}
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-end gap-3">
            <h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl">{props.name}</h1>
            <FavoriteButton slug={props.slug} name={props.name} className="mb-1.5" />
            {props.cry && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={playCry} aria-label={t.pokemon.cry} className="mb-1.5">
                    <Volume2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t.pokemon.cry}</TooltipContent>
              </Tooltip>
            )}
          </div>
          {(props.genus || props.nameEn !== props.name) && (
            <p className="mt-1 text-muted-foreground">
              {props.genus}
              {props.genus && props.nameEn !== props.name && " · "}
              {props.nameEn !== props.name && <span lang="en">{props.nameEn}</span>}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {types.map((type) => (
              <TypeBadge key={type} type={type} size="lg" />
            ))}
            {typesChanged && (
              <span className="text-xs text-muted-foreground">{t.pokemon.typesChanged(generationLabel(effectiveGen))}</span>
            )}
          </div>

          {/* Respuesta clave en menos de cinco segundos */}
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-4">
            <p className="text-sm font-medium text-red-100 sm:text-base">{summary}</p>
            {profile.immune.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t.multipliers["0"]}: {profile.immune.map((x) => typeLabel(x)).join(", ")}
              </p>
            )}
          </div>

          {!existsInGen && (
            <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
              {t.pokemon.notInGen(props.name, generationLabel(gen))}
            </p>
          )}

          {props.flavor && <p className="mt-5 max-w-prose leading-relaxed text-foreground/85">{props.flavor}</p>}

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Fact label={t.pokemon.height} value={formatHeight(props.height)} />
            <Fact label={t.pokemon.weight} value={formatWeight(props.weight)} />
            <div className="col-span-2 rounded-xl border border-border bg-background/40 p-3 sm:col-span-1">
              <dt className="text-xs text-muted-foreground">{t.pokemon.abilities}</dt>
              <dd className="mt-1 flex flex-col gap-0.5 text-sm">
                {props.abilities.map((a) => (
                  <Tooltip key={a.slug}>
                    <TooltipTrigger asChild>
                      <span className="w-fit cursor-help underline decoration-dotted decoration-white/30 underline-offset-4">
                        {a.name}
                        {a.hidden && <span className="ml-1.5 text-xs text-primary">({t.pokemon.hiddenAbility})</span>}
                      </span>
                    </TooltipTrigger>
                    {a.description && <TooltipContent className="max-w-xs">{a.description}</TooltipContent>}
                  </Tooltip>
                ))}
              </dd>
            </div>
          </dl>
          {shiny && artwork.shinyUnavailable && <p className="mt-3 text-xs text-muted-foreground">{t.pokemon.shinyUnavailable}</p>}
        </div>
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-sm tabular">{value}</dd>
    </div>
  );
}
