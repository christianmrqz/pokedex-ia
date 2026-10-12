"use client";

import { Button } from "@/components/ui/button";

export default function PokemonError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">No se pudo cargar la ficha</h1>
      <p className="mt-3 text-muted-foreground">Ha ocurrido un error al obtener los datos. Inténtalo de nuevo en unos segundos.</p>
      <Button className="mt-6" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
