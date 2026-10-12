/**
 * Hechos verificables para el asistente. Todo sale de los índices de PokéAPI y de los
 * motores deterministas; la IA (si está configurada) solo los explica.
 */
import { ABILITIES, MOVES } from "@/lib/data/catalog";
import { NATURES, generationLabel, getVersionGroup } from "@/lib/data/games";
import { POKEMON } from "@/lib/data/pokedex";
import { STAT_KEYS, type Generation, type PokemonIndexEntry, type TypeName } from "@/lib/domain";
import { compareMatchup, highlightMoves } from "@/lib/engine/compare";
import { bestCoverage } from "@/lib/engine/coverage";
import { DEFAULT_FIELD, computeDamage, defaultCombatant, speciesExistsInGen } from "@/lib/engine/damage";
import { versionGroupsWithData } from "@/lib/engine/learnset";
import { recommendSpread, type Objective } from "@/lib/engine/optimizer";
import { analyzeOpponent, statsForGen, suggestCounters, type CounterReason } from "@/lib/engine/strategy";
import { singleEffectiveness, typeEffectiveness, typeLabel, typesForGen } from "@/lib/engine/type-chart";
import { getPokemonDetail } from "@/lib/pokeapi/services";
import type { Interpretation } from "./interpret";

const STAT_LABEL: Record<string, string> = { hp: "PS", atk: "Ataque", def: "Defensa", spa: "Ataque Especial", spd: "Defensa Especial", spe: "Velocidad" };
const types = (list: TypeName[]) => list.map((t) => typeLabel(t));
const num = (n: number, digits = 1) => n.toLocaleString("es-ES", { maximumFractionDigits: digits });

export interface PokemonFacts {
  nombre: string;
  numero: number;
  generacionIntroducida: number;
  tipos: string[];
  estadisticasBase: Record<string, number>;
  total: number;
  habilidades: { nombre: string; oculta: boolean; efecto: string | null }[];
  debilidades: { tipo: string; multiplicador: number }[];
  resistencias: { tipo: string; multiplicador: number }[];
  inmunidades: string[];
  ladoRecomendadoParaAtacarle: string;
  rivalesSugeridos?: { nombre: string; tipos: string[]; motivos: string[] }[];
}

export interface AssistantFacts {
  generacion: string;
  pokemon: PokemonFacts[];
  combinacionDeTipos?: {
    tipos: string[];
    debilidades: { tipo: string; multiplicador: number }[];
    resistencias: { tipo: string; multiplicador: number }[];
    inmunidades: string[];
    ejemplos: string[];
    rivalesSugeridos: { nombre: string; tipos: string[]; motivos: string[] }[];
  };
  efectividad?: { tipoAtaque: string; defensor: string; desglose: { contraTipo: string; multiplicador: number }[]; total: number }[];
  repartos?: { pokemon: string; objetivo: string; ev: Record<string, number>; iv: Record<string, number>; naturaleza: string | null; alternativa: string | null; motivos: string[] }[];
  enfrentamiento?: {
    atacante: string;
    defensor: string;
    ventajaTipos: { de: string; tipo: string; multiplicador: number }[];
    velocidadNivel50: { pokemon: string; minimo: number; neutro: number; maximo: number }[];
    juegoMovimientos: string | null;
    movimientosDestacados: { pokemon: string; contra: string; movimientos: { nombre: string; tipo: string; potencia: number; stab: boolean; efectividad: number }[] }[];
    danos: { atacante: string; movimiento: string; defensor: string; rango: string; porcentaje: string; ko: string; condiciones: string }[];
  };
  cobertura?: { base: string[]; mejores: { tipos: string[]; supereficazContra: number; bloqueadoPor: number; total: number; ejemplosQueLoBloquean: string[] }[] };
  notas: string[];
}

