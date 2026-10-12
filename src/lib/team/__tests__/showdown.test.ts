import { describe, expect, it } from "vitest";
import { getPokemonBySlug } from "@/lib/data/pokedex";
import { isTeam, newMember } from "@/lib/team/model";
import { memberToShowdown, teamToShowdown } from "@/lib/team/showdown";

describe("exportación a Showdown", () => {
  it("genera el formato estándar", () => {
    const m = {
      ...newMember("garchomp", "rough-skin"),
      item: "Choice Scarf",
      nature: "jolly",
      level: 100,
      evs: [4, 252, 0, 0, 0, 252] as [number, number, number, number, number, number],
      moves: ["earthquake", "outrage", "u-turn", "stone-edge"],
      teraType: "ground" as const,
    };
    expect(memberToShowdown(m, getPokemonBySlug("garchomp")!, 9)).toBe(
      [
        "Garchomp @ Choice Scarf",
        "Ability: Rough Skin",
        "Tera Type: Ground",
        "EVs: 4 HP / 252 Atk / 252 Spe",
        "Jolly Nature",
        "- Earthquake",
        "- Outrage",
        "- U-turn",
        "- Stone Edge",
      ].join("\n"),
    );
  });

  it("incluye nivel e IV no máximos y omite Tera fuera de Gen 9", () => {
    const m = { ...newMember("gengar", "cursed-body"), ivs: [31, 0, 31, 31, 31, 31] as [number, number, number, number, number, number], nature: "timid" };
    const text = memberToShowdown(m, getPokemonBySlug("gengar")!, 8);
    expect(text).toContain("Level: 50");
    expect(text).toContain("IVs: 0 Atk");
    expect(text).not.toContain("Tera");
  });

  it("une varios miembros con una línea en blanco", () => {
    const text = teamToShowdown([newMember("pikachu", "static"), newMember("eevee", "run-away")], getPokemonBySlug, 9);
    expect(text.split("\n\n")).toHaveLength(2);
  });

  it("valida los equipos guardados", () => {
    expect(isTeam({ id: "a", name: "x", members: [newMember("pikachu", null)], updatedAt: 0 })).toBe(true);
    expect(isTeam({ id: "a", name: "x", members: Array(7).fill(newMember("pikachu", null)) })).toBe(false);
    expect(isTeam(null)).toBe(false);
    expect(isTeam({ id: 1 })).toBe(false);
  });
});
