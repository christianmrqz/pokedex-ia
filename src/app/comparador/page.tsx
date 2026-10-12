import type { Metadata } from "next";
import { Suspense } from "react";
import { Comparator } from "@/components/compare/comparator";
import { Skeleton } from "@/components/ui/skeleton";
import { ABILITIES } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Comparador",
  description: "Compara dos Pokémon: estadísticas base y reales, tipos, velocidad, debilidades y movimientos destacados.",
};

export default function ComparatorPage() {
  const abilityNames = Object.fromEntries(Object.entries(ABILITIES).map(([slug, a]) => [slug, a.es]));
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Comparador</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Dos Pokémon cara a cara, con los datos de la generación elegida en la cabecera.</p>
      </header>
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-3xl" />}>
        <Comparator abilityNames={abilityNames} />
      </Suspense>
    </div>
  );
}
