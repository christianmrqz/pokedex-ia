import { describe, expect, it } from "vitest";
import { getMove } from "@/lib/data/catalog";
import { getVersionGroup } from "@/lib/data/games";
import {
  canLearn,
  moveCategoryForGen,
  moveValuesForVersionGroup,
  movesForVersionGroup,
  versionGroupsWithData,
  type Learnset,
} from "@/lib/engine/learnset";
import charizard from "./fixtures/charizard.learnset.json";
import drapion from "./fixtures/drapion.learnset.json";

// Fixtures: datos reales de PokéAPI (/pokemon/{slug}) transformados con transformPokemon.
const drapionSet = drapion as Learnset;
const charizardSet = charizard as Learnset;

const order = (vg: string) => getVersionGroup(vg)!.order;

describe("movimientos aprendibles por juego (version_group_details)", () => {
  it("un movimiento no se considera aprendible en juegos donde no lo es", () => {
    // Drapion aprende Terremoto por MT en Espada/Escudo, pero no en Leyendas: Arceus.
    expect(canLearn(drapionSet, "earthquake", "sword-shield")).toBe(true);
    expect(canLearn(drapionSet, "earthquake", "legends-arceus")).toBe(false);
    const arceusMoves = movesForVersionGroup(drapionSet, "legends-arceus").map((m) => m.move);
    expect(arceusMoves).not.toContain("earthquake");
    expect(arceusMoves).toContain("cross-poison");
  });

  it("un Pokémon ausente en un juego no tiene movimientos en él", () => {
    // Drapion no está en Pokémon Escarlata/Púrpura.
    expect(versionGroupsWithData(drapionSet).has("scarlet-violet")).toBe(false);
    expect(movesForVersionGroup(drapionSet, "scarlet-violet")).toEqual([]);
  });

  it("Charizard: Ataque Ala no está en Escarlata/Púrpura y Arenas Ardientes no existía en Rojo/Azul", () => {
    expect(canLearn(charizardSet, "wing-attack", "lets-go-pikachu-lets-go-eevee")).toBe(true);
    expect(canLearn(charizardSet, "wing-attack", "scarlet-violet")).toBe(false);
    expect(canLearn(charizardSet, "scorching-sands", "sword-shield")).toBe(true);
    expect(canLearn(charizardSet, "scorching-sands", "red-blue")).toBe(false);
  });

  it("conserva método y nivel: Lanzallamas a nivel 46 en Rojo/Azul, nivel 30 y MT en Escarlata/Púrpura", () => {
    const rb = movesForVersionGroup(charizardSet, "red-blue").filter((m) => m.move === "flamethrower");
    expect(rb).toEqual([{ move: "flamethrower", method: "level-up", level: 46 }]);
    const sv = movesForVersionGroup(charizardSet, "scarlet-violet").filter((m) => m.move === "flamethrower");
    expect(sv).toEqual([
      { move: "flamethrower", method: "level-up", level: 30 },
      { move: "flamethrower", method: "machine", level: 0 },
    ]);
  });

  it("ordena por método y nivel", () => {
    const rows = movesForVersionGroup(charizardSet, "scarlet-violet");
    const levelUp = rows.filter((r) => r.method === "level-up").map((r) => r.level);
    expect(levelUp).toEqual([...levelUp].sort((a, b) => a - b));
    expect(rows[0].method).toBe("level-up");
  });
});

describe("valores históricos de movimientos", () => {
  it("Placaje: 35 de potencia hasta Gen 4, 50 en Gen 5-6 y 40 desde Gen 7", () => {
    const tackle = getMove("tackle")!;
    expect(moveValuesForVersionGroup(tackle, order("red-blue")).power).toBe(35);
    expect(moveValuesForVersionGroup(tackle, order("red-blue")).accuracy).toBe(95);
    expect(moveValuesForVersionGroup(tackle, order("black-white")).power).toBe(50);
    expect(moveValuesForVersionGroup(tackle, order("x-y")).power).toBe(50);
    expect(moveValuesForVersionGroup(tackle, order("sun-moon")).power).toBe(40);
    expect(moveValuesForVersionGroup(tackle, order("scarlet-violet")).power).toBe(40);
  });

  it("Mordisco era de tipo Normal en Gen 1 y Encanto de tipo Normal hasta Gen 5", () => {
    expect(moveValuesForVersionGroup(getMove("bite")!, order("yellow")).type).toBe("normal");
    expect(moveValuesForVersionGroup(getMove("bite")!, order("gold-silver")).type).toBe("dark");
    expect(moveValuesForVersionGroup(getMove("charm")!, order("black-2-white-2")).type).toBe("normal");
    expect(moveValuesForVersionGroup(getMove("charm")!, order("x-y")).type).toBe("fairy");
  });

  it("antes de Gen 4 la categoría depende del tipo", () => {
    // Triturar (Siniestro) era especial en Gen 3 y es físico desde Gen 4.
    expect(moveCategoryForGen("physical", "dark", 3)).toBe("special");
    expect(moveCategoryForGen("physical", "dark", 4)).toBe("physical");
    // Puño Fuego era especial en Gen 3 por ser de tipo Fuego.
    expect(moveCategoryForGen("physical", "fire", 3)).toBe("special");
    // Los movimientos de estado no cambian.
    expect(moveCategoryForGen("status", "fire", 1)).toBe("status");
  });
});
