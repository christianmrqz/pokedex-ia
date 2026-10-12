import { describe, expect, it } from "vitest";
import { POKEMON, getPokemonBySlug } from "@/lib/data/pokedex";
import { analyzeTeam, suggestForTeam, type TeamMemberInput } from "@/lib/engine/team";

const member = (slug: string, moves: TeamMemberInput["moves"] = []): TeamMemberInput => ({ entry: getPokemonBySlug(slug)!, moves });

describe("análisis de equipos", () => {
  it("detecta debilidades compartidas (tres Pokémon débiles a Eléctrico sin resistencias)", () => {
    const team = [member("gyarados"), member("pelipper"), member("skarmory")];
    const a = analyzeTeam(team, 9);
    const electric = a.defensive.find((d) => d.type === "electric")!;
    expect(electric.weak).toBe(3);
    expect(electric.shared).toBe(true);
    expect(a.sharedWeaknesses).toContain("electric");
  });

  it("cuenta inmunidades y resistencias por separado", () => {
    const a = analyzeTeam([member("garchomp"), member("gengar")], 9);
    const electric = a.defensive.find((d) => d.type === "electric")!;
    expect(electric.immune).toBe(1); // Garchomp (Tierra)
    const normal = a.defensive.find((d) => d.type === "normal")!;
    expect(normal.immune).toBe(1); // Gengar (Fantasma)
  });

  it("la cobertura usa los movimientos elegidos y, si no hay, los tipos del Pokémon", () => {
    const noMoves = analyzeTeam([member("garchomp")], 9);
    expect(noMoves.coverage.find((c) => c.type === "electric")!.hitters).toEqual(["Garchomp"]);
    const withIce = analyzeTeam([member("garchomp", [{ type: "ice", category: "physical", power: 65 }])], 9);
    expect(withIce.coverage.find((c) => c.type === "dragon")!.hitters).toEqual(["Garchomp"]);
    expect(withIce.coverage.find((c) => c.type === "electric")!.hitters).toEqual([]);
  });

  it("equilibrio físico/especial y orden de velocidad", () => {
    const a = analyzeTeam([member("garchomp"), member("gengar"), member("snorlax")], 9);
    expect(a.balance.physical).toBe(2);
    expect(a.balance.special).toBe(1);
    expect(a.speed.map((s) => s.name)).toEqual(["Gengar", "Garchomp", "Snorlax"]);
  });

  it("las sugerencias resisten las debilidades compartidas y no están ya en el equipo", () => {
    const team = [member("gyarados"), member("pelipper"), member("skarmory")];
    const a = analyzeTeam(team, 9);
    const s = suggestForTeam(a, team, POKEMON, 9);
    expect(s.length).toBeGreaterThan(0);
    for (const x of s) {
      expect(["gyarados", "pelipper", "skarmory"]).not.toContain(x.entry.slug);
      expect(x.resists.length + x.covers.length).toBeGreaterThan(0);
    }
    expect(s[0].resists).toContain("electric");
  });
});
