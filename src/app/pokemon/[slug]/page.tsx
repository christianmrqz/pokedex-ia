import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AskButton } from "@/components/assistant/ask-button";
import { EvolutionChain } from "@/components/pokemon/evolution-chain";
import { FormsStrip } from "@/components/pokemon/forms-strip";
import { MovesPanel } from "@/components/pokemon/moves-panel";
import { PokemonHero } from "@/components/pokemon/pokemon-hero";
import { SectionNav } from "@/components/pokemon/section-nav";
import { StatsPanel } from "@/components/pokemon/stats-panel";
import { StatCalculator } from "@/components/calc/stat-calculator";
import { Section } from "@/components/pokemon/section";
import { Calculator } from "lucide-react";
import { StrategyPanel } from "@/components/pokemon/strategy-panel";
import { WeaknessPanel } from "@/components/pokemon/weakness-panel";
import { Skeleton } from "@/components/ui/skeleton";
import itemNames from "@/data/generated/items.json";
import { getDictionary } from "@/i18n";
import { abilityName } from "@/lib/data/catalog";
import { getVersionGroup } from "@/lib/data/games";
import { getVarieties, resolvePokemon } from "@/lib/data/pokedex";
import { versionGroupsWithData } from "@/lib/engine/learnset";
import { defensiveProfile, typeLabel } from "@/lib/engine/type-chart";
import { getEvolutionChain, getPokemonDetail, getSpeciesDetail } from "@/lib/pokeapi/services";
import type { PokemonDetail, SpeciesDetail } from "@/lib/pokeapi/transform";
import { buildAbilities, buildMoveSubset, buildStrategyByGen } from "@/lib/pokemon/view-models";
import { formatDexNumber } from "@/lib/ui/format";
import { PokemonPageSkeleton } from "./skeleton";

const t = getDictionary();

