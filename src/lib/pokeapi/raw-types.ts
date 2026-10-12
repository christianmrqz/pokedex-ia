/** Formas (parciales) de las respuestas REST de PokéAPI que usa la aplicación. */

export interface NamedResource {
  name: string;
  url: string;
}

export interface LangText {
  language: NamedResource;
}

type SpriteSet = { front_default: string | null; front_shiny?: string | null };

export interface RawPokemon {
  id: number;
  name: string;
  base_experience: number | null;
  height: number;
  weight: number;
  is_default: boolean;
  species: NamedResource;
  types: { slot: number; type: NamedResource }[];
  past_types: { generation: NamedResource; types: { slot: number; type: NamedResource }[] }[];
  abilities: { is_hidden: boolean; slot: number; ability: NamedResource | null }[];
  past_abilities?: { generation: NamedResource; abilities: { is_hidden: boolean; slot: number; ability: NamedResource | null }[] }[];
  stats: { base_stat: number; effort: number; stat: NamedResource }[];
  forms: NamedResource[];
  held_items: { item: NamedResource }[];
  cries?: { latest: string | null; legacy: string | null };
  moves: {
    move: NamedResource;
    version_group_details: {
      level_learned_at: number;
      move_learn_method: NamedResource;
      version_group: NamedResource;
    }[];
  }[];
  sprites: SpriteSet & {
    other?: {
      "official-artwork"?: SpriteSet;
      home?: SpriteSet;
    };
  };
}

export interface RawSpecies {
  id: number;
  name: string;
  generation: NamedResource;
  is_legendary: boolean;
  is_mythical: boolean;
  is_baby: boolean;
  capture_rate: number;
  base_happiness: number | null;
  gender_rate: number;
  hatch_counter: number | null;
  growth_rate: NamedResource | null;
  egg_groups: NamedResource[];
  color: NamedResource | null;
  habitat: NamedResource | null;
  evolves_from_species: NamedResource | null;
  evolution_chain: { url: string } | null;
  names: ({ name: string } & LangText)[];
  genera: ({ genus: string } & LangText)[];
  flavor_text_entries: ({ flavor_text: string; version: NamedResource } & LangText)[];
  varieties: { is_default: boolean; pokemon: NamedResource }[];
}

export interface RawEvolutionDetail {
  trigger: NamedResource;
  min_level: number | null;
  item: NamedResource | null;
  held_item: NamedResource | null;
  known_move: NamedResource | null;
  known_move_type: NamedResource | null;
  location: NamedResource | null;
  min_happiness: number | null;
  min_affection: number | null;
  min_beauty: number | null;
  time_of_day: string;
  gender: number | null;
  needs_overworld_rain: boolean;
  party_species: NamedResource | null;
  party_type: NamedResource | null;
  relative_physical_stats: number | null;
  trade_species: NamedResource | null;
  turn_upside_down: boolean;
}

export interface RawChainLink {
  species: NamedResource;
  is_baby: boolean;
  evolution_details: RawEvolutionDetail[];
  evolves_to: RawChainLink[];
}

export interface RawEvolutionChain {
  id: number;
  chain: RawChainLink;
}

export interface RawNamedWithNames {
  name: string;
  names: ({ name: string } & LangText)[];
}
