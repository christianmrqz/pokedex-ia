import type { Metadata } from "next";
import { Suspense } from "react";
import { DamageCalculator } from "@/components/calc/damage-calculator";
import { Skeleton } from "@/components/ui/skeleton";
import { ABILITIES } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Calculadora de daño",
  description: "Daño real entre dos Pokémon con el motor de Pokémon Showdown: rangos, porcentaje de PS y probabilidad de KO.",
};

export default function DamagePage() {
  const abilityNames = Object.fromEntries(Object.entries(ABILITIES).map(([slug, a]) => [slug, a.es]));
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Calculadora de daño</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Mismas mecánicas que Pokémon Showdown. Solo se ofrecen movimientos que el atacante puede aprender en el juego seleccionado.
        </p>
      </header>
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-3xl" />}>
        <DamageCalculator abilityNames={abilityNames} />
      </Suspense>
    </div>
  );
}
