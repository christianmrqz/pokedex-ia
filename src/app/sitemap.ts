import type { MetadataRoute } from "next";
import { POKEMON } from "@/lib/data/pokedex";
import { SITE_URL } from "@/lib/site";

const PAGES = ["", "/pokedex", "/tipos", "/calculadora/estadisticas", "/calculadora/dano", "/comparador", "/asistente", "/equipos"];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...PAGES.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 })),
    ...POKEMON.map((p) => ({ url: `${SITE_URL}/pokemon/${p.slug}`, changeFrequency: "monthly" as const, priority: p.isDefault ? 0.7 : 0.5 })),
  ];
}
