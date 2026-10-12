/**
 * Genera los índices estáticos de la aplicación a partir de PokéAPI (GraphQL v1beta).
 *
 * Se ejecuta UNA vez (npm run data:build) y el resultado se versiona en
 * src/data/generated/. Así la búsqueda, los filtros y el motor de tipos funcionan
 * sin descargar miles de fichas en cada visita (política de uso justo de PokéAPI).
 *
 * Fuentes:
 *  - PokéAPI (https://pokeapi.co) — datos principales.
 *  - @smogon/calc — solo para mapear nombres de especies/objetos al formato de la calculadora.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ITEMS, SPECIES, toID } from "@smogon/calc";

const ENDPOINT = "https://beta.pokeapi.co/graphql/v1beta";
const OUT_DIR = join(process.cwd(), "src", "data", "generated");
const ES = 7;
const EN = 9;

const STAT_KEYS = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"] as const;

async function gql<T>(query: string, attempt = 1): Promise<T> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "pokedex-ia-data-build" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data?: T; errors?: unknown };
    if (json.errors || !json.data) throw new Error(JSON.stringify(json.errors).slice(0, 500));
    return json.data;
  } catch (err) {
    if (attempt >= 4) throw err;
    const wait = 1000 * 2 ** attempt;
    console.warn(`  reintento ${attempt} en ${wait} ms: ${(err as Error).message}`);
    await new Promise((r) => setTimeout(r, wait));
    return gql<T>(query, attempt + 1);
  }
}

const REST = "https://pokeapi.co/api/v2/";

async function rest<T>(path: string, attempt = 1): Promise<T> {
  try {
    const res = await fetch(path.startsWith("http") ? path : REST + path, {
      headers: { "User-Agent": "pokedex-ia-data-build" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
    return (await res.json()) as T;
  } catch (err) {
    if (attempt >= 4) throw err;
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    return rest<T>(path, attempt + 1);
  }
}

/** Ejecuta tareas con concurrencia limitada para no saturar PokéAPI. */
async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

type RestNamed = { name: string; url: string };
type RestLangName = { name: string; language: RestNamed };
const restPick = (names: RestLangName[] | undefined, lang: "es" | "en") => names?.find((n) => n.language.name === lang)?.name;

function write(name: string, data: unknown) {
  mkdirSync(OUT_DIR, { recursive: true });
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data));
  console.log(`  ✓ ${name} (${(JSON.stringify(data).length / 1024).toFixed(0)} KB)`);
}

type Named = { name: string };
type LangName = { name: string; language_id: number };

const pick = (names: LangName[] | undefined, lang: number) => names?.find((n) => n.language_id === lang)?.name;
const clean = (s: string | undefined | null) => (s ?? "").replace(/[\n\f\r­]+/g, " ").replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
async function buildTypes() {
  console.log("Tipos…");
  const data = await gql<{
    pokemon_v2_type: { id: number; name: string; generation_id: number; pokemon_v2_typenames: LangName[] }[];
    pokemon_v2_typeefficacy: { damage_factor: number; damage_type_id: number; target_type_id: number }[];
    pokemon_v2_typeefficacypast: { damage_factor: number; generation_id: number; damage_type_id: number; target_type_id: number }[];
  }>(`{
    pokemon_v2_type(where: {id: {_lt: 19}}, order_by: {id: asc}) {
      id name generation_id
      pokemon_v2_typenames(where: {language_id: {_in: [${ES}, ${EN}]}}) { name language_id }
    }
    pokemon_v2_typeefficacy { damage_factor damage_type_id target_type_id }
    pokemon_v2_typeefficacypast { damage_factor generation_id damage_type_id target_type_id }
  }`);
  const byId = new Map(data.pokemon_v2_type.map((t) => [t.id, t.name]));
  const types = data.pokemon_v2_type.map((t) => ({
    slug: t.name,
    introducedIn: t.generation_id,
    es: pick(t.pokemon_v2_typenames, ES) ?? t.name,
    en: pick(t.pokemon_v2_typenames, EN) ?? t.name,
  }));
  // Solo se guardan los factores distintos de 1 (×100 en PokéAPI).
  const current = data.pokemon_v2_typeefficacy
    .filter((e) => e.damage_factor !== 100 && byId.has(e.damage_type_id) && byId.has(e.target_type_id))
    .map((e) => [byId.get(e.damage_type_id)!, byId.get(e.target_type_id)!, e.damage_factor / 100] as const);
  const past = data.pokemon_v2_typeefficacypast
    .filter((e) => byId.has(e.damage_type_id) && byId.has(e.target_type_id))
    .map((e) => ({
      attack: byId.get(e.damage_type_id)!,
      defense: byId.get(e.target_type_id)!,
      factor: e.damage_factor / 100,
      untilGen: e.generation_id,
    }));
  write("types.json", { source: "PokéAPI type efficacy", types, current, past });
}

