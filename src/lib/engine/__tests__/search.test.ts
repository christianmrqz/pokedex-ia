import { describe, expect, it } from "vitest";
import searchRows from "@/data/generated/search-index.json";
import { editDistance, normalize, searchPokemon, toSearchItems, type RawSearchRow } from "@/lib/engine/search";

const items = toSearchItems(searchRows as RawSearchRow[]);
const top = (q: string) => searchPokemon(items, q, 5)[0]?.item.slug;

describe("buscador", () => {
  it("encuentra Drapion por nombre exacto", () => {
    expect(top("Drapion")).toBe("drapion");
    expect(top("drapion")).toBe("drapion");
  });

  it("busca por número de Pokédex", () => {
    expect(top("452")).toBe("drapion");
    expect(top("#452")).toBe("drapion");
    expect(top("0452")).toBe("drapion");
  });

  it("tolera errores menores", () => {
    expect(top("drapoin")).toBe("drapion");
    expect(top("garchonp")).toBe("garchomp");
    expect(top("charizrd")).toBe("charizard");
  });

  it("autocompleta por prefijo priorizando la forma base", () => {
    expect(top("drap")).toBe("drapion");
    expect(top("chari")).toBe("charizard");
  });

  it("ignora acentos y signos", () => {
    expect(normalize("Flabébé")).toBe("flabebe");
    expect(normalize("Mr. Mime")).toBe("mr mime");
    expect(top("flabebe")).toBe("flabebe");
    expect(top("mr mime")).toBe("mr-mime");
  });

  it("encuentra formas por su nombre en español", () => {
    expect(top("Rotom Lavado")).toBe("rotom-wash");
  });

  it("distancia de edición con transposiciones", () => {
    expect(editDistance("drapoin", "drapion")).toBe(1);
    expect(editDistance("abc", "abc")).toBe(0);
  });
});
