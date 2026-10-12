/**
 * Cálculo de estadísticas reales con las fórmulas oficiales de cada generación.
 *
 * Gen 3+:
 *   PS    = ⌊(2·Base + IV + ⌊EV/4⌋) · Nv / 100⌋ + Nv + 10
 *   Resto = ⌊(⌊(2·Base + IV + ⌊EV/4⌋) · Nv / 100⌋ + 5) · Naturaleza⌋
 * Gen 1-2 (DV 0-15 y experiencia de estadística 0-65535):
 *   PS    = ⌊((Base + DV)·2 + ⌊⌈√ExpE⌉/4⌋) · Nv / 100⌋ + Nv + 10
 *   Resto = ⌊((Base + DV)·2 + ⌊⌈√ExpE⌉/4⌋) · Nv / 100⌋ + 5
 *   El DV de PS se deriva de los demás: bit bajo de Ataque·8 + Defensa·4 + Velocidad·2 + Especial.
 * Shedinja siempre tiene 1 PS.
 */
import { STAT_KEYS, type Generation, type NatureEntry, type PokeApiStatName, type StatKey, type StatTuple } from "@/lib/domain";

const POKEAPI_TO_KEY: Record<PokeApiStatName, StatKey> = {
  hp: "hp",
  attack: "atk",
  defense: "def",
  "special-attack": "spa",
  "special-defense": "spd",
  speed: "spe",
};

/** Multiplicadores de naturaleza por estadística (PS siempre 1). */
export function natureMultipliers(nature: Pick<NatureEntry, "up" | "down"> | null | undefined): StatTuple {
  const out: StatTuple = [1, 1, 1, 1, 1, 1];
  if (!nature?.up || !nature.down) return out;
  out[STAT_KEYS.indexOf(POKEAPI_TO_KEY[nature.up])] = 1.1;
  out[STAT_KEYS.indexOf(POKEAPI_TO_KEY[nature.down])] = 0.9;
  return out;
}

export interface EvRules {
  /** Máximo por estadística. */
  perStat: number;
  /** Máximo total (null = sin límite total, Gen 1-2). */
  total: number | null;
  /** Máximo de IV (31) o DV (15). */
  maxIv: number;
  hasNatures: boolean;
}

export function evRules(gen: Generation): EvRules {
  if (gen <= 2) return { perStat: 65535, total: null, maxIv: 15, hasNatures: false };
  // Gen 3-5 permiten 255 por estadística; desde Gen 6 el máximo es 252.
  return { perStat: gen >= 6 ? 252 : 255, total: 510, maxIv: 31, hasNatures: true };
}

/** DV de PS en Gen 1-2 a partir de los DV de Ataque, Defensa, Velocidad y Especial. */
export function hpDvFromOthers(atk: number, def: number, spe: number, spc: number): number {
  return (atk & 1) * 8 + (def & 1) * 4 + (spe & 1) * 2 + (spc & 1);
}

export interface StatCalcInput {
  gen: Generation;
  base: StatTuple;
  level: number;
  /** IV (Gen 3+) o DV (Gen 1-2). En Gen 1-2 el valor de PS se ignora y se deriva. */
  ivs: StatTuple;
  /** EV (Gen 3+) o experiencia de estadística (Gen 1-2). */
  evs: StatTuple;
  nature?: Pick<NatureEntry, "up" | "down"> | null;
  /** Shedinja tiene siempre 1 PS. */
  isShedinja?: boolean;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.floor(n)));

export function calcStats(input: StatCalcInput): StatTuple {
  const { gen, base } = input;
  const level = clamp(input.level, 1, 100);
  const rules = evRules(gen);
  const ivs = input.ivs.map((v) => clamp(v, 0, rules.maxIv)) as StatTuple;
  const evs = input.evs.map((v) => clamp(v, 0, rules.perStat)) as StatTuple;

  if (gen <= 2) {
    // En Gen 1-2 Ataque Esp. y Defensa Esp. comparten DV y experiencia (la estadística Especial).
    const spcDv = ivs[3];
    const spcExp = evs[3];
    const dvs: StatTuple = [hpDvFromOthers(ivs[1], ivs[2], ivs[5], spcDv), ivs[1], ivs[2], spcDv, spcDv, ivs[5]];
    const exps: StatTuple = [evs[0], evs[1], evs[2], spcExp, spcExp, evs[5]];
    return STAT_KEYS.map((key, i) => {
      if (key === "hp" && input.isShedinja) return 1;
      const expBonus = Math.floor(Math.ceil(Math.sqrt(exps[i])) / 4);
      const core = Math.floor((((base[i] + dvs[i]) * 2 + expBonus) * level) / 100);
      return key === "hp" ? core + level + 10 : core + 5;
    }) as StatTuple;
  }

  const nature = natureMultipliers(input.nature);
  return STAT_KEYS.map((key, i) => {
    if (key === "hp" && input.isShedinja) return 1;
    const core = Math.floor(((2 * base[i] + ivs[i] + Math.floor(evs[i] / 4)) * level) / 100);
    return key === "hp" ? core + level + 10 : Math.floor((core + 5) * nature[i]);
  }) as StatTuple;
}

/** Comprueba un reparto de EV para la generación; devuelve los problemas encontrados. */
export function validateEvs(evs: StatTuple, gen: Generation): string[] {
  const rules = evRules(gen);
  const problems: string[] = [];
  if (evs.some((v) => v > rules.perStat)) problems.push(`Máximo ${rules.perStat} por estadística`);
  const total = evs.reduce((a, b) => a + b, 0);
  if (rules.total !== null && total > rules.total) problems.push(`Máximo ${rules.total} en total (ahora ${total})`);
  return problems;
}
