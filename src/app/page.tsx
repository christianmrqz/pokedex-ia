import { ArrowUpRight, BookOpen, Calculator, Scale, Shield, Sparkles, Swords, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { FavoritesStrip } from "@/components/favorites/favorites-strip";
import { FeaturedPokemon } from "@/components/home/featured-pokemon";
import { HeroSearch } from "@/components/search/hero-search";
import { Skeleton } from "@/components/ui/skeleton";
import { NATIONAL_DEX_SIZE, POKEMON } from "@/lib/data/pokedex";
import { cn } from "@/lib/utils";

const QUICK_PICKS = ["drapion", "garchomp", "gyarados", "charizard", "gengar", "tyranitar", "dragonite", "lucario"];

interface Tool {
  href: string;
  title: string;
  description: string;
  icon: typeof BookOpen;
  /** Funcionalidad aún no disponible. */
  soon?: boolean;
}

const TOOLS: Tool[] = [
  {
    href: "/pokedex",
    title: "Explorador de Pokédex",
    description: "Filtra por tipo, generación, habilidad y estadísticas.",
    icon: BookOpen,
  },
  {
    href: "/tipos",
    title: "Calculadora de tipos",
    description: "Multiplicadores exactos de cualquier combinación, en cada generación.",
    icon: Shield,
  },
  { href: "/calculadora/estadisticas", title: "Calculadora de estadísticas", description: "IV, EV, naturaleza y nivel con las fórmulas oficiales.", icon: Calculator },
  { href: "/calculadora/dano", title: "Calculadora de daño", description: "Daño real con el motor de Pokémon Showdown.", icon: Swords },
  { href: "/comparador", title: "Comparador", description: "Dos Pokémon cara a cara: estadísticas, tipos y velocidad.", icon: Scale },
  { href: "/asistente", title: "Asistente inteligente", description: "Pregunta en lenguaje natural con datos verificados.", icon: Sparkles },
  { href: "/equipos", title: "Constructor de equipos", description: "Hasta seis Pokémon con análisis de cobertura y debilidades.", icon: Users },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <section className="relative flex flex-col items-center pt-14 pb-12 text-center sm:pt-24 sm:pb-16">
        <p className="rounded-full border border-border bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
          {NATIONAL_DEX_SIZE} especies · {POKEMON.length} formas · Gen I–IX
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl font-bold text-balance sm:text-6xl">
          Entiende cualquier combate <span className="bg-gradient-to-r from-primary to-violet-300 bg-clip-text text-transparent">en segundos</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
          Escribe el Pokémon de tu rival y descubre al instante sus debilidades exactas, sus estadísticas y cómo derrotarlo. Datos reales de PokéAPI,
          cálculos verificables.
        </p>
        <div className="mt-8 w-full max-w-2xl">
          <HeroSearch />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {QUICK_PICKS.map((slug) => {
            const p = POKEMON.find((x) => x.slug === slug);
            return p ? (
              <Link
                key={slug}
                href={`/pokemon/${slug}`}
                className="rounded-full border border-border bg-white/[0.03] px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {p.es}
              </Link>
            ) : null;
          })}
        </div>
      </section>

      <Suspense fallback={<Skeleton className="h-72 rounded-3xl" />}>
        <FeaturedPokemon />
      </Suspense>

      <FavoritesStrip />

      <section className="mt-12" aria-labelledby="tools-title">
        <h2 id="tools-title" className="mb-5 text-2xl font-semibold">
          Herramientas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const content = (
              <>
                <div className="flex items-start justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <tool.icon className="size-5" />
                  </span>
                  {tool.soon ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">Próximamente</span>
                  ) : (
                    <ArrowUpRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                  )}
                </div>
                <h3 className="mt-4 font-semibold">{tool.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
              </>
            );
            return tool.soon ? (
              <div key={tool.href} className="rounded-2xl surface p-5 opacity-60">
                {content}
              </div>
            ) : (
              <Link key={tool.href} href={tool.href} className={cn("group rounded-2xl surface p-5 transition-colors hover:border-primary/30")}>
                {content}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
