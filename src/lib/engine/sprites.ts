/**
 * Resolución de imágenes de Pokémon con cadena de alternativas.
 * Las imágenes se sirven desde el repositorio público de sprites de PokéAPI.
 */
const BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export const PLACEHOLDER_IMAGE = "/pokemon-placeholder.svg";

export const spriteUrls = {
  artwork: (id: number, shiny = false) => `${BASE}/other/official-artwork/${shiny ? "shiny/" : ""}${id}.png`,
  home: (id: number, shiny = false) => `${BASE}/other/home/${shiny ? "shiny/" : ""}${id}.png`,
  front: (id: number, shiny = false) => `${BASE}/${shiny ? "shiny/" : ""}${id}.png`,
};

/** Subconjunto de sprites que devuelve /pokemon/{id} y que usa la aplicación. */
export interface PokemonSprites {
  artwork: string | null;
  artworkShiny: string | null;
  home: string | null;
  homeShiny: string | null;
  front: string | null;
  frontShiny: string | null;
}

export interface ResolvedArtwork {
  /** Candidatos en orden de preferencia; la interfaz pasa al siguiente si uno falla al cargar. */
  candidates: string[];
  /** true si se pidió la versión shiny pero no existe ninguna imagen shiny. */
  shinyUnavailable: boolean;
}

/**
 * Elige la mejor imagen disponible. Si la versión shiny no existe se usa la normal y se
 * indica con `shinyUnavailable`; si no hay ninguna imagen se usa el marcador genérico.
 */
export function resolveArtwork(sprites: PokemonSprites, shiny: boolean): ResolvedArtwork {
  const normal = [sprites.artwork, sprites.home, sprites.front].filter((s): s is string => !!s);
  const shinyList = [sprites.artworkShiny, sprites.homeShiny, sprites.frontShiny].filter((s): s is string => !!s);

  if (shiny && shinyList.length > 0) {
    return { candidates: [...shinyList, PLACEHOLDER_IMAGE], shinyUnavailable: false };
  }
  return { candidates: [...normal, PLACEHOLDER_IMAGE], shinyUnavailable: shiny };
}

/** Candidatos construidos solo con el id (listados y buscador, sin pedir la ficha completa). */
export function artworkCandidatesById(id: number, shiny = false): string[] {
  return [spriteUrls.artwork(id, shiny), spriteUrls.home(id, shiny), spriteUrls.front(id, shiny), PLACEHOLDER_IMAGE];
}
