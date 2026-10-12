import { describe, expect, it } from "vitest";
import { POKEMON, getPokemonBySlug } from "@/lib/data/pokedex";
import { analyzeOpponent, statsForGen, suggestCounters } from "@/lib/engine/strategy";

const drapion = getPokemonBySlug("drapion")!;

describe("análisis del rival", () => {
  it("Drapion: atacar por el lado especial (Def 110 frente a Def. Esp. 75)", () => {
    const a = analyzeOpponent(drapion, 9);
    expect(a.side).toBe("special");
    expect(a.profile.double).toEqual(["ground"]);
  });

  it("los enfrentamientos sugeridos tienen ventaja real y motivos", () => {
    const counters = suggestCounters(drapion, POKEMON, 9);
    expect(counters.length).toBeGreaterThan(0);
    for (const c of counters) {
      expect(c.offense >= 2 || c.defense <= 0.5).toBe(true);
      expect(c.reasons.length).toBeGreaterThan(0);
      expect(c.entry.legendary || c.entry.mythical).toBeFalsy();
    }
    // Una sola sugerencia por especie.
    expect(new Set(counters.map((c) => c.entry.speciesId)).size).toBe(counters.length);
  });

  it("no sugiere Pokémon que no existían en la generación elegida", () => {
    const counters = suggestCounters(drapion, POKEMON, 4, { limit: 30 });
    for (const c of counters) expect(c.entry.gen).toBeLessThanOrEqual(4);
  });
});

describe("estadísticas por generación", () => {
  it("Pikachu: Def. Esp. 40 en Gen 5 y 50 desde Gen 6; Especial 50 en Gen 1", () => {
    const pikachu = getPokemonBySlug("pikachu")!;
    expect(statsForGen(pikachu, 5)[4]).toBe(40);
    expect(statsForGen(pikachu, 6)[4]).toBe(50);
    expect(statsForGen(pikachu, 9)[2]).toBe(40);
    expect(statsForGen(pikachu, 1)[3]).toBe(50);
  });
});
