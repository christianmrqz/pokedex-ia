import { describe, expect, it } from "vitest";
import { POKEMON, getPokemonBySlug, resolvePokemon } from "@/lib/data/pokedex";
import { isTypeName } from "@/lib/domain";

describe("integridad del índice generado", () => {
  it("cada especie tiene exactamente una forma por defecto", () => {
    const defaults = new Map<number, number>();
    for (const p of POKEMON) if (p.isDefault) defaults.set(p.speciesId, (defaults.get(p.speciesId) ?? 0) + 1);
    const species = new Set(POKEMON.map((p) => p.speciesId));
    expect(defaults.size).toBe(species.size);
    expect([...defaults.values()].every((n) => n === 1)).toBe(true);
  });

  it("los slugs y los ids son únicos", () => {
    expect(new Set(POKEMON.map((p) => p.slug)).size).toBe(POKEMON.length);
    expect(new Set(POKEMON.map((p) => p.id)).size).toBe(POKEMON.length);
  });

  it("todos los tipos y estadísticas son válidos", () => {
    for (const p of POKEMON) {
      expect(p.types.length, p.slug).toBeGreaterThanOrEqual(1);
      expect(p.types.every(isTypeName), p.slug).toBe(true);
      expect(p.stats).toHaveLength(6);
    }
  });

  it("resuelve nombres de especie, de variedad y números", () => {
    expect(resolvePokemon("drapion")?.slug).toBe("drapion");
    expect(resolvePokemon("452")?.slug).toBe("drapion");
    expect(resolvePokemon("deoxys")?.slug).toBe("deoxys-normal");
    expect(resolvePokemon("frillish")?.slug).toBe("frillish-male");
    expect(resolvePokemon("rotom-wash")?.slug).toBe("rotom-wash");
    expect(resolvePokemon("no-existe")).toBeUndefined();
  });

  it("Drapion: datos base correctos", () => {
    const d = getPokemonBySlug("drapion")!;
    expect(d.types).toEqual(["poison", "dark"]);
    expect(d.stats).toEqual([70, 90, 110, 60, 75, 95]);
    expect(d.speciesId).toBe(452);
    expect(d.gen).toBe(4);
  });
});
