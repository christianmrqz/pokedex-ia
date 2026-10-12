import type { NextConfig } from "next";
import pokemonIndex from "./src/data/generated/pokemon.json";

/**
 * Redirecciones permanentes a la URL canónica de cada ficha, antes de renderizar:
 * número de Pokédex (/pokemon/452 → /pokemon/drapion) y nombre de especie cuando la
 * forma por defecto tiene otro slug (/pokemon/deoxys → /pokemon/deoxys-normal).
 */
function pokemonRedirects() {
  const entries = pokemonIndex as { slug: string; speciesSlug: string; speciesId: number; isDefault: boolean }[];
  const slugs = new Set(entries.map((p) => p.slug));
  return entries
    .filter((p) => p.isDefault)
    .flatMap((p) => [
      { source: `/pokemon/${p.speciesId}`, destination: `/pokemon/${p.slug}`, permanent: true },
      ...(p.speciesSlug !== p.slug && !slugs.has(p.speciesSlug)
        ? [{ source: `/pokemon/${p.speciesSlug}`, destination: `/pokemon/${p.slug}`, permanent: true }]
        : []),
    ]);
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return pokemonRedirects();
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/PokeAPI/sprites/**",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
