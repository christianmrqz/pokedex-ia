import { describe, expect, it } from "vitest";
import { MOVES } from "@/lib/data/catalog";
import { getVersionGroup } from "@/lib/data/games";
import { getPokemonBySlug } from "@/lib/data/pokedex";
import type { Generation } from "@/lib/domain";
import { compareMatchup, highlightMoves, statRange } from "@/lib/engine/compare";
import type { Learnset } from "@/lib/engine/learnset";
import charizard from "./fixtures/charizard.learnset.json";

describe("comparador", () => {
  it("Garchomp contra Drapion: Tierra ×2 en un sentido, Siniestro/Veneno neutro en el otro", () => {
    const m = compareMatchup(getPokemonBySlug("garchomp")!, getPokemonBySlug("drapion")!, 9);
    expect(m.aOffense).toEqual({ type: "ground", multiplier: 2 });
    expect(m.bOffense.multiplier).toBe(1);
  });

  it("rangos de Velocidad de Garchomp a nivel 50 y 100", () => {
    const g = getPokemonBySlug("garchomp")!;
    // Base 102, Nv 100: mín. ⌊(204 + 5)·0,9⌋ = 188; neutro 204 + 31 + 5 = 240; máx. ⌊(235 + 63 + 5)·1,1⌋ = 333.
    expect(statRange(g.stats, 5, 100, 9)).toEqual({ min: 188, neutral: 240, max: 333 });
    // Nv 50: mín. ⌊(102 + 5)·0,9⌋ = 96; neutro ⌊235·50/100⌋ + 5 = 122; máx. ⌊(⌊298·50/100⌋ + 5)·1,1⌋ = 169.
    expect(statRange(g.stats, 5, 50, 9)).toEqual({ min: 96, neutral: 122, max: 169 });
  });

  it("movimientos destacados: solo aprendibles en el juego y ordenados por valor contra el objetivo", () => {
    const vg = getVersionGroup("scarlet-violet")!;
    const list = highlightMoves(charizard as Learnset, MOVES, { slug: vg.slug, order: vg.order, gen: vg.gen as Generation }, ["fire", "flying"], ["grass", "steel"]);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].type).toBe("fire");
    expect(list[0].effectiveness).toBe(4);
    // Ataque Ala no se puede aprender en Escarlata/Púrpura.
    expect(list.map((m) => m.move)).not.toContain("wing-attack");
    // Un movimiento por tipo.
    expect(new Set(list.map((m) => m.type)).size).toBe(list.length);
  });
});
