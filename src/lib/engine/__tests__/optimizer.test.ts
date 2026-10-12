import { describe, expect, it } from "vitest";
import { NATURES } from "@/lib/data/games";
import { getPokemonBySlug } from "@/lib/data/pokedex";
import { OBJECTIVES, recommendSpread } from "@/lib/engine/optimizer";
import { calcStats, natureMultipliers, validateEvs } from "@/lib/engine/stats";

const garchomp = getPokemonBySlug("garchomp")!;
const gengar = getPokemonBySlug("gengar")!;

describe("optimizador de EV/IV", () => {
  it.each(OBJECTIVES)("el reparto «%s» respeta los límites de Gen 9", (objective) => {
    const r = recommendSpread(objective, garchomp.stats, 9);
    expect(validateEvs(r.evs, 9)).toEqual([]);
    expect(r.evs.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(510);
    expect(NATURES.some((n) => n.slug === r.nature)).toBe(true);
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("un atacante especial usa IV 0 en Ataque y naturaleza que baja el Ataque", () => {
    const r = recommendSpread("special-attacker", gengar.stats, 9);
    expect(r.ivs[1]).toBe(0);
    const nat = NATURES.find((n) => n.slug === r.nature)!;
    expect(natureMultipliers(nat)[1]).toBe(0.9);
  });

  it("Espacio Raro: Velocidad con IV 0, sin EV y naturaleza que la reduce", () => {
    const r = recommendSpread("trick-room", getPokemonBySlug("snorlax")!.stats, 9);
    expect(r.ivs[5]).toBe(0);
    expect(r.evs[5]).toBe(0);
    expect(natureMultipliers(NATURES.find((n) => n.slug === r.nature)!)[5]).toBe(0.9);
    // La Velocidad resultante es la mínima posible a nivel 100.
    const s = calcStats({ gen: 9, base: getPokemonBySlug("snorlax")!.stats, level: 100, ivs: r.ivs, evs: r.evs, nature: NATURES.find((n) => n.slug === r.nature) });
    expect(s[5]).toBe(Math.floor((Math.floor((2 * 30 * 100) / 100) + 5) * 0.9));
  });

  it("Gen 1-2: sin naturalezas y con todo al máximo", () => {
    const r = recommendSpread("physical-attacker", garchomp.stats, 2);
    expect(r.nature).toBeNull();
    expect(r.evs.every((v) => v === 65535)).toBe(true);
  });

  it("elige el perfil físico o especial según las estadísticas base", () => {
    expect(recommendSpread("max-speed", garchomp.stats, 9).nature).toBe("jolly");
    expect(recommendSpread("max-speed", gengar.stats, 9).nature).toBe("timid");
  });
});
