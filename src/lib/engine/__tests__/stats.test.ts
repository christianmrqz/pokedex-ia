import { calcStat } from "@smogon/calc";
import { describe, expect, it } from "vitest";
import { NATURES } from "@/lib/data/games";
import { getPokemonBySlug } from "@/lib/data/pokedex";
import type { Generation, StatTuple } from "@/lib/domain";
import { calcStats, evRules, hpDvFromOthers, natureMultipliers, validateEvs } from "@/lib/engine/stats";
import { statsForGen } from "@/lib/engine/strategy";

const nature = (slug: string) => NATURES.find((n) => n.slug === slug)!;
const ALL31: StatTuple = [31, 31, 31, 31, 31, 31];
const ZERO: StatTuple = [0, 0, 0, 0, 0, 0];

describe("estadísticas Gen 3+", () => {
  it("Garchomp Nv 100, Alegre, 252 Atk / 4 Def / 252 Vel, IV 31", () => {
    const garchomp = getPokemonBySlug("garchomp")!;
    const s = calcStats({ gen: 9, base: garchomp.stats, level: 100, ivs: ALL31, evs: [0, 252, 4, 0, 0, 252], nature: nature("jolly") });
    // Valores de referencia de Pokémon Showdown.
    expect(s).toEqual([357, 359, 227, 176, 206, 333]);
  });

  it("Drapion Nv 50, Firme, sin EV, IV 31 (Ataque = ⌊(105 + 5) × 1,1⌋ = 121)", () => {
    const drapion = getPokemonBySlug("drapion")!;
    const s = calcStats({ gen: 9, base: drapion.stats, level: 50, ivs: ALL31, evs: ZERO, nature: nature("adamant") });
    expect(s).toEqual([145, 121, 130, 72, 95, 115]);
  });

  it("la naturaleza aplica ×1,1 y ×0,9 y las neutras no cambian nada", () => {
    expect(natureMultipliers(nature("modest"))).toEqual([1, 0.9, 1, 1.1, 1, 1]);
    expect(natureMultipliers(nature("hardy"))).toEqual([1, 1, 1, 1, 1, 1]);
    expect(NATURES).toHaveLength(25);
  });

  it("coincide con @smogon/calc para cualquier combinación (muestreo)", () => {
    const keys = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
    const natures = ["adamant", "modest", "timid", "jolly", "bold", "quiet", "hardy", "brave"];
    for (const slug of ["drapion", "garchomp", "chansey", "shuckle", "pikachu", "blissey"]) {
      const p = getPokemonBySlug(slug)!;
      for (const level of [1, 5, 50, 77, 100]) {
        for (const nat of natures) {
          const ivs: StatTuple = [31, 0, 15, 31, 7, 22];
          const evs: StatTuple = [252, 4, 100, 0, 152, 0];
          const ours = calcStats({ gen: 9, base: p.stats, level, ivs, evs, nature: nature(nat) });
          keys.forEach((k, i) => {
            const smogonNature = nat.charAt(0).toUpperCase() + nat.slice(1);
            expect(ours[i], `${slug} ${k} Nv${level} ${nat}`).toBe(calcStat(9, k, p.stats[i], ivs[i], evs[i], level, smogonNature));
          });
        }
      }
    }
  });

  it("Shedinja siempre tiene 1 PS", () => {
    const shedinja = getPokemonBySlug("shedinja")!;
    const s = calcStats({ gen: 9, base: shedinja.stats, level: 100, ivs: ALL31, evs: [252, 0, 0, 0, 0, 0], nature: null, isShedinja: true });
    expect(s[0]).toBe(1);
    expect(calcStats({ gen: 2, base: shedinja.stats, level: 100, ivs: [15, 15, 15, 15, 15, 15], evs: ZERO, isShedinja: true })[0]).toBe(1);
  });

  it("límites de EV por generación", () => {
    expect(evRules(5)).toMatchObject({ perStat: 255, total: 510 });
    expect(evRules(6)).toMatchObject({ perStat: 252, total: 510 });
    expect(evRules(2)).toMatchObject({ perStat: 65535, total: null, maxIv: 15, hasNatures: false });
    expect(validateEvs([252, 252, 4, 0, 0, 0], 9)).toEqual([]);
    expect(validateEvs([252, 252, 252, 0, 0, 0], 9)).toHaveLength(1);
    expect(validateEvs([255, 0, 0, 0, 0, 0], 6)).toHaveLength(1);
    expect(validateEvs([255, 0, 0, 0, 0, 0], 5)).toEqual([]);
  });

  it("los valores fuera de rango se limitan", () => {
    const p = getPokemonBySlug("drapion")!;
    const a = calcStats({ gen: 9, base: p.stats, level: 100, ivs: [99, 31, 31, 31, 31, 31], evs: [999, 0, 0, 0, 0, 0] });
    const b = calcStats({ gen: 9, base: p.stats, level: 100, ivs: ALL31, evs: [252, 0, 0, 0, 0, 0] });
    expect(a).toEqual(b);
  });
});

describe("estadísticas Gen 1-2", () => {
  it("Mewtwo Gen 1 Nv 100 con DV y experiencia máximos: 416 PS", () => {
    const mewtwo = getPokemonBySlug("mewtwo")!;
    const base = statsForGen(mewtwo, 1);
    const s = calcStats({ gen: 1, base, level: 100, ivs: [15, 15, 15, 15, 15, 15], evs: [65535, 65535, 65535, 65535, 65535, 65535] });
    expect(s[0]).toBe(416);
    // Especial base 154: ((154+15)·2 + 64) + 5 = 407
    expect(s[3]).toBe(407);
    expect(s[3]).toBe(s[4]);
  });

  it("el DV de PS se deriva de los demás DV", () => {
    expect(hpDvFromOthers(15, 15, 15, 15)).toBe(15);
    expect(hpDvFromOthers(14, 15, 14, 15)).toBe(5);
    expect(hpDvFromOthers(0, 0, 0, 0)).toBe(0);
  });

  // @smogon/calc expresa la experiencia de estadística como EV: 252 EV = 252² = 63504 de experiencia.
  it.each([1, 2] as Generation[])("coincide con @smogon/calc en Gen %i (DV = IV/2, ExpE = EV²)", (gen) => {
    const snorlax = getPokemonBySlug("snorlax")!;
    const base = statsForGen(snorlax, gen);
    const ours = calcStats({ gen, base, level: 100, ivs: [15, 15, 15, 15, 15, 15], evs: [63504, 63504, 63504, 63504, 63504, 63504] });
    expect(ours[1]).toBe(calcStat(gen, "atk", base[1], 31, 252, 100));
    expect(ours[5]).toBe(calcStat(gen, "spe", base[5], 31, 252, 100));
    expect(ours[0]).toBe(calcStat(gen, "hp", base[0], 31, 252, 100));
  });
});
