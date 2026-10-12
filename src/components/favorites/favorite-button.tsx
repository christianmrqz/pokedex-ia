"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFavorites } from "./use-favorites";

export function FavoriteButton({ slug, name, className }: { slug: string; name: string; className?: string }) {
  const { isFavorite, toggle } = useFavorites();
  const on = isFavorite(slug);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => toggle(slug)}
      aria-pressed={on}
      aria-label={on ? `Quitar ${name} de favoritos` : `Añadir ${name} a favoritos`}
      className={className}
    >
      <Star className={cn(on && "fill-amber-300 text-amber-300")} />
    </Button>
  );
}
