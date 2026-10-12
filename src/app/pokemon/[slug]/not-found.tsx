import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PokemonNotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="font-mono text-sm text-primary">404</p>
      <h1 className="mt-2 text-3xl font-bold">No encontramos ese Pokémon</h1>
      <p className="mt-3 text-muted-foreground">
        Comprueba el nombre o el número de Pokédex. Puedes buscar con Ctrl + K o explorar la Pokédex completa.
      </p>
      <Button asChild className="mt-6">
        <Link href="/pokedex">Explorar la Pokédex</Link>
      </Button>
    </div>
  );
}
