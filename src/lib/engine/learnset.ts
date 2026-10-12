/**
 * Movimientos aprendibles por juego.
 *
 * Se basa exclusivamente en `version_group_details` de PokéAPI: un movimiento solo se
 * considera aprendible en un juego si existe un detalle para ese grupo de versiones.
 */
import type { MoveCategory, MoveEntry, TypeName } from "@/lib/domain";

/** Tipos cuyos movimientos de daño eran especiales antes de la división física/especial (Gen 4). */
const SPECIAL_TYPES_GEN1_3: TypeName[] = ["fire", "water", "grass", "electric", "psychic", "ice", "dragon", "dark"];

/**
 * Categoría efectiva de un movimiento en una generación. Hasta la Gen 3, la categoría de
 * los movimientos de daño dependía de su tipo, no del movimiento.
 */
export function moveCategoryForGen(category: MoveCategory, type: TypeName, gen: number): MoveCategory {
  if (category === "status" || gen >= 4) return category;
  return SPECIAL_TYPES_GEN1_3.includes(type) ? "special" : "physical";
}

export interface LearnDetail {
  /** Slug del grupo de versiones (p. ej. "scarlet-violet"). */
  vg: string;
  /** Método: level-up, machine, egg, tutor… */
  method: string;
  /** Nivel de aprendizaje (0 si no aplica). */
  level: number;
}

export interface LearnsetEntry {
  move: string;
  details: LearnDetail[];
}

export type Learnset = LearnsetEntry[];

export interface LearnableMove {
  move: string;
  method: string;
  level: number;
}

/** Grupos de versiones para los que hay datos de movimientos, sin repetir. */
export function versionGroupsWithData(learnset: Learnset): Set<string> {
  const out = new Set<string>();
  for (const entry of learnset) for (const d of entry.details) out.add(d.vg);
  return out;
}

/** Movimientos aprendibles en un juego concreto (una fila por método de aprendizaje). */
export function movesForVersionGroup(learnset: Learnset, vg: string): LearnableMove[] {
  const rows: LearnableMove[] = [];
  for (const entry of learnset) {
    const seen = new Set<string>();
    for (const d of entry.details) {
      if (d.vg !== vg) continue;
      const key = `${d.method}:${d.level}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ move: entry.move, method: d.method, level: d.level });
    }
  }
  return rows.sort((a, b) => {
    if (a.method !== b.method) return methodOrder(a.method) - methodOrder(b.method);
    if (a.level !== b.level) return a.level - b.level;
    return a.move.localeCompare(b.move);
  });
}

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];
function methodOrder(method: string): number {
  const i = METHOD_ORDER.indexOf(method);
  return i === -1 ? METHOD_ORDER.length : i;
}

/** ¿Puede aprender este movimiento en este juego? */
export function canLearn(learnset: Learnset, move: string, vg: string): boolean {
  return learnset.some((e) => e.move === move && e.details.some((d) => d.vg === vg));
}

export interface MoveValues {
  type: TypeName;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  chance: number | null;
}

/**
 * Valores de un movimiento en un juego, aplicando su historial de cambios.
 * Cada cambio de PokéAPI indica el valor vigente ANTES del grupo de versiones listado;
 * por cada campo se toma el primer cambio posterior al juego consultado.
 */
export function moveValuesForVersionGroup(move: MoveEntry, vgOrder: number): MoveValues {
  const values: MoveValues = {
    type: move.type,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    chance: move.chance ?? null,
  };
  const later = (move.changes ?? []).filter((c) => c.beforeVgOrder > vgOrder).sort((a, b) => a.beforeVgOrder - b.beforeVgOrder);
  const firstWith = <K extends "power" | "accuracy" | "pp" | "chance" | "type">(key: K) => later.find((c) => c[key] !== undefined)?.[key];
  const type = firstWith("type");
  const power = firstWith("power");
  const accuracy = firstWith("accuracy");
  const pp = firstWith("pp");
  const chance = firstWith("chance");
  if (type !== undefined) values.type = type;
  if (power !== undefined) values.power = power;
  if (accuracy !== undefined) values.accuracy = accuracy;
  if (pp !== undefined) values.pp = pp;
  if (chance !== undefined) values.chance = chance;
  return values;
}
