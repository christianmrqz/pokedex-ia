/** Modelo de equipo guardado en el navegador. */
import type { StatTuple, TypeName } from "@/lib/domain";

export interface TeamMember {
  slug: string;
  level: number;
  nature: string;
  ability: string | null;
  /** Nombre de objeto de @smogon/calc. */
  item: string | null;
  /** Hasta cuatro slugs de movimientos de PokéAPI. */
  moves: string[];
  evs: StatTuple;
  ivs: StatTuple;
  teraType: TypeName | null;
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  updatedAt: number;
}

export const MAX_TEAM_SIZE = 6;

export function newMember(slug: string, ability: string | null): TeamMember {
  return {
    slug,
    level: 50,
    nature: "hardy",
    ability,
    item: null,
    moves: [],
    evs: [0, 0, 0, 0, 0, 0],
    ivs: [31, 31, 31, 31, 31, 31],
    teraType: null,
  };
}

/** Valida un equipo leído del almacenamiento (puede estar corrupto o ser de otra versión). */
export function isTeam(value: unknown): value is Team {
  if (!value || typeof value !== "object") return false;
  const t = value as Team;
  return (
    typeof t.id === "string" &&
    typeof t.name === "string" &&
    Array.isArray(t.members) &&
    t.members.length <= MAX_TEAM_SIZE &&
    t.members.every((m) => typeof m.slug === "string" && Array.isArray(m.moves) && Array.isArray(m.evs) && m.evs.length === 6)
  );
}
