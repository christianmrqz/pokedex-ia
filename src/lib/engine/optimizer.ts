/**
 * Recomendaciones deterministas de EV, IV y naturaleza según un objetivo.
 * Las reglas son las habituales en el juego competitivo y cada decisión lleva su motivo.
 */
import type { Generation, StatTuple } from "@/lib/domain";
import { evRules } from "./stats";

export type Objective =
  | "physical-attacker"
  | "special-attacker"
  | "max-speed"
  | "physical-wall"
  | "special-wall"
  | "balanced"
  | "trick-room";

export const OBJECTIVES: Objective[] = [
  "physical-attacker",
  "special-attacker",
  "max-speed",
  "physical-wall",
  "special-wall",
  "balanced",
  "trick-room",
];

export interface SpreadRecommendation {
  evs: StatTuple;
  ivs: StatTuple;
  /** Slug de naturaleza (PokéAPI) o null en Gen 1-2. */
  nature: string | null;
  /** Naturaleza alternativa razonable. */
  altNature?: string | null;
  reasons: string[];
}

const MAX = (gen: Generation) => (gen >= 3 ? 252 : 65535);

/**
 * @param base estadísticas base del Pokémon en la generación elegida
 */
export function recommendSpread(objective: Objective, base: StatTuple, gen: Generation, opts: { isShedinja?: boolean } = {}): SpreadRecommendation {
  const rules = evRules(gen);
  const max = MAX(gen);
  const iv = rules.maxIv;
  const ivs: StatTuple = [iv, iv, iv, iv, iv, iv];
  const reasons: string[] = [];
  const [, atk, def, spa, spd, spe] = base;
  const physical = atk >= spa;

  if (gen <= 2) {
    // Sin naturalezas ni límite total: lo óptimo es maximizar todo, salvo Velocidad en Espacio Raro.
    const evs: StatTuple = [max, max, max, max, max, max];
    reasons.push("En Gen 1-2 no hay límite total de experiencia de estadística: se maximiza todo con combates o vitaminas.");
    reasons.push("Tampoco existen las naturalezas; los DV van de 0 a 15 y el DV de PS se deriva de los demás.");
    if (objective === "trick-room") {
      evs[5] = 0;
      ivs[5] = 0;
      reasons.push("Para Espacio Raro (Gen 2) se deja la Velocidad al mínimo: DV 0 y sin experiencia.");
    }
    return { evs, ivs, nature: null, reasons };
  }

  let evs: StatTuple = [0, 0, 0, 0, 0, 0];
  let nature: string;
  let altNature: string | null = null;
  const leftover = 510 - 2 * 252; // 6 EV sobrantes: 4 útiles (cada 4 EV = 1 punto a Nv 100)

  switch (objective) {
    case "physical-attacker":
      evs = [leftover - 2, 252, 0, 0, 0, 252];
      nature = "jolly";
      altNature = "adamant";
      reasons.push("252 EV en Ataque y Velocidad para golpear fuerte y antes; los 4 restantes a PS.");
      reasons.push("Alegre (+Vel, −At. Esp.) si necesitas superar a rivales concretos; Firme (+At, −At. Esp.) si prefieres más daño.");
      reasons.push("Se reduce el Ataque Especial porque un atacante físico no lo usa.");
      break;
    case "special-attacker":
      evs = [leftover - 2, 0, 0, 252, 0, 252];
      nature = "timid";
      altNature = "modest";
      ivs[1] = 0;
      reasons.push("252 EV en Ataque Especial y Velocidad; los 4 restantes a PS.");
      reasons.push("Miedosa (+Vel, −At) o Modesta (+At. Esp., −At).");
      reasons.push("IV 0 en Ataque: reduce el daño de la confusión y de Juego Sucio, que usa tu propio Ataque.");
      break;
    case "max-speed":
      evs = physical ? [leftover - 2, 252, 0, 0, 0, 252] : [leftover - 2, 0, 0, 252, 0, 252];
      nature = physical ? "jolly" : "timid";
      if (!physical) ivs[1] = 0;
      reasons.push("Velocidad al máximo con naturaleza que la aumenta y el resto en tu mejor estadística ofensiva.");
      reasons.push(`Tu Ataque base (${atk}) frente a tu At. Esp. base (${spa}) indica un perfil ${physical ? "físico" : "especial"}.`);
      break;
    case "physical-wall":
      evs = [252, 0, 252, 0, leftover - 2, 0];
      nature = physical ? "impish" : "bold";
      if (!physical) ivs[1] = 0;
      reasons.push("252 EV en PS y Defensa para aguantar golpes físicos; los 4 restantes a Def. Esp.");
      reasons.push(`${physical ? "Agitada (+Def, −At. Esp.)" : "Osada (+Def, −At)"}: se reduce la estadística ofensiva que no usas.`);
      break;
    case "special-wall":
      evs = [252, 0, leftover - 2, 0, 252, 0];
      nature = physical ? "careful" : "calm";
      if (!physical) ivs[1] = 0;
      reasons.push("252 EV en PS y Defensa Especial para aguantar ataques especiales; los 4 restantes a Defensa.");
      reasons.push(`${physical ? "Cauta (+Def. Esp., −At. Esp.)" : "Serena (+Def. Esp., −At)"}.`);
      break;
    case "balanced": {
      const third = 168;
      evs = physical ? [third, third, 0, 0, 0, 172] : [third, 0, 0, third, 0, 172];
      nature = physical ? "adamant" : "modest";
      reasons.push("Reparto equilibrado entre PS, ataque principal y Velocidad (168/168/172 EV).");
      reasons.push("Útil en la aventura, donde no se sabe contra qué te vas a enfrentar.");
      if (def + spd < atk + spa) reasons.push("Sus defensas base son modestas: considera más PS si recibe muchos golpes.");
      break;
    }
    case "trick-room":
      evs = physical ? [252, 252, 0, 0, leftover - 2, 0] : [252, 0, 0, 252, leftover - 2, 0];
      nature = physical ? "brave" : "quiet";
      ivs[5] = 0;
      if (!physical) ivs[1] = 0;
      reasons.push("En Espacio Raro actúa primero el más lento: Velocidad con IV 0, sin EV y naturaleza que la reduce.");
      reasons.push(`${physical ? "Audaz (+At, −Vel)" : "Mansa (+At. Esp., −Vel)"} con 252 EV en PS y en su ataque principal.`);
      if (spe > 80) reasons.push(`Su Velocidad base (${spe}) es alta: Espacio Raro no es su mejor estrategia.`);
      break;
  }

  if (gen <= 5) reasons.push("En Gen 3-5 se permiten 255 EV por estadística, pero solo 252 aportan (cada 4 EV = 1 punto a nivel 100).");
  if (opts.isShedinja) {
    evs[0] = 0;
    reasons.push("Shedinja siempre tiene 1 PS: los EV de PS no sirven de nada.");
  }
  return { evs, ivs, nature, altNature, reasons };
}
