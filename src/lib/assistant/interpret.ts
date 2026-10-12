/**
 * Interpretación determinista de una pregunta: qué Pokémon y tipos menciona y qué quiere saber.
 * No usa IA: la IA solo redacta la respuesta a partir de los datos que se calculan después.
 */
import { POKEMON } from "@/lib/data/pokedex";
import { TYPE_NAMES, type PokemonIndexEntry, type TypeName } from "@/lib/domain";
import { editDistance, normalize } from "@/lib/engine/search";
import { typeLabel } from "@/lib/engine/type-chart";

export type Intent = "counter" | "nature" | "evs" | "effectiveness" | "coverage" | "matchup" | "moves" | "general";

export interface Interpretation {
  pokemon: PokemonIndexEntry[];
  types: TypeName[];
  intents: Intent[];
}

const TYPE_WORDS: { type: TypeName; words: string[] }[] = TYPE_NAMES.map((t) => ({
  type: t,
  words: [...new Set([normalize(typeLabel(t, "es")), normalize(typeLabel(t, "en"))])],
}));

/** Palabras que nunca son nombres de Pokémon aunque se parezcan (evita falsos positivos difusos). */
const STOP = new Set(["contra", "pokemon", "tipo", "tipos", "ataque", "ataques", "mejor", "puedo", "debo", "naturaleza", "equipo", "rival"]);

interface NameIndexEntry {
  entry: PokemonIndexEntry;
  tokens: string[];
}

let nameIndex: NameIndexEntry[] | null = null;
function getNameIndex(): NameIndexEntry[] {
  if (nameIndex) return nameIndex;
  nameIndex = [];
  for (const entry of POKEMON) {
    const names = new Set([normalize(entry.es), normalize(entry.en)]);
    if (entry.isDefault) names.add(normalize(entry.speciesSlug.replace(/-/g, " ")));
    for (const n of names) nameIndex.push({ entry, tokens: n.split(" ") });
  }
  // Primero los nombres más largos ("Rotom Lavado" antes que "Rotom").
  nameIndex.sort((a, b) => b.tokens.length - a.tokens.length || Number(b.entry.isDefault) - Number(a.entry.isDefault));
  return nameIndex;
}

function findPokemon(words: string[]): PokemonIndexEntry[] {
  const found: PokemonIndexEntry[] = [];
  const used = new Set<number>();
  const index = getNameIndex();
  // 1) Coincidencias exactas de 1-3 palabras.
  for (const { entry, tokens } of index) {
    for (let i = 0; i + tokens.length <= words.length; i++) {
      if ([...Array(tokens.length).keys()].some((k) => used.has(i + k))) continue;
      if (tokens.every((tok, k) => words[i + k] === tok)) {
        if (!found.some((f) => f.speciesId === entry.speciesId && f.slug === entry.slug)) found.push(entry);
        tokens.forEach((_, k) => used.add(i + k));
      }
    }
  }
  // 2) Erratas en palabras largas sueltas ("garchom", "drapoin").
  words.forEach((w, i) => {
    if (used.has(i) || w.length < 5 || STOP.has(w) || TYPE_WORDS.some((t) => t.words.includes(w))) return;
    let best: { entry: PokemonIndexEntry; d: number } | null = null;
    for (const { entry, tokens } of index) {
      if (tokens.length !== 1 || !entry.isDefault) continue;
      const d = editDistance(w, tokens[0], 1);
      if (d <= 1 && (!best || d < best.d)) best = { entry, d };
    }
    if (best && !found.some((f) => f.slug === best!.entry.slug)) {
      found.push(best.entry);
      used.add(i);
    }
  });
  // Se respeta el orden en que aparecen en la pregunta.
  const position = (e: PokemonIndexEntry) => {
    const first = normalize(e.es).split(" ")[0];
    const idx = words.findIndex((w) => w === first || editDistance(w, first, 1) <= 1);
    return idx === -1 ? 999 : idx;
  };
  return found.sort((a, b) => position(a) - position(b));
}

function findTypes(words: string[]): TypeName[] {
  const out: TypeName[] = [];
  for (const w of words) {
    const hit = TYPE_WORDS.find((t) => t.words.includes(w));
    if (hit && !out.includes(hit.type)) out.push(hit.type);
  }
  return out;
}

const INTENT_PATTERNS: [Intent, RegExp][] = [
  ["counter", /\b(derrot|venc|gan[ao]r?|contrarrest|counter|me recomiendas para|enfrentar)/],
  ["nature", /\bnaturaleza/],
  ["evs", /\b(ev|evs|iv|ivs|repart|entren|estadisticas? reales)\b/],
  // Sin \b inicial: debe casar también "supereficaz" o "superefectivo".
  ["effectiveness", /(eficaz|efectiv|debil|resist|inmun|\bpor que\b|cuanto dano)/],
  ["coverage", /\b(cobertura|cubrir|cubra|combinacion de (ataques|tipos|movimientos))/],
  ["moves", /\b(movimiento|ataques? (puede|aprende|aprender)|aprend)/],
  ["matchup", /\b(mi pokemon|rival|contra|vs|versus|frente a)\b/],
];

export function interpretQuestion(question: string, contextSlug?: string | null): Interpretation {
  const norm = normalize(question);
  const words = norm.split(" ").filter(Boolean);
  const pokemon = findPokemon(words);
  if (contextSlug && pokemon.length === 0) {
    const ctx = POKEMON.find((p) => p.slug === contextSlug);
    if (ctx) pokemon.push(ctx);
  }
  const types = findTypes(words);
  const intents = INTENT_PATTERNS.filter(([, re]) => re.test(norm)).map(([i]) => i);
  // "contra X" con un solo Pokémon es pedir cómo derrotarlo, no un enfrentamiento entre dos.
  if (intents.includes("matchup") && pokemon.length < 2 && !intents.includes("counter")) {
    intents.splice(intents.indexOf("matchup"), 1);
    if (pokemon.length === 1 || types.length) intents.push("counter");
  }
  if (!intents.length) intents.push("general");
  return { pokemon: pokemon.slice(0, 3), types: types.slice(0, 4), intents };
}
