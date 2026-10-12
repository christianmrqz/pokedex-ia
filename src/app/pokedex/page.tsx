import type { Metadata } from "next";
import { PokedexExplorer } from "@/components/pokedex/pokedex-explorer";
import { getDictionary } from "@/i18n";
import { ABILITIES } from "@/lib/data/catalog";
import { POKEMON } from "@/lib/data/pokedex";

const t = getDictionary();

export const metadata: Metadata = {
  title: "Pokédex",
  description: "Explora todos los Pokémon y sus formas: filtra por tipo, generación, habilidad y estadísticas base.",
};

export default function PokedexPage() {
  // Solo se envían al navegador los nombres de las habilidades, no sus descripciones.
  const abilityNames = Object.fromEntries(Object.entries(ABILITIES).map(([slug, a]) => [slug, a.es]));
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">{t.explorer.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.explorer.subtitle(POKEMON.length)}</p>
      </header>
      <PokedexExplorer abilityNames={abilityNames} />
    </div>
  );
}