// ---------------------------------------------------------------------------
// Pokémon (variedades) + especies
// ---------------------------------------------------------------------------
async function buildPokemon() {
  console.log("Pokémon…");
  const data = await gql<{
    pokemon_v2_pokemon: {
      id: number;
      name: string;
      is_default: boolean;
      height: number;
      weight: number;
      pokemon_species_id: number;
      pokemon_v2_pokemontypes: { slot: number; pokemon_v2_type: Named }[];
      pokemon_v2_pokemontypepasts: { slot: number; generation_id: number; pokemon_v2_type: Named }[];
      pokemon_v2_pokemonstats: { base_stat: number; pokemon_v2_stat: Named }[];
      pokemon_v2_pokemonabilities: { is_hidden: boolean; slot: number; pokemon_v2_ability: Named }[];
      pokemon_v2_pokemonforms: {
        form_name: string;
        is_mega: boolean;
        is_battle_only: boolean;
        pokemon_v2_pokemonformnames: { name: string; pokemon_name: string; language_id: number }[];
      }[];
    }[];
    pokemon_v2_pokemonspecies: {
      id: number;
      name: string;
      generation_id: number;
      is_legendary: boolean;
      is_mythical: boolean;
      is_baby: boolean;
      pokemon_v2_pokemonspeciesnames: LangName[];
    }[];
  }>(`{
    pokemon_v2_pokemon(order_by: {id: asc}) {
      id name is_default height weight pokemon_species_id
      pokemon_v2_pokemontypes(order_by: {slot: asc}) { slot pokemon_v2_type { name } }
      pokemon_v2_pokemontypepasts(order_by: {slot: asc}) { slot generation_id pokemon_v2_type { name } }
      pokemon_v2_pokemonstats { base_stat pokemon_v2_stat { name } }
      pokemon_v2_pokemonabilities(order_by: {slot: asc}) { is_hidden slot pokemon_v2_ability { name } }
      pokemon_v2_pokemonforms(where: {is_default: {_eq: true}}) {
        form_name is_mega is_battle_only
        pokemon_v2_pokemonformnames(where: {language_id: {_in: [${ES}, ${EN}]}}) { name pokemon_name language_id }
      }
    }
    pokemon_v2_pokemonspecies(order_by: {id: asc}) {
      id name generation_id is_legendary is_mythical is_baby
      pokemon_v2_pokemonspeciesnames(where: {language_id: {_in: [${ES}, ${EN}]}}) { name language_id }
    }
  }`);

  const species = new Map(data.pokemon_v2_pokemonspecies.map((s) => [s.id, s]));
  const smogonIds = buildSmogonSpeciesIds();
  let unmatched = 0;

  // La réplica GraphQL puede ir por detrás de la API REST: se completan las variedades que falten.
  const restList = await rest<{ results: RestNamed[] }>("pokemon?limit=5000");
  // REST manda en los nombres: algunas variedades se renombraron (frillish → frillish-male) con el mismo id.
  const restNameById = new Map(restList.results.map((r) => [Number(r.url.split("/").at(-2)), r.name]));
  for (const p of data.pokemon_v2_pokemon) {
    const restName = restNameById.get(p.id);
    if (restName && restName !== p.name) p.name = restName;
  }
  const knownIds = new Set(data.pokemon_v2_pokemon.map((p) => p.id));
  const missing = restList.results.filter((r) => !knownIds.has(Number(r.url.split("/").at(-2))));
  console.log(`  ${missing.length} variedades solo disponibles en REST, descargando…`);
  const supplemented = await pool(missing, 4, async (r) => {
    const p = await rest<{
      id: number;
      name: string;
      is_default: boolean;
      height: number;
      weight: number;
      species: RestNamed;
      types: { slot: number; type: RestNamed }[];
      past_types: { generation: RestNamed; types: { slot: number; type: RestNamed }[] }[];
      stats: { base_stat: number; stat: RestNamed }[];
      abilities: { is_hidden: boolean; slot: number; ability: RestNamed }[];
      forms: RestNamed[];
    }>(r.url);
    const form = await rest<{
      form_name: string;
      is_mega: boolean;
      is_battle_only: boolean;
      names: RestLangName[];
      form_names: RestLangName[];
    }>(p.forms[0].url);
    const speciesId = Number(p.species.url.split("/").at(-2));
    const toLang = (names: RestLangName[], lang: "es" | "en") => {
      const n = restPick(names, lang);
      return n ? [{ name: n, language_id: lang === "es" ? ES : EN }] : [];
    };
    return {
      id: p.id,
      name: p.name,
      is_default: p.is_default,
      height: p.height,
      weight: p.weight,
      pokemon_species_id: speciesId,
      pokemon_v2_pokemontypes: p.types.map((t) => ({ slot: t.slot, pokemon_v2_type: { name: t.type.name } })),
      pokemon_v2_pokemontypepasts: p.past_types.flatMap((pt) =>
        pt.types.map((t) => ({
          slot: t.slot,
          generation_id: Number(pt.generation.url.split("/").at(-2)),
          pokemon_v2_type: { name: t.type.name },
        })),
      ),
      pokemon_v2_pokemonstats: p.stats.map((s) => ({ base_stat: s.base_stat, pokemon_v2_stat: { name: s.stat.name } })),
      pokemon_v2_pokemonabilities: p.abilities.map((a) => ({
        is_hidden: a.is_hidden,
        slot: a.slot,
        pokemon_v2_ability: { name: a.ability.name },
      })),
      pokemon_v2_pokemonforms: [
        {
          form_name: form.form_name,
          is_mega: form.is_mega,
          is_battle_only: form.is_battle_only,
          pokemon_v2_pokemonformnames: (["es", "en"] as const).flatMap((lang) =>
            toLang(form.names, lang).map((n) => ({
              name: restPick(form.form_names, lang) ?? "",
              pokemon_name: n.name,
              language_id: n.language_id,
            })),
          ),
        },
      ],
    };
  });
  const allPokemon = [...data.pokemon_v2_pokemon, ...supplemented].sort((a, b) => a.id - b.id);

  // Especies con más de una forma "por defecto" (datos desfasados): se resuelve con REST.
  const defaultsBySpecies = new Map<number, typeof allPokemon>();
  for (const p of allPokemon.filter((x) => x.is_default)) {
    defaultsBySpecies.set(p.pokemon_species_id, [...(defaultsBySpecies.get(p.pokemon_species_id) ?? []), p]);
  }
  const conflicts = [...defaultsBySpecies.entries()].filter(([, list]) => list.length > 1);
  for (const [speciesId, list] of conflicts) {
    const sp = await rest<{ varieties: { is_default: boolean; pokemon: RestNamed }[] }>(`pokemon-species/${speciesId}`);
    const def = sp.varieties.find((v) => v.is_default)?.pokemon.name;
    for (const p of list) p.is_default = p.name === def;
  }
  if (conflicts.length) console.log(`  ${conflicts.length} especies con forma por defecto corregida desde REST`);

  const entries = allPokemon
    .filter((p) => species.has(p.pokemon_species_id))
    .map((p) => {
      const sp = species.get(p.pokemon_species_id)!;
      const spEs = pick(sp.pokemon_v2_pokemonspeciesnames, ES) ?? pick(sp.pokemon_v2_pokemonspeciesnames, EN) ?? sp.name;
      const spEn = pick(sp.pokemon_v2_pokemonspeciesnames, EN) ?? sp.name;
      const form = p.pokemon_v2_pokemonforms[0];
      const formNames = form?.pokemon_v2_pokemonformnames ?? [];
      const fullEs = formNames.find((n) => n.language_id === ES)?.pokemon_name;
      const fullEn = formNames.find((n) => n.language_id === EN)?.pokemon_name;
      const formEs = formNames.find((n) => n.language_id === ES)?.name;
      const formEn = formNames.find((n) => n.language_id === EN)?.name;

      let es = spEs;
      let en = spEn;
      if (!p.is_default) {
        const suffix = p.name
          .replace(`${sp.name}-`, "")
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        en = fullEn || (formEn ? `${spEn} (${formEn})` : `${spEn} (${suffix})`);
        // Sin traducción oficial al español: se construye un nombre a partir de reglas conocidas.
        const megaSuffix = p.name.match(/-mega(?:-([xyz]))?$/);
        const region = p.name.match(/-(alola|galar|hisui|paldea)\b/)?.[1];
        const regionEs: Record<string, string> = { alola: "Alola", galar: "Galar", hisui: "Hisui", paldea: "Paldea" };
        const gender = p.name.match(/-(female|male)$/)?.[1];
        es =
          fullEs ||
          (formEs ? (formEs.includes(spEs) ? formEs : `${spEs} (${formEs})`) : undefined) ||
          (p.name.endsWith("-gmax") ? `${spEs} Gigamax` : undefined) ||
          (megaSuffix ? `Mega-${spEs}${megaSuffix[1] ? " " + megaSuffix[1].toUpperCase() : ""}` : undefined) ||
          (region && p.name === `${sp.name}-${region}` ? `${spEs} (Forma de ${regionEs[region]})` : undefined) ||
          (gender ? `${spEs} (${gender === "female" ? "Hembra" : "Macho"})` : undefined) ||
          en;
      }

      const statMap = new Map(p.pokemon_v2_pokemonstats.map((s) => [s.pokemon_v2_stat.name, s.base_stat]));
      const stats = STAT_KEYS.map((k) => statMap.get(k) ?? 0);

      const pastByGen = new Map<number, string[]>();
      for (const t of p.pokemon_v2_pokemontypepasts) {
        const arr = pastByGen.get(t.generation_id) ?? [];
        arr[t.slot - 1] = t.pokemon_v2_type.name;
        pastByGen.set(t.generation_id, arr);
      }

      const types = p.pokemon_v2_pokemontypes.map((t) => t.pokemon_v2_type.name);
      const smogon = resolveSmogonName(p.name, sp.name, stats, types, smogonIds);
      if (!smogon) unmatched++;

      const kind = form?.is_mega
        ? "mega"
        : p.name.endsWith("-gmax")
          ? "gmax"
          : /-(alola|galar|hisui|paldea)/.test(p.name)
            ? "regional"
            : p.is_default
              ? undefined
              : "form";

      return {
        id: p.id,
        slug: p.name,
        speciesId: sp.id,
        speciesSlug: sp.name,
        es,
        en,
        gen: sp.generation_id,
        types,
        ...(pastByGen.size ? { pastTypes: [...pastByGen].map(([untilGen, types]) => ({ untilGen, types: types.filter(Boolean) })) } : {}),
        stats,
        abilities: p.pokemon_v2_pokemonabilities.filter((a) => !a.is_hidden).map((a) => a.pokemon_v2_ability.name),
        ...(p.pokemon_v2_pokemonabilities.some((a) => a.is_hidden)
          ? { hidden: p.pokemon_v2_pokemonabilities.find((a) => a.is_hidden)!.pokemon_v2_ability.name }
          : {}),
        height: p.height,
        weight: p.weight,
        isDefault: p.is_default,
        ...(kind ? { kind } : {}),
        ...(form?.is_battle_only ? { battleOnly: true } : {}),
        ...(sp.is_legendary ? { legendary: true } : {}),
        ...(sp.is_mythical ? { mythical: true } : {}),
        ...(smogon ? { smogon } : {}),
        ...(smogon && statHistory(smogon, stats).length ? { statHistory: statHistory(smogon, stats) } : {}),
      };
    });
  console.log(`  ${entries.length} Pokémon, ${unmatched} sin equivalencia en @smogon/calc`);
  write("pokemon.json", entries);
  // Índice ligero para el buscador del navegador: [id, slug, nº Pokédex, es, en, tipos, esPorDefecto]
  write(
    "search-index.json",
    entries.map((e) => [e.id, e.slug, e.speciesId, e.es, e.en, e.types, e.isDefault ? 1 : 0]),
  );
}

