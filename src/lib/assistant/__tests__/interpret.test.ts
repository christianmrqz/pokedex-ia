import { describe, expect, it } from "vitest";
import { POKEMON } from "@/lib/data/pokedex";
import { interpretQuestion } from "@/lib/assistant/interpret";
import { bestCoverage, defensiveCombos, evaluateCoverage } from "@/lib/engine/coverage";

const slugs = (q: string, ctx?: string) => interpretQuestion(q, ctx).pokemon.map((p) => p.slug);

describe("intérprete de preguntas", () => {
  it("reconoce los ejemplos del enunciado", () => {
    expect(interpretQuestion("¿Qué Pokémon me recomiendas para derrotar a Drapion?")).toMatchObject({ intents: expect.arrayContaining(["counter"]) });
    expect(slugs("¿Qué Pokémon me recomiendas para derrotar a Drapion?")).toEqual(["drapion"]);
    expect(interpretQuestion("¿Qué naturaleza debería utilizar en Garchomp?").intents).toContain("nature");
    expect(interpretQuestion("¿Cómo reparto los EV de mi Charizard?").intents).toContain("evs");
    const why = interpretQuestion("¿Por qué mi ataque de tipo Lucha no es supereficaz contra Drapion?");
    expect(why.intents).toContain("effectiveness");
    expect(why.types).toEqual(["fighting"]);
    expect(why.pokemon.map((p) => p.slug)).toEqual(["drapion"]);
    expect(interpretQuestion("¿Cuál es la mejor combinación de ataques para cubrir más tipos?").intents).toContain("coverage");
    const water = interpretQuestion("¿Qué Pokémon me conviene utilizar contra un rival de tipo Agua/Volador?");
    expect(water.types).toEqual(["water", "flying"]);
    expect(water.intents).toContain("counter");
  });

  it("detecta enfrentamientos entre dos Pokémon en orden", () => {
    const m = interpretQuestion("Mi Pokémon: Garchomp. Rival: Drapion");
    expect(m.pokemon.map((p) => p.slug)).toEqual(["garchomp", "drapion"]);
    expect(m.intents).toContain("matchup");
  });

  it("tolera erratas y acentos", () => {
    expect(slugs("como gano a garchom")).toEqual(["garchomp"]);
    expect(slugs("debilidades de flabébé")).toEqual(["flabebe"]);
    expect(slugs("debilidades de Rotom Lavado")).toEqual(["rotom-wash"]);
  });

  it("usa el Pokémon que se está viendo si la pregunta no nombra ninguno", () => {
    expect(slugs("¿qué naturaleza le pongo?", "gengar")).toEqual(["gengar"]);
    expect(slugs("¿y contra Drapion?", "gengar")).toEqual(["drapion"]);
  });

  it("no confunde palabras comunes con Pokémon", () => {
    expect(slugs("¿cuál es el mejor tipo de ataque contra un rival de tipo Planta?")).toEqual([]);
  });
});

describe("cobertura ofensiva", () => {
  it("evalúa cuántas combinaciones reales golpea cada conjunto de tipos", () => {
    const combos = defensiveCombos(POKEMON, 9);
    expect(combos.length).toBeGreaterThan(150);
    const iceGround = evaluateCoverage(["ice", "ground"], combos, 9);
    const normalOnly = evaluateCoverage(["normal"], combos, 9);
    expect(iceGround.superEffective).toBeGreaterThan(normalOnly.superEffective);
    expect(normalOnly.superEffective).toBe(0);
  });

  it("la mejor pareja de tipos se calcula exhaustivamente y está ordenada", () => {
    const best = bestCoverage(POKEMON, 9, 2);
    expect(best).toHaveLength(5);
    for (let i = 1; i < best.length; i++) expect(best[i - 1].superEffective).toBeGreaterThanOrEqual(best[i].superEffective);
    const all = bestCoverage(POKEMON, 9, 2, [], 1000);
    expect(all).toHaveLength((18 * 17) / 2);
  });

  it("respeta los tipos fijados por el usuario", () => {
    const withFire = bestCoverage(POKEMON, 9, 3, ["fire"]);
    for (const r of withFire) expect(r.attackTypes).toContain("fire");
  });
});
