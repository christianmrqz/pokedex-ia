import { describe, expect, it } from "vitest";
import { advancedProfile, type BattleConditions } from "@/lib/engine/battle-effectiveness";
import type { TypeName } from "@/lib/domain";

const entry = (c: BattleConditions, t: TypeName) => advancedProfile(c).find((e) => e.type === t)!;

describe("efectividad avanzada", () => {
  it("Levitación anula Tierra sin cambiar la efectividad de tipos (Gengar)", () => {
    const e = entry({ gen: 9, defenderTypes: ["ghost", "poison"], defenderAbility: "levitate" }, "ground");
    expect(e.typeMultiplier).toBe(2);
    expect(e.finalMultiplier).toBe(0);
    expect(e.notes.map((n) => n.kind)).toContain("ability-immunity");
    expect(e.notes.map((n) => n.kind)).not.toContain("type");
  });

  it("una inmunidad de tipo se marca como tal y no como habilidad", () => {
    const e = entry({ gen: 9, defenderTypes: ["poison", "dark"] }, "psychic");
    expect(e.typeMultiplier).toBe(0);
    expect(e.finalMultiplier).toBe(0);
    expect(e.notes.map((n) => n.kind)).toEqual(["type"]);
  });

  it("Gravedad y Rompemoldes anulan Levitación", () => {
    expect(entry({ gen: 9, defenderTypes: ["ghost", "poison"], defenderAbility: "levitate", gravity: true }, "ground").finalMultiplier).toBe(2);
    expect(
      entry({ gen: 9, defenderTypes: ["ghost", "poison"], defenderAbility: "levitate", attackerAbility: "mold-breaker" }, "ground").finalMultiplier,
    ).toBe(2);
  });

  it("Gravedad permite a Tierra golpear a los Voladores", () => {
    const e = entry({ gen: 9, defenderTypes: ["water", "flying"], gravity: true }, "ground");
    expect(e.typeMultiplier).toBe(1);
  });

  it("las habilidades no actúan en generaciones anteriores a su existencia", () => {
    expect(entry({ gen: 2, defenderTypes: ["ghost", "poison"], defenderAbility: "levitate" }, "ground").finalMultiplier).toBe(2);
  });

  it("Teracristalización cambia los tipos defensivos (Charizard Tera Agua)", () => {
    const c: BattleConditions = { gen: 9, defenderTypes: ["fire", "flying"], teraType: "water" };
    expect(entry(c, "rock").typeMultiplier).toBe(1);
    expect(entry(c, "electric").typeMultiplier).toBe(2);
    expect(entry(c, "fire").typeMultiplier).toBe(0.5);
    // Sin Tera, Roca es ×4.
    expect(entry({ gen: 9, defenderTypes: ["fire", "flying"] }, "rock").typeMultiplier).toBe(4);
  });

  it("la Teracristalización se ignora fuera de la Gen 9 y Astral conserva los tipos", () => {
    expect(entry({ gen: 8, defenderTypes: ["fire", "flying"], teraType: "water" }, "rock").typeMultiplier).toBe(4);
    expect(entry({ gen: 9, defenderTypes: ["fire", "flying"], teraType: "stellar" }, "rock").typeMultiplier).toBe(4);
  });

  it("Sebo reduce Fuego y Hielo a la mitad (Mamoswine)", () => {
    const fire = entry({ gen: 9, defenderTypes: ["ice", "ground"], defenderAbility: "thick-fat" }, "fire");
    expect(fire.typeMultiplier).toBe(2);
    expect(fire.finalMultiplier).toBe(1);
  });

  it("Filtro reduce los ataques supereficaces a ×0.75", () => {
    const e = entry({ gen: 9, defenderTypes: ["psychic"], defenderAbility: "filter" }, "dark");
    expect(e.finalMultiplier).toBe(1.5);
  });

  it("Superguarda solo deja pasar ataques supereficaces (Shedinja)", () => {
    const c: BattleConditions = { gen: 9, defenderTypes: ["bug", "ghost"], defenderAbility: "wonder-guard" };
    expect(entry(c, "fire").finalMultiplier).toBe(2);
    expect(entry(c, "water").finalMultiplier).toBe(0);
    expect(entry(c, "water").notes.map((n) => n.key)).toContain("note.wonderGuard");
    expect(entry(c, "normal").notes.map((n) => n.kind)).toContain("type");
  });

  it("Intrépido permite golpear a Fantasma con Normal y Lucha", () => {
    const c: BattleConditions = { gen: 9, defenderTypes: ["ghost"], attackerAbility: "scrappy" };
    expect(entry(c, "normal").finalMultiplier).toBe(1);
    expect(entry(c, "fighting").finalMultiplier).toBe(1);
  });

  it("Globo anula Tierra; Blanco Seguro elimina inmunidades de tipo", () => {
    expect(entry({ gen: 9, defenderTypes: ["steel"], defenderItem: "air-balloon" }, "ground").finalMultiplier).toBe(0);
    expect(entry({ gen: 9, defenderTypes: ["ghost", "poison"], defenderItem: "ring-target" }, "normal").finalMultiplier).toBe(1);
  });

  it("Turbulencia elimina las debilidades del tipo Volador (Mega-Rayquaza)", () => {
    const e = entry({ gen: 9, defenderTypes: ["dragon", "flying"], strongWinds: true }, "ice");
    expect(e.typeMultiplier).toBe(2);
    expect(entry({ gen: 9, defenderTypes: ["dragon", "flying"] }, "ice").typeMultiplier).toBe(4);
  });

  it("Respiro elimina el tipo Volador; un Volador puro pasa a Normal desde Gen 5", () => {
    expect(entry({ gen: 9, defenderTypes: ["flying"], roost: true }, "fighting").typeMultiplier).toBe(2);
    expect(entry({ gen: 9, defenderTypes: ["water", "flying"], roost: true }, "ground").typeMultiplier).toBe(1);
  });

  it("Cromolente duplica los ataques poco eficaces", () => {
    const e = entry({ gen: 9, defenderTypes: ["steel"], attackerAbility: "tinted-lens" }, "bug");
    expect(e.typeMultiplier).toBe(0.5);
    expect(e.finalMultiplier).toBe(1);
  });
});
