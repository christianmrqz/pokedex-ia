import { TYPE_CHART } from "@smogon/calc";
import { describe, expect, it } from "vitest";
import { GENERATIONS, type Generation, type TypeName } from "@/lib/domain";
import {
  defensiveProfile,
  getTypeChart,
  typeEffectiveness,
  typesForGen,
  typesInGen,
} from "@/lib/engine/type-chart";
import { getPokemonBySlug } from "@/lib/data/pokedex";

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

describe("motor de tipos — casos obligatorios", () => {
  const drapion: TypeName[] = ["poison", "dark"];

  it("Drapion (Veneno/Siniestro) es débil a Tierra ×2", () => {
    expect(typeEffectiveness("ground", drapion, 9)).toBe(2);
  });

  it("Drapion es inmune a Psíquico ×0", () => {
    expect(typeEffectiveness("psychic", drapion, 9)).toBe(0);
  });

  it("Drapion resiste Planta, Veneno, Fantasma y Siniestro ×0.5", () => {
    for (const t of ["grass", "poison", "ghost", "dark"] as TypeName[]) {
      expect(typeEffectiveness(t, drapion, 9), t).toBe(0.5);
    }
  });

  it("Drapion solo tiene una debilidad natural: Tierra", () => {
    const profile = defensiveProfile(drapion, 9);
    expect(profile.quad).toEqual([]);
    expect(profile.double).toEqual(["ground"]);
    expect(profile.immune).toEqual(["psychic"]);
    expect(profile.quarter).toEqual([]);
    expect(profile.half.sort()).toEqual(["dark", "ghost", "grass", "poison"]);
    // Lucha: ×2 contra Siniestro pero ×0.5 contra Veneno → neutro.
    expect(typeEffectiveness("fighting", drapion, 9)).toBe(1);
    // Hada: ×2 contra Siniestro pero ×0.5 contra Veneno → neutro.
    expect(typeEffectiveness("fairy", drapion, 9)).toBe(1);
  });

  it("Agua/Volador recibe Eléctrico ×4", () => {
    expect(typeEffectiveness("electric", ["water", "flying"], 9)).toBe(4);
  });

  it("Agua/Tierra recibe Eléctrico ×0", () => {
    expect(typeEffectiveness("electric", ["water", "ground"], 9)).toBe(0);
  });

  it("Planta/Acero recibe Fuego ×4", () => {
    expect(typeEffectiveness("fire", ["grass", "steel"], 9)).toBe(4);
  });

  it("Bicho/Acero (Scizor) recibe Fuego ×4 y es inmune a Veneno", () => {
    expect(typeEffectiveness("fire", ["bug", "steel"], 9)).toBe(4);
    expect(typeEffectiveness("poison", ["bug", "steel"], 9)).toBe(0);
  });

  it("los multiplicadores ×0.25 se calculan correctamente", () => {
    // Planta contra Fuego/Volador: 0.5 × 0.5
    expect(typeEffectiveness("grass", ["fire", "flying"], 9)).toBe(0.25);
  });
});

describe("motor de tipos — monotipo", () => {
  it("un Pokémon monotipo usa solo su tipo", () => {
    expect(typeEffectiveness("water", ["fire"], 9)).toBe(2);
    expect(typeEffectiveness("fire", ["fire"], 9)).toBe(0.5);
    expect(typeEffectiveness("normal", ["ghost"], 9)).toBe(0);
    expect(typeEffectiveness("dragon", ["fairy"], 9)).toBe(0);
  });

  it("un tipo duplicado no multiplica dos veces", () => {
    expect(typeEffectiveness("water", ["fire", "fire"], 9)).toBe(2);
  });

  it("el perfil defensivo de un monotipo no tiene ×4 ni ×0.25", () => {
    for (const t of typesInGen(9)) {
      const p = defensiveProfile([t], 9);
      expect(p.quad, t).toEqual([]);
      expect(p.quarter, t).toEqual([]);
      expect(p.entries).toHaveLength(18);
    }
  });
});

describe("motor de tipos — cambios por generación", () => {
  it("Gen 1: Fantasma no afecta a Psíquico, Bicho y Veneno ×2 mutuos, Hielo neutro contra Fuego", () => {
    expect(typeEffectiveness("ghost", ["psychic"], 1)).toBe(0);
    expect(typeEffectiveness("bug", ["poison"], 1)).toBe(2);
    expect(typeEffectiveness("poison", ["bug"], 1)).toBe(2);
    expect(typeEffectiveness("ice", ["fire"], 1)).toBe(1);
    // A partir de Gen 2 cambian.
    expect(typeEffectiveness("ghost", ["psychic"], 2)).toBe(2);
    expect(typeEffectiveness("bug", ["poison"], 2)).toBe(0.5);
    expect(typeEffectiveness("poison", ["bug"], 2)).toBe(1);
    expect(typeEffectiveness("ice", ["fire"], 2)).toBe(0.5);
  });

  it("Gen 2-5: Acero resiste Fantasma y Siniestro; desde Gen 6 no", () => {
    for (const g of [2, 3, 4, 5] as Generation[]) {
      expect(typeEffectiveness("ghost", ["steel"], g)).toBe(0.5);
      expect(typeEffectiveness("dark", ["steel"], g)).toBe(0.5);
    }
    for (const g of [6, 7, 8, 9] as Generation[]) {
      expect(typeEffectiveness("ghost", ["steel"], g)).toBe(1);
      expect(typeEffectiveness("dark", ["steel"], g)).toBe(1);
    }
  });

  it("los tipos existen solo desde su generación", () => {
    expect(typesInGen(1)).toHaveLength(15);
    expect(typesInGen(1)).not.toContain("dark");
    expect(typesInGen(1)).not.toContain("steel");
    expect(typesInGen(5)).toHaveLength(17);
    expect(typesInGen(5)).not.toContain("fairy");
    expect(typesInGen(6)).toHaveLength(18);
  });

  it("Clefairy era tipo Normal hasta Gen 5 y Hada desde Gen 6", () => {
    const clefairy = getPokemonBySlug("clefairy")!;
    expect(typesForGen(clefairy, 5)).toEqual(["normal"]);
    expect(typesForGen(clefairy, 6)).toEqual(["fairy"]);
    expect(typeEffectiveness("fighting", typesForGen(clefairy, 5), 5)).toBe(2);
    expect(typeEffectiveness("dragon", typesForGen(clefairy, 6), 6)).toBe(0);
  });

  it("Magnemite pierde el tipo Acero en Gen 1", () => {
    const magnemite = getPokemonBySlug("magnemite")!;
    expect(typesForGen(magnemite, 1)).toEqual(["electric"]);
    expect(typesForGen(magnemite, 2)).toEqual(["electric", "steel"]);
  });

  it.each(GENERATIONS)("la tabla de la Gen %i coincide con la de @smogon/calc", (gen) => {
    const ours = getTypeChart(gen);
    const smogon = (TYPE_CHART as unknown as Record<number, Record<string, Record<string, number>>>)[gen];
    for (const atk of typesInGen(gen)) {
      for (const def of typesInGen(gen)) {
        expect(ours[atk][def], `${atk} → ${def} (Gen ${gen})`).toBe(smogon[cap(atk)][cap(def)]);
      }
    }
  });
});
