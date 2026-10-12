import type { Metadata } from "next";
import { TypeCalculator } from "@/components/types/type-calculator";
import { getDictionary } from "@/i18n";
import { POKEMON } from "@/lib/data/pokedex";

const t = getDictionary();

export const metadata: Metadata = {
  title: "Calculadora de tipos",
  description: "Multiplicadores de daño exactos para cualquier combinación de tipos, con la tabla de cada generación.",
};

export default function TypesPage() {
  const examples = POKEMON.filter((p) => p.isDefault).map((p) => ({ slug: p.slug, name: p.es, types: p.types }));
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">{t.types.title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t.types.subtitle}</p>
      </header>
      <TypeCalculator examples={examples} />
      <p className="mt-6 text-xs text-muted-foreground">Fuente: tabla de eficacia de tipos de PokéAPI, incluidos sus valores históricos (Gen I y Gen II–V).</p>
    </div>
  );
}
