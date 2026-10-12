import type { Metadata } from "next";
import { Suspense } from "react";
import { StatCalculatorStandalone } from "@/components/calc/stat-calculator-standalone";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Calculadora de estadísticas",
  description: "Calcula las estadísticas reales de cualquier Pokémon con IV, EV, naturaleza y nivel, usando las fórmulas oficiales de cada generación.",
};

export default function StatCalculatorPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Calculadora de estadísticas</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Estadísticas reales con las fórmulas oficiales de cada generación. Usa el selector de juego de la cabecera para cambiar de generación.
        </p>
      </header>
      <Suspense fallback={<Skeleton className="h-[32rem] rounded-3xl" />}>
        <StatCalculatorStandalone />
      </Suspense>
    </div>
  );
}