function reasonText(r: CounterReason): string {
  switch (r.key) {
    case "stab":
      return `ataque de su tipo ${typeLabel(r.type)} ×${num(r.multiplier, 2)}`;
    case "resists":
      return r.multiplier === 0 ? `inmune a ${typeLabel(r.type)}` : `resiste ${typeLabel(r.type)} ×${num(r.multiplier, 2)}`;
    case "weakTo":
      return `débil a ${typeLabel(r.type)} ×${num(r.multiplier, 2)}`;
    case "faster":
      return `más rápido (${r.own} vs ${r.rival})`;
    case "slower":
      return `más lento (${r.own} vs ${r.rival})`;
    case "physicalEdge":
      return `Ataque ${r.atk} vs Defensa ${r.def}`;
    case "specialEdge":
      return `Ataque Especial ${r.spa} vs Defensa Especial ${r.spd}`;
  }
}

function pokemonFacts(entry: PokemonIndexEntry, gen: Generation, withCounters: boolean): PokemonFacts {
  const a = analyzeOpponent(entry, gen);
  const abilities = [...entry.abilities.map((s) => ({ s, h: false })), ...(entry.hidden ? [{ s: entry.hidden, h: true }] : [])];
  return {
    nombre: entry.es,
    numero: entry.speciesId,
    generacionIntroducida: entry.gen,
    tipos: types(a.types),
    estadisticasBase: Object.fromEntries(STAT_KEYS.map((k, i) => [STAT_LABEL[k], a.stats[i]])),
    total: a.stats.reduce((x, y) => x + y, 0),
    habilidades: gen >= 3 ? abilities.map(({ s, h }) => ({ nombre: ABILITIES[s]?.es ?? s, oculta: h, efecto: ABILITIES[s]?.descEs ?? ABILITIES[s]?.effectEn ?? null })) : [],
    debilidades: [...a.profile.quad.map((t) => ({ tipo: typeLabel(t), multiplicador: 4 })), ...a.profile.double.map((t) => ({ tipo: typeLabel(t), multiplicador: 2 }))],
    resistencias: [...a.profile.quarter.map((t) => ({ tipo: typeLabel(t), multiplicador: 0.25 })), ...a.profile.half.map((t) => ({ tipo: typeLabel(t), multiplicador: 0.5 }))],
    inmunidades: types(a.profile.immune),
    ladoRecomendadoParaAtacarle:
      a.side === "either" ? "indiferente (defensas equilibradas)" : a.side === "physical" ? "ataques físicos (su Defensa es menor)" : "ataques especiales (su Defensa Especial es menor)",
    ...(withCounters
      ? {
          rivalesSugeridos: suggestCounters(entry, POKEMON, gen).map((c) => ({
            nombre: c.entry.es,
            tipos: types(typesForGen(c.entry, gen)),
            motivos: c.reasons.map(reasonText),
          })),
        }
      : {}),
  };
}

const OBJECTIVE_LABEL: Record<Objective, string> = {
  "physical-attacker": "atacante físico",
  "special-attacker": "atacante especial",
  "max-speed": "máxima velocidad",
  "physical-wall": "resistencia física",
  "special-wall": "resistencia especial",
  balanced: "equilibrado",
  "trick-room": "Espacio Raro",
};

const natureName = (slug: string | null | undefined) => (slug ? (NATURES.find((n) => n.slug === slug)?.es ?? slug) : null);

