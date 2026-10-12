import { getVersionGroup } from "@/lib/data/games";
import { resolvePokemon } from "@/lib/data/pokedex";
import { versionGroupsWithData } from "@/lib/engine/learnset";
import { getPokemonDetail } from "@/lib/pokeapi/services";
import { buildMoveSubset } from "@/lib/pokemon/view-models";

/**
 * Movimientos aprendibles de un Pokémon (learnset de PokéAPI + datos de cada movimiento).
 * Lo usan el comparador y la calculadora de daño desde el navegador.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/pokemon/[slug]">) {
  const { slug } = await ctx.params;
  const entry = resolvePokemon(slug);
  if (!entry) return Response.json({ error: "Pokémon no encontrado" }, { status: 404 });
  try {
    const detail = await getPokemonDetail(entry.slug);
    if (!detail) return Response.json({ error: "Pokémon no encontrado en PokéAPI" }, { status: 404 });
    const versionGroups = [...versionGroupsWithData(detail.learnset)]
      .filter((vg) => getVersionGroup(vg))
      .sort((a, b) => getVersionGroup(a)!.order - getVersionGroup(b)!.order);
    return Response.json(
      { slug: entry.slug, learnset: detail.learnset, moves: buildMoveSubset(detail.learnset), versionGroups, abilities: detail.abilities },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
    );
  } catch {
    return Response.json({ error: "PokéAPI no está disponible ahora mismo" }, { status: 502 });
  }
}