/** id normalizado → nombre de especie en @smogon/calc (unión de todas las generaciones). */
function buildSmogonSpeciesIds() {
  const map = new Map<string, string>();
  for (let g = 9; g >= 1; g--) {
    const table = (SPECIES as unknown as Record<number, Record<string, unknown>>)[g];
    for (const name of Object.keys(table)) {
      const id = toID(name);
      if (!map.has(id)) map.set(id, name);
    }
  }
  return map;
}

type SmogonSpecies = { types: string[]; bs: Record<string, number> };

/**
 * Estadísticas base de generaciones anteriores (p. ej. los ajustes de Gen 6), según @smogon/calc.
 * Devuelve tramos { untilGen, stats } solo cuando difieren de las actuales.
 * En Gen 1 la estadística Especial única se replica en Ataque Esp. y Defensa Esp.
 */
function statHistory(smogonName: string, current: number[]) {
  const out: { untilGen: number; stats: number[] }[] = [];
  for (let g = 1; g <= 8; g++) {
    const s = (SPECIES as unknown as Record<number, Record<string, { bs: Record<string, number> }>>)[g][smogonName];
    if (!s) continue;
    const bs = s.bs;
    const stats = [bs.hp, bs.at, bs.df, bs.sa ?? bs.sl, bs.sd ?? bs.sl, bs.sp];
    const last = out.at(-1);
    if (last && last.stats.join() === stats.join()) last.untilGen = g;
    else out.push({ untilGen: g, stats });
  }
  // Se descartan los tramos finales idénticos a las estadísticas actuales.
  while (out.length && out.at(-1)!.stats.join() === current.join()) out.pop();
  return out;
}

