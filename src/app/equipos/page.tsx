import type { Metadata } from "next";
import { TeamBuilder } from "@/components/team/team-builder";
import { ABILITIES } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Constructor de equipos",
  description: "Crea equipos de hasta seis Pokémon y analiza sus debilidades compartidas, su cobertura ofensiva y su velocidad.",
};

export default function TeamsPage() {
  const abilityNames = Object.fromEntries(Object.entries(ABILITIES).map(([slug, a]) => [slug, a.es]));
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Constructor de equipos</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Hasta seis Pokémon con su naturaleza, habilidad, objeto, movimientos, IV y EV. El análisis usa la generación elegida en la cabecera.
        </p>
      </header>
      <TeamBuilder abilityNames={abilityNames} />
    </div>
  );
}
