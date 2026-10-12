/**
 * Catálogos pesados generados desde PokéAPI: movimientos y habilidades.
 * Pensados para el servidor; a los componentes cliente se les pasa solo lo necesario.
 */
import abilitiesData from "@/data/generated/abilities.json";
import movesData from "@/data/generated/moves.json";
import type { AbilityEntry, MoveEntry } from "@/lib/domain";
import { prettifySlug } from "./games";

export const MOVES = movesData as unknown as Record<string, MoveEntry>;
export const ABILITIES = abilitiesData as Record<string, AbilityEntry>;

export function getMove(slug: string): MoveEntry | undefined {
  return MOVES[slug];
}

export function getAbility(slug: string): AbilityEntry | undefined {
  return ABILITIES[slug];
}

/** Nombre legible de una habilidad; si no está en el catálogo se formatea el slug. */
export function abilityName(slug: string, locale: "es" | "en" = "es"): string {
  return ABILITIES[slug]?.[locale] ?? prettifySlug(slug);
}

export function moveName(slug: string, locale: "es" | "en" = "es"): string {
  return MOVES[slug]?.[locale] ?? prettifySlug(slug);
}