function smogonSpecies(name: string): SmogonSpecies | undefined {
  for (let g = 9; g >= 1; g--) {
    const s = (SPECIES as unknown as Record<number, Record<string, SmogonSpecies>>)[g][name];
    if (s) return s;
  }
  return undefined;
}

/**
 * Busca el nombre equivalente en @smogon/calc. Primero por nombre (con transformaciones
 * conocidas: -female → -F, Gigamax/Totem → forma base…). Solo se acepta un nombre de
 * otra forma si las estadísticas base y los tipos coinciden exactamente.
 */
function resolveSmogonName(slug: string, speciesSlug: string, stats: number[], types: string[], ids: Map<string, string>) {
  const special: Record<string, string> = {
    "necrozma-dusk": "Necrozma-Dusk-Mane",
    "necrozma-dawn": "Necrozma-Dawn-Wings",
    "zygarde-10-power-construct": "Zygarde-10%",
    "darmanitan-galar-standard": "Darmanitan-Galar",
  };
  const direct = [
    slug,
    slug.replace(/-female$/, "-f").replace(/-male$/, "-m"),
    slug.replace(/-(breed|mask|plumage)$/, ""),
    slug.replace(/^minior-\w+-meteor$/, "minior-meteor"),
  ];
  if (special[slug]) return special[slug];
  for (const c of direct) {
    const hit = ids.get(c.replace(/-/g, ""));
    if (hit) return hit;
  }
  // Candidatos que solo valen si estadísticas y tipos son idénticos.
  const loose = [
    slug.replace(/-gmax$/, ""),
    slug.replace(/-totem/, ""),
    slug.replace(/-gmax$/, "").replace(/-(amped|single-strike)$/, ""),
    speciesSlug,
  ];
  const order = ["hp", "at", "df", "sa", "sd", "sp"];
  for (const c of loose) {
    const name = ids.get(c.replace(/-/g, ""));
    const s = name && smogonSpecies(name);
    if (!s) continue;
    const sameStats = order.every((k, i) => s.bs[k] === stats[i]);
    const sameTypes = s.types.map((t) => t.toLowerCase()).join("/") === types.join("/");
    if (sameStats && sameTypes) return name;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------------
async function buildMoves() {
  console.log("Movimientos…");
  const data = await gql<{
    pokemon_v2_move: {
      id: number;
      name: string;
      power: number | null;
      accuracy: number | null;
      pp: number | null;
      priority: number;
      generation_id: number;
      move_effect_chance: number | null;
      pokemon_v2_type: Named | null;
      pokemon_v2_movedamageclass: Named | null;
      pokemon_v2_movenames: LangName[];
      pokemon_v2_moveflavortexts: { flavor_text: string; language_id: number }[];
      pokemon_v2_moveeffect: { pokemon_v2_moveeffecteffecttexts: { short_effect: string }[] } | null;
      pokemon_v2_movechanges: {
        power: number | null;
        accuracy: number | null;
        pp: number | null;
        move_effect_chance: number | null;
        pokemon_v2_type: Named | null;
        pokemon_v2_versiongroup: { order: number };
      }[];
    }[];
  }>(`{
    pokemon_v2_move(order_by: {id: asc}, where: {id: {_lt: 10000}}) {
      id name power accuracy pp priority generation_id move_effect_chance
      pokemon_v2_type { name }
      pokemon_v2_movedamageclass { name }
      pokemon_v2_movenames(where: {language_id: {_in: [${ES}, ${EN}]}}) { name language_id }
      pokemon_v2_moveflavortexts(where: {language_id: {_eq: ${ES}}}, order_by: {version_group_id: desc}, limit: 1) { flavor_text language_id }
      pokemon_v2_moveeffect { pokemon_v2_moveeffecteffecttexts(where: {language_id: {_eq: ${EN}}}) { short_effect } }
      pokemon_v2_movechanges { power accuracy pp move_effect_chance pokemon_v2_type { name } pokemon_v2_versiongroup { order } }
    }
  }`);
  const moves: Record<string, unknown> = {};
  for (const m of data.pokemon_v2_move) {
    const chance = m.move_effect_chance;
    const effect = clean(m.pokemon_v2_moveeffect?.pokemon_v2_moveeffecteffecttexts[0]?.short_effect).replace(
      /\$effect_chance/g,
      String(chance ?? ""),
    );
    const changes = m.pokemon_v2_movechanges
      .map((c) => ({
        beforeVgOrder: c.pokemon_v2_versiongroup.order,
        ...(c.power != null ? { power: c.power } : {}),
        ...(c.accuracy != null ? { accuracy: c.accuracy } : {}),
        ...(c.pp != null ? { pp: c.pp } : {}),
        ...(c.move_effect_chance != null ? { chance: c.move_effect_chance } : {}),
        ...(c.pokemon_v2_type ? { type: c.pokemon_v2_type.name } : {}),
      }))
      .sort((a, b) => a.beforeVgOrder - b.beforeVgOrder);
    moves[m.name] = {
      id: m.id,
      es: pick(m.pokemon_v2_movenames, ES) ?? pick(m.pokemon_v2_movenames, EN) ?? m.name,
      en: pick(m.pokemon_v2_movenames, EN) ?? m.name,
      type: m.pokemon_v2_type?.name ?? "normal",
      category: m.pokemon_v2_movedamageclass?.name ?? "status",
      power: m.power,
      accuracy: m.accuracy,
      pp: m.pp,
      priority: m.priority,
      gen: m.generation_id,
      ...(chance != null ? { chance } : {}),
      ...(m.pokemon_v2_moveflavortexts[0] ? { descEs: clean(m.pokemon_v2_moveflavortexts[0].flavor_text) } : {}),
      ...(effect ? { effectEn: effect } : {}),
      ...(changes.length ? { changes } : {}),
    };
  }
  console.log(`  ${Object.keys(moves).length} movimientos`);
  write("moves.json", moves);
}

// ---------------------------------------------------------------------------
// Habilidades, naturalezas, grupos de versiones, métodos de aprendizaje, objetos
// ---------------------------------------------------------------------------
async function buildMisc() {
  console.log("Habilidades, naturalezas, versiones, objetos…");
  const data = await gql<{
    pokemon_v2_ability: {
      name: string;
      generation_id: number;
      is_main_series: boolean;
      pokemon_v2_abilitynames: LangName[];
      pokemon_v2_abilityflavortexts: { flavor_text: string }[];
      pokemon_v2_abilityeffecttexts: { short_effect: string }[];
    }[];
    pokemon_v2_nature: {
      name: string;
      increased_stat_id: number | null;
      decreased_stat_id: number | null;
      pokemon_v2_naturenames: LangName[];
    }[];
    pokemon_v2_stat: { id: number; name: string; pokemon_v2_statnames: LangName[] }[];
    pokemon_v2_versiongroup: {
      name: string;
      order: number;
      generation_id: number;
      pokemon_v2_versions: { name: string; pokemon_v2_versionnames: LangName[] }[];
    }[];
    pokemon_v2_movelearnmethod: { name: string; pokemon_v2_movelearnmethodnames: LangName[] }[];
    pokemon_v2_generation: { id: number; name: string; pokemon_v2_generationnames: LangName[] }[];
  }>(`{
    pokemon_v2_ability(where: {is_main_series: {_eq: true}}, order_by: {id: asc}) {
      name generation_id is_main_series
      pokemon_v2_abilitynames(where: {language_id: {_in: [${ES}, ${EN}]}}) { name language_id }
      pokemon_v2_abilityflavortexts(where: {language_id: {_eq: ${ES}}}, order_by: {version_group_id: desc}, limit: 1) { flavor_text }
      pokemon_v2_abilityeffecttexts(where: {language_id: {_eq: ${EN}}}) { short_effect }
    }
    pokemon_v2_nature(order_by: {id: asc}) {
      name increased_stat_id decreased_stat_id
      pokemon_v2_naturenames(where: {language_id: {_in: [${ES}, ${EN}]}}) { name language_id }
    }
    pokemon_v2_stat(order_by: {id: asc}) {
      id name
      pokemon_v2_statnames(where: {language_id: {_in: [${ES}, ${EN}]}}) { name language_id }
    }
    pokemon_v2_versiongroup(order_by: {order: asc}) {
      name order generation_id
      pokemon_v2_versions(order_by: {id: asc}) { name pokemon_v2_versionnames(where: {language_id: {_in: [${ES}, ${EN}]}}) { name language_id } }
    }
    pokemon_v2_movelearnmethod(order_by: {id: asc}) {
      name pokemon_v2_movelearnmethodnames(where: {language_id: {_in: [${ES}, ${EN}]}}) { name language_id }
    }
    pokemon_v2_generation(order_by: {id: asc}) {
      id name pokemon_v2_generationnames(where: {language_id: {_in: [${ES}, ${EN}]}}) { name language_id }
    }
  }`);

  const abilities: Record<string, unknown> = {};
  for (const a of data.pokemon_v2_ability) {
    abilities[a.name] = {
      es: pick(a.pokemon_v2_abilitynames, ES) ?? pick(a.pokemon_v2_abilitynames, EN) ?? a.name,
      en: pick(a.pokemon_v2_abilitynames, EN) ?? a.name,
      gen: a.generation_id,
      ...(a.pokemon_v2_abilityflavortexts[0] ? { descEs: clean(a.pokemon_v2_abilityflavortexts[0].flavor_text) } : {}),
      ...(a.pokemon_v2_abilityeffecttexts[0] ? { effectEn: clean(a.pokemon_v2_abilityeffecttexts[0].short_effect) } : {}),
    };
  }
  const abilityList = await rest<{ results: RestNamed[] }>("ability?limit=1000");
  const missingAbilities = abilityList.results.filter((a) => !abilities[a.name] && Number(a.url.split("/").at(-2)) < 10000);
  console.log(`  ${missingAbilities.length} habilidades solo disponibles en REST`);
  await pool(missingAbilities, 4, async (r) => {
    const a = await rest<{
      name: string;
      is_main_series: boolean;
      generation: RestNamed;
      names: RestLangName[];
      flavor_text_entries: { flavor_text: string; language: RestNamed }[];
      effect_entries: { short_effect: string; language: RestNamed }[];
    }>(r.url);
    if (!a.is_main_series) return;
    const descEs = a.flavor_text_entries.filter((f) => f.language.name === "es").at(-1)?.flavor_text;
    const effectEn = a.effect_entries.find((e) => e.language.name === "en")?.short_effect;
    abilities[a.name] = {
      es: restPick(a.names, "es") ?? restPick(a.names, "en") ?? a.name,
      en: restPick(a.names, "en") ?? a.name,
      gen: Number(a.generation.url.split("/").at(-2)),
      ...(descEs ? { descEs: clean(descEs) } : {}),
      ...(effectEn ? { effectEn: clean(effectEn) } : {}),
    };
  });
  write("abilities.json", abilities);

  const statById = new Map(data.pokemon_v2_stat.map((s) => [s.id, s.name]));
  write(
    "natures.json",
    data.pokemon_v2_nature.map((n) => ({
      slug: n.name,
      es: pick(n.pokemon_v2_naturenames, ES) ?? n.name,
      en: pick(n.pokemon_v2_naturenames, EN) ?? n.name,
      up: n.increased_stat_id && n.increased_stat_id !== n.decreased_stat_id ? statById.get(n.increased_stat_id) : null,
      down: n.decreased_stat_id && n.increased_stat_id !== n.decreased_stat_id ? statById.get(n.decreased_stat_id) : null,
    })),
  );

  const versionGroups = data.pokemon_v2_versiongroup.map((vg) => ({
    slug: vg.name,
    order: vg.order,
    gen: vg.generation_id,
    es: vg.pokemon_v2_versions.map((v) => pick(v.pokemon_v2_versionnames, ES) ?? pick(v.pokemon_v2_versionnames, EN) ?? v.name).join(" / "),
    en: vg.pokemon_v2_versions.map((v) => pick(v.pokemon_v2_versionnames, EN) ?? v.name).join(" / "),
  }));
  const vgList = await rest<{ results: RestNamed[] }>("version-group?limit=200");
  const knownVg = new Set(versionGroups.map((v) => v.slug));
  for (const r of vgList.results.filter((v) => !knownVg.has(v.name))) {
    const vg = await rest<{ name: string; order: number; generation: RestNamed; versions: RestNamed[] }>(r.url);
    const versions = await pool(vg.versions, 2, (v) => rest<{ name: string; names: RestLangName[] }>(v.url));
    versionGroups.push({
      slug: vg.name,
      order: vg.order,
      gen: Number(vg.generation.url.split("/").at(-2)),
      es: versions.map((v) => restPick(v.names, "es") ?? restPick(v.names, "en") ?? v.name).join(" / "),
      en: versions.map((v) => restPick(v.names, "en") ?? v.name).join(" / "),
    });
  }
  versionGroups.sort((a, b) => a.order - b.order);
  write("version-groups.json", versionGroups);

  write(
    "learn-methods.json",
    Object.fromEntries(
      data.pokemon_v2_movelearnmethod.map((m) => [
        m.name,
        { es: pick(m.pokemon_v2_movelearnmethodnames, ES) ?? null, en: pick(m.pokemon_v2_movelearnmethodnames, EN) ?? m.name },
      ]),
    ),
  );

  write(
    "generations.json",
    data.pokemon_v2_generation.map((g) => ({
      id: g.id,
      slug: g.name,
      es: pick(g.pokemon_v2_generationnames, ES) ?? g.name,
      en: pick(g.pokemon_v2_generationnames, EN) ?? g.name,
    })),
  );

  // Objetos: solo los que entiende @smogon/calc (objetos equipables relevantes en combate).
  const smogonItems = new Set<string>();
  for (let g = 2; g <= 9; g++) for (const i of (ITEMS as unknown as Record<number, string[]>)[g]) smogonItems.add(i);
  const slugOf = (name: string) => name.toLowerCase().replace(/['’.]/g, "").replace(/[\s_]+/g, "-");
  const slugs = [...smogonItems].map(slugOf);
  const items = await gql<{ pokemon_v2_item: { name: string; pokemon_v2_itemnames: LangName[] }[] }>(`{
    pokemon_v2_item(where: {name: {_in: ${JSON.stringify(slugs)}}}) {
      name pokemon_v2_itemnames(where: {language_id: {_eq: ${ES}}}) { name language_id }
    }
  }`);
  const esBySlug = new Map(items.pokemon_v2_item.map((i) => [i.name, pick(i.pokemon_v2_itemnames, ES)]));
  write(
    "items.json",
    Object.fromEntries([...smogonItems].sort().map((name) => [name, esBySlug.get(slugOf(name)) ?? null])),
  );
}

async function main() {
  const started = Date.now();
  await buildTypes();
  await buildPokemon();
  await buildMoves();
  await buildMisc();
  writeFileSync(
    join(OUT_DIR, "meta.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), source: ENDPOINT }, null, 2),
  );
  console.log(`Listo en ${((Date.now() - started) / 1000).toFixed(1)} s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
