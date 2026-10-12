import { describe, expect, it } from "vitest";
import { MOVES } from "@/lib/data/catalog";
import { POKEMON } from "@/lib/data/pokedex";
import { DEFAULT_FIELD, computeDamage, defaultCombatant, koDescription, smogonAbilityName, smogonMoveName } from "@/lib/engine/damage";

const garchomp = () => ({ ...defaultCombatant("Garchomp"), nature: "jolly", evs: [0, 252, 0, 0, 0, 252] as [number, number, number, number, number, number] });

describe("calculadora de daño (@smogon/calc)", () => {
  it("Garchomp Terremoto contra Drapion coincide con el cálculo a mano", () => {
    const r = computeDamage(9, garchomp(), defaultCombatant("Drapion"), "earthquake", DEFAULT_FIELD);
    // Ataque 182 vs Defensa 130 a Nv 50: base = ⌊⌊22·100·182/130⌋/50⌋ + 2 = 63.
    // Máx.: 63 → STAB ⌊94,5⌉=94 (redondeo a la baja en ,5) → ×2 = 188. Mín.: ⌊63·0,85⌋ = 53 → 79 → 158.
    expect(r.attackerStats[1]).toBe(182);
    expect(r.defenderStats[2]).toBe(130);
    expect(r.max).toBe(188);
    expect(r.min).toBe(158);
    expect(r.rolls).toHaveLength(16);
    expect(r.hasStab).toBe(true);
    expect(r.ko).toEqual({ hits: 1, chance: 1 });
    expect(r.koText).toBe("KO asegurado de un golpe.");
  });

  it("la inmunidad de tipo da 0 de daño (Eléctrico contra Agua/Tierra)", () => {
    const r = computeDamage(9, defaultCombatant("Raichu"), defaultCombatant("Quagsire"), "thunderbolt", DEFAULT_FIELD);
    expect(r.max).toBe(0);
    expect(r.ko).toBeNull();
  });

  it("la inmunidad por habilidad da 0 de daño (Levitación contra Terremoto)", () => {
    const r = computeDamage(9, garchomp(), { ...defaultCombatant("Gengar"), ability: "levitate" }, "earthquake", DEFAULT_FIELD);
    expect(r.max).toBe(0);
  });

  it("Pantalla Luz reduce el daño especial pero no el físico", () => {
    const base = computeDamage(9, defaultCombatant("Gengar"), defaultCombatant("Drapion"), "sludge-bomb", DEFAULT_FIELD);
    const screen = computeDamage(9, defaultCombatant("Gengar"), defaultCombatant("Drapion"), "sludge-bomb", { ...DEFAULT_FIELD, lightScreen: true });
    expect(screen.max).toBeLessThan(base.max);
    const phys = computeDamage(9, garchomp(), defaultCombatant("Drapion"), "earthquake", { ...DEFAULT_FIELD, lightScreen: true });
    expect(phys.max).toBe(188);
  });

  it("Teracristal Tierra convierte un ataque no STAB en STAB (Gen 9)", () => {
    const plain = computeDamage(9, defaultCombatant("Pikachu"), defaultCombatant("Drapion"), "dig", DEFAULT_FIELD);
    const tera = computeDamage(9, { ...defaultCombatant("Pikachu"), teraType: "ground" }, defaultCombatant("Drapion"), "dig", DEFAULT_FIELD);
    expect(plain.hasStab).toBe(false);
    expect(tera.hasStab).toBe(true);
    expect(tera.max).toBeGreaterThan(plain.max);
  });

  it("textos de KO en español", () => {
    expect(koDescription({ hits: 2, chance: 0.5 })).toBe("50 % de probabilidad de KO en 2 golpes.");
    expect(koDescription({ hits: 3, chance: null })).toBe("Posible KO en 3 golpes.");
    expect(koDescription(null)).toContain("No consigue");
  });

  it("traduce casi todos los movimientos de daño y habilidades de PokéAPI", () => {
    const damaging = Object.entries(MOVES).filter(([, m]) => m.category !== "status" && m.gen <= 9);
    const missing = damaging.filter(([slug]) => !smogonMoveName(slug, 9));
    // Algunos movimientos antiguos ya no existen en Gen 9; deben poder resolverse en su generación.
    for (const [slug, m] of missing) expect(smogonMoveName(slug, m.gen as 1), slug).toBeTruthy();
    expect(smogonAbilityName("levitate", 9)).toBe("Levitate");
    expect(smogonMoveName("u-turn", 9)).toBe("U-turn");
    expect(smogonMoveName("kings-shield", 9)).toBe("King's Shield");
  });

  it("todas las especies por defecto tienen equivalencia en @smogon/calc", () => {
    const missing = POKEMON.filter((p) => p.isDefault && !p.smogon).map((p) => p.slug);
    expect(missing).toEqual([]);
  });
});