/** Algunas fichas se prerenderizan en la build; el resto se genera y cachea en la primera visita. */
export function generateStaticParams() {
  return ["drapion", "garchomp", "charizard", "pikachu", "gengar", "dragonite"].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/pokemon/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const entry = resolvePokemon(slug);
  if (!entry) return { title: "Pokémon no encontrado" };
  const profile = defensiveProfile(entry.types, 9);
  const weak = [...profile.quad, ...profile.double].map((x) => typeLabel(x)).join(", ");
  return {
    title: `${entry.es} ${formatDexNumber(entry.speciesId)}`,
    description: `${entry.es}: tipos ${entry.types.map((x) => typeLabel(x)).join("/")}, debilidades (${weak || "ninguna"}), estadísticas, movimientos por juego y cómo derrotarlo.`,
    alternates: { canonical: `/pokemon/${entry.slug}` },
    openGraph: { images: [{ url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${entry.id}.png`, width: 475, height: 475, alt: entry.es }] },
  };
}

export default function PokemonPage(props: PageProps<"/pokemon/[slug]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <Suspense fallback={<PokemonPageSkeleton />}>
        <PokemonContent params={props.params} />
      </Suspense>
    </div>
  );
}

const ADVANCED_LABEL_ITEMS: Record<string, string> = { "air-balloon": "Air Balloon", "iron-ball": "Iron Ball", "ring-target": "Ring Target" };
const ADVANCED_LABEL_ABILITIES = ["scrappy", "minds-eye", "tinted-lens", "mold-breaker"];

async function PokemonContent({ params }: { params: PageProps<"/pokemon/[slug]">["params"] }) {
  const { slug } = await params;
  const entry = resolvePokemon(slug);
  if (!entry) notFound();
  if (entry.slug !== slug) redirect(`/pokemon/${entry.slug}`);

  // La ficha sigue siendo útil aunque PokéAPI falle: lo esencial viene del índice local.
  let detail: PokemonDetail | null = null;
  let species: SpeciesDetail | null = null;
  let apiError = false;
  const [d, s] = await Promise.allSettled([getPokemonDetail(entry.slug), getSpeciesDetail(entry.speciesId)]);
  if (d.status === "fulfilled") detail = d.value;
  else apiError = true;
  if (s.status === "fulfilled") species = s.value;
  else apiError = true;

  const abilities = buildAbilities(entry, detail?.abilities);
  const labels: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(ADVANCED_LABEL_ITEMS).map(([slug, smogonName]) => [slug, (itemNames as Record<string, string | null>)[smogonName] ?? smogonName]),
    ),
    ...Object.fromEntries(ADVANCED_LABEL_ABILITIES.map((a) => [a, abilityName(a)])),
  };
  const learnset = detail?.learnset ?? [];
  const versionGroups = [...versionGroupsWithData(learnset)]
    .filter((vg) => getVersionGroup(vg))
    .sort((a, b) => getVersionGroup(a)!.order - getVersionGroup(b)!.order);
  const badges = [
    entry.legendary && "Legendario",
    entry.mythical && "Singular",
    entry.kind === "mega" && "Megaevolución",
    entry.kind === "gmax" && "Gigamax",
    entry.kind === "regional" && "Forma regional",
  ].filter((b): b is string => !!b);

  const links = [
    { id: "resumen", label: t.pokemon.sections.summary },
    { id: "debilidades", label: t.pokemon.sections.weaknesses },
    { id: "estadisticas", label: t.pokemon.sections.stats },
    { id: "estrategia", label: t.pokemon.sections.strategy },
    { id: "calculadora", label: "Calculadora" },
    { id: "movimientos", label: t.pokemon.sections.moves },
    { id: "evoluciones", label: t.pokemon.sections.evolutions },
    ...(getVarieties(entry.speciesId).length > 1 ? [{ id: "formas", label: t.pokemon.sections.forms }] : []),
  ];

  return (
    <div className="space-y-5">
      {apiError && (
        <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          No se ha podido contactar con PokéAPI. Se muestran los datos del índice local; los movimientos, la descripción y la cadena evolutiva no
          están disponibles ahora mismo. Recarga la página para reintentar.
        </p>
      )}
      <PokemonHero
        id={entry.id}
        slug={entry.slug}
        dex={entry.speciesId}
        name={entry.es}
        nameEn={entry.en}
        genus={species?.genus.es ?? null}
        flavor={species?.flavor.es ?? species?.flavor.en ?? null}
        types={entry.types}
        pastTypes={entry.pastTypes}
        introducedIn={entry.gen}
        sprites={detail?.sprites ?? null}
        cry={detail?.cry ?? null}
        height={entry.height}
        weight={entry.weight}
        abilities={abilities}
        badges={badges}
      />
      <SectionNav links={links} />
      <WeaknessPanel
        name={entry.es}
        types={entry.types}
        pastTypes={entry.pastTypes}
        introducedIn={entry.gen}
        abilities={abilities.map(({ slug, name, hidden }) => ({ slug, name, hidden }))}
        labels={labels}
      />
      <StatsPanel stats={entry.stats} statHistory={entry.statHistory} evYield={detail?.evYield ?? null} introducedIn={entry.gen} />
      <StrategyPanel name={entry.es} byGen={buildStrategyByGen(entry)} introducedIn={entry.gen} />
      <Section id="calculadora" title="Calculadora de estadísticas" icon={<Calculator />} description="IV, EV, naturaleza y nivel con las fórmulas oficiales">
        <StatCalculator pokemon={entry} />
      </Section>
      {detail ? (
        <MovesPanel learnset={learnset} moves={buildMoveSubset(learnset)} versionGroups={versionGroups} />
      ) : null}
      {species?.evolutionChainId ? (
        <Suspense fallback={<Skeleton className="h-48 rounded-3xl" />}>
          <EvolutionLoader chainId={species.evolutionChainId} speciesId={entry.speciesId} />
        </Suspense>
      ) : (
        species && <EvolutionChain chain={null} currentSpeciesId={entry.speciesId} />
      )}
      <FormsStrip varieties={getVarieties(entry.speciesId)} currentSlug={entry.slug} />
      <AskButton slug={entry.slug} name={entry.es} />
    </div>
  );
}

async function EvolutionLoader({ chainId, speciesId }: { chainId: number; speciesId: number }) {
  const chain = await getEvolutionChain(chainId).catch(() => null);
  return <EvolutionChain chain={chain} currentSpeciesId={speciesId} />;
}