/** Construye los hechos para una pregunta interpretada. Solo hace peticiones de red para movimientos en enfrentamientos. */
export async function buildFacts(interp: Interpretation, gen: Generation, versionGroup: string | null): Promise<AssistantFacts> {
  const notas: string[] = [];
  const valid = interp.pokemon.filter((p) => {
    if (p.gen > gen) notas.push(`${p.es} no existe en la ${generationLabel(gen)}.`);
    return p.gen <= gen;
  });
  const wantsCounters = interp.intents.includes("counter") || interp.intents.includes("general");
  const facts: AssistantFacts = {
    generacion: generationLabel(gen),
    pokemon: valid.map((p, i) => pokemonFacts(p, gen, wantsCounters && (valid.length === 1 || i === valid.length - 1))),
    notas,
  };

  // Rival descrito solo por sus tipos ("un rival de tipo Agua/Volador").
  if (interp.types.length && !valid.length && (interp.intents.includes("counter") || interp.intents.includes("effectiveness") || interp.intents.includes("general"))) {
    const combo = interp.types.slice(0, 2);
    const pseudo: PokemonIndexEntry = {
      id: -1, slug: "", speciesId: -1, speciesSlug: "", es: types(combo).join("/"), en: "", gen: 1, types: combo,
      stats: [80, 80, 80, 80, 80, 80], abilities: [], height: 0, weight: 0, isDefault: true,
    };
    const a = analyzeOpponent(pseudo, gen);
    facts.combinacionDeTipos = {
      tipos: types(combo),
      debilidades: [...a.profile.quad.map((t) => ({ tipo: typeLabel(t), multiplicador: 4 })), ...a.profile.double.map((t) => ({ tipo: typeLabel(t), multiplicador: 2 }))],
      resistencias: [...a.profile.quarter.map((t) => ({ tipo: typeLabel(t), multiplicador: 0.25 })), ...a.profile.half.map((t) => ({ tipo: typeLabel(t), multiplicador: 0.5 }))],
      inmunidades: types(a.profile.immune),
      ejemplos: POKEMON.filter((p) => p.isDefault && p.gen <= gen && [...typesForGen(p, gen)].sort().join() === [...combo].sort().join()).slice(0, 8).map((p) => p.es),
      rivalesSugeridos: suggestCounters(pseudo, POKEMON, gen).map((c) => ({ nombre: c.entry.es, tipos: types(typesForGen(c.entry, gen)), motivos: c.reasons.map(reasonText) })),
    };
    notas.push("Los rivales sugeridos para una combinación de tipos usan estadísticas genéricas (80 en todo) para el rival.");
  }

  // "¿Por qué mi ataque de tipo X no es supereficaz contra Y?"
  if (interp.intents.includes("effectiveness") && interp.types.length && valid.length) {
    facts.efectividad = [];
    for (const atk of interp.types) {
      for (const p of valid) {
        const def = typesForGen(p, gen);
        facts.efectividad.push({
          tipoAtaque: typeLabel(atk),
          defensor: p.es,
          desglose: def.map((d) => ({ contraTipo: typeLabel(d), multiplicador: singleEffectiveness(atk, d, gen) })),
          total: typeEffectiveness(atk, def, gen),
        });
      }
    }
  }

  // Naturalezas y repartos de EV/IV.
  if ((interp.intents.includes("nature") || interp.intents.includes("evs")) && valid.length) {
    const p = valid[0];
    const base = statsForGen(p, gen);
    const physical = base[1] >= base[3];
    const bulky = base[2] + base[4] > base[1] + base[3] + 20;
    const objectives: Objective[] = bulky
      ? [physical ? "physical-wall" : "special-wall", physical ? "physical-attacker" : "special-attacker"]
      : [physical ? "physical-attacker" : "special-attacker", "max-speed", "trick-room"];
    facts.repartos = objectives.map((o) => {
      const r = recommendSpread(o, base, gen, { isShedinja: p.speciesSlug === "shedinja" });
      return {
        pokemon: p.es,
        objetivo: OBJECTIVE_LABEL[o],
        ev: Object.fromEntries(STAT_KEYS.map((k, i) => [STAT_LABEL[k], r.evs[i]])),
        iv: Object.fromEntries(STAT_KEYS.map((k, i) => [STAT_LABEL[k], r.ivs[i]])),
        naturaleza: natureName(r.nature),
        alternativa: natureName(r.altNature),
        motivos: r.reasons,
      };
    });
  }

  // Enfrentamiento directo: "Mi Pokémon: Garchomp. Rival: Drapion".
  if (valid.length >= 2) {
    const [mine, rival] = valid;
    const m = compareMatchup(mine, rival, gen, 50);
    const enf: NonNullable<AssistantFacts["enfrentamiento"]> = {
      atacante: mine.es,
      defensor: rival.es,
      ventajaTipos: [
        { de: mine.es, tipo: typeLabel(m.aOffense.type), multiplicador: m.aOffense.multiplier },
        { de: rival.es, tipo: typeLabel(m.bOffense.type), multiplicador: m.bOffense.multiplier },
      ],
      velocidadNivel50: [
        { pokemon: mine.es, minimo: m.speed.a.min, neutro: m.speed.a.neutral, maximo: m.speed.a.max },
        { pokemon: rival.es, minimo: m.speed.b.min, neutro: m.speed.b.neutral, maximo: m.speed.b.max },
      ],
      juegoMovimientos: null,
      movimientosDestacados: [],
      danos: [],
    };
    try {
      const [dMine, dRival] = await Promise.all([getPokemonDetail(mine.slug), getPokemonDetail(rival.slug)]);
      if (dMine && dRival) {
        const vgMine = versionGroupsWithData(dMine.learnset);
        const common = [...versionGroupsWithData(dRival.learnset)].filter((v) => vgMine.has(v) && getVersionGroup(v));
        common.sort((x, y) => getVersionGroup(x)!.order - getVersionGroup(y)!.order);
        const vgSlug = versionGroup && common.includes(versionGroup) ? versionGroup : common.at(-1);
        const vg = vgSlug ? getVersionGroup(vgSlug) : undefined;
        if (vg) {
          enf.juegoMovimientos = vg.es;
          const vgInfo = { slug: vg.slug, order: vg.order, gen: vg.gen };
          for (const [self, other, detail] of [
            [mine, rival, dMine],
            [rival, mine, dRival],
          ] as const) {
            const list = highlightMoves(detail.learnset, MOVES, vgInfo, typesForGen(self, vg.gen), typesForGen(other, vg.gen), 4);
            enf.movimientosDestacados.push({
              pokemon: self.es,
              contra: other.es,
              movimientos: list.map((mv) => ({ nombre: MOVES[mv.move]?.es ?? mv.move, tipo: typeLabel(mv.type), potencia: mv.power, stab: mv.stab, efectividad: mv.effectiveness })),
            });
            const top = list[0];
            if (top && self.smogon && other.smogon && speciesExistsInGen(self.smogon, vg.gen) && speciesExistsInGen(other.smogon, vg.gen)) {
              try {
                const r = computeDamage(vg.gen, defaultCombatant(self.smogon), defaultCombatant(other.smogon), top.move, DEFAULT_FIELD);
                enf.danos.push({
                  atacante: self.es,
                  movimiento: MOVES[top.move]?.es ?? top.move,
                  defensor: other.es,
                  rango: `${r.min}–${r.max} PS de ${r.defenderMaxHp}`,
                  porcentaje: `${num(r.minPercent)}–${num(r.maxPercent)} %`,
                  ko: r.koText,
                  condiciones: `Mecánicas de la ${generationLabel(vg.gen)}; nivel 50, IV 31, sin EV, naturaleza neutra, sin objetos ni clima; habilidad por defecto (@smogon/calc)`,
                });
              } catch {
                // Movimiento no soportado por el motor: se omite el daño.
              }
            }
          }
        } else notas.push("Estos dos Pokémon no coinciden en ningún juego con datos de movimientos.");
      }
    } catch {
      notas.push("No se pudieron obtener los movimientos desde PokéAPI en este momento.");
    }
    facts.enfrentamiento = enf;
  }

  // Cobertura de tipos de ataque.
  if (interp.intents.includes("coverage")) {
    const fixed = valid[0] ? typesForGen(valid[0], gen) : interp.types;
    const size = (Math.min(4, Math.max(2, fixed.length + 2)) as 2 | 3 | 4);
    facts.cobertura = {
      base: types(fixed),
      mejores: bestCoverage(POKEMON, gen, size, fixed, 3).map((c) => ({
        tipos: types(c.attackTypes),
        supereficazContra: c.superEffective,
        bloqueadoPor: c.walled,
        total: c.total,
        ejemplosQueLoBloquean: c.walledBy.map((w) => types(w).join("/")),
      })),
    };
    notas.push("La cobertura cuenta combinaciones de tipos de Pokémon reales de la generación, no Pokémon individuales.");
  }

  if (!valid.length && !interp.types.length && !interp.intents.includes("coverage")) notas.push("La pregunta no menciona ningún Pokémon ni tipo reconocible.");
  return facts;
}
