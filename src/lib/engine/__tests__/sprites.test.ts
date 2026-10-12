import { describe, expect, it } from "vitest";
import { PLACEHOLDER_IMAGE, artworkCandidatesById, resolveArtwork, type PokemonSprites } from "@/lib/engine/sprites";
import sprites from "./fixtures/sprites.json";

// Fixtures: sprites reales de PokéAPI.
const fixtures = sprites as Record<string, PokemonSprites>;

describe("resolución de imágenes", () => {
  it("si falta el artwork shiny oficial se usa otra imagen shiny disponible", () => {
    const r = resolveArtwork(fixtures["garchomp-mega-z"], true);
    expect(r.shinyUnavailable).toBe(false);
    expect(r.candidates[0]).toContain("/home/shiny/10309.png");
    expect(r.candidates.at(-1)).toBe(PLACEHOLDER_IMAGE);
  });

  it("una forma sin ninguna imagen usa el marcador genérico", () => {
    const normal = resolveArtwork(fixtures["koraidon-limited-build"], false);
    expect(normal.candidates).toEqual([PLACEHOLDER_IMAGE]);
    const shiny = resolveArtwork(fixtures["koraidon-limited-build"], true);
    expect(shiny.candidates).toEqual([PLACEHOLDER_IMAGE]);
    expect(shiny.shinyUnavailable).toBe(true);
  });

  it("una imagen shiny inexistente recurre a la versión normal y lo indica", () => {
    const onlyNormal: PokemonSprites = {
      ...fixtures["garchomp-mega-z"],
      artworkShiny: null,
      homeShiny: null,
      frontShiny: null,
    };
    const r = resolveArtwork(onlyNormal, true);
    expect(r.shinyUnavailable).toBe(true);
    expect(r.candidates[0]).toBe(onlyNormal.artwork);
    expect(r.candidates).not.toContain(null);
  });

  it("la versión normal prefiere el artwork oficial", () => {
    const r = resolveArtwork(fixtures["garchomp-mega-z"], false);
    expect(r.candidates[0]).toContain("/official-artwork/10309.png");
    expect(r.shinyUnavailable).toBe(false);
  });

  it("los candidatos por id terminan siempre en el marcador", () => {
    const c = artworkCandidatesById(452, true);
    expect(c[0]).toContain("/official-artwork/shiny/452.png");
    expect(c.at(-1)).toBe(PLACEHOLDER_IMAGE);
  });
});
