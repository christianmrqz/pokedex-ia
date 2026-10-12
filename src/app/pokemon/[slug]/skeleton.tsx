import { Skeleton } from "@/components/ui/skeleton";

export function PokemonPageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando ficha">
      <div className="grid gap-6 rounded-3xl surface p-5 sm:p-8 md:grid-cols-2">
        <Skeleton className="mx-auto aspect-square w-full max-w-[420px] rounded-full" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-12 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-3xl" />
      <Skeleton className="h-72 w-full rounded-3xl" />
    </div>
  );
}
