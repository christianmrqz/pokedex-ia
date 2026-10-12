/**
 * Análisis de equipos (hasta seis Pokémon): debilidades compartidas, cobertura ofensiva,
 * equilibrio físico/especial, velocidad y sugerencias para cubrir huecos.
 */
import type { Generation, PokemonIndexEntry, StatTuple, TypeName } from "@/lib/domain";
import { statsForGen } from "./strategy";
import { typeEffectiveness, typesForGen, typesInGen } from "./type-chart";

export interface TeamMoveInfo {
  type: TypeName;
  category: "physical" | "special" | "status";
  power: number | null;
}

export interface TeamMemberInput {
  entry: PokemonIndexEntry;
  /** Movimientos elegidos (vacío = se asumen sus tipos como ataques). */
  moves: TeamMoveInfo[];
  /** Estadísticas reales si se conocen; si no, se usan las base. */
  stats?: StatTuple;
}

export interface DefensiveRow {
  type: TypeName;
  weak: number;
  resist: number;
  immune: number;
  /** Debilidad compartida: tres o más débiles y como mucho uno que lo resista. */
  shared: boolean;
}

export interface TeamAnalysis {
  defensive: DefensiveRow[];
  sharedWeaknesses: TypeName[];
  /** Tipos defensivos (simples) a los que el equipo golpea con eficacia. */
  coverage: { type: TypeName; hitters: string[] }[];
  uncovered: TypeName[];
  balance: { physical: number; special: number; status: number; mixedNote: string };
  speed: { name: string; value: number }[];
}

function attackingTypes(m: TeamMemberInput, gen: Generation): TypeName[] {
  const damaging = m.moves.filter((mv) => mv.category !== "status" && (mv.power ?? 0) > 0).map((mv) => mv.type);
  return damaging.length ? [...new Set(damaging)] : typesForGen(m.entry, gen);
}

export function analyzeTeam(members: TeamMemberInput[], gen: Generation): TeamAnalysis {
  const types = typesInGen(gen);
  const defensive: DefensiveRow[] = types.map((atk) => {
    let weak = 0;
    let resist = 0;
    let immune = 0;
    for (const m of members) {
      const mult = typeEffectiveness(atk, typesForGen(m.entry, gen), gen);
      if (mult === 0) immune++;
      else if (mult > 1) weak++;
      else if (mult < 1) resist++;
    }
    return { type: atk, weak, resist, immune, shared: weak >= 3 && resist + immune <= 1 };
  });

  const coverage = types.map((def) => ({
    type: def,
    hitters: members.filter((m) => attackingTypes(m, gen).some((a) => typeEffectiveness(a, [def], gen) > 1)).map((m) => m.entry.es),
  }));

  let physical = 0;
  let special = 0;
  let status = 0;
  for (const m of members) {
    if (m.moves.length) {
      for (const mv of m.moves) {
        if (mv.category === "physical") physical++;
        else if (mv.category === "special") special++;
        else status++;
      }
    } else {
      const s = m.stats ?? statsForGen(m.entry, gen);
      if (s[1] >= s[3]) physical++;
      else special++;
    }
  }
  const total = physical + special;
  const mixedNote =
    total === 0
      ? "Sin ataques definidos."
      : physical / total > 0.75
        ? "Muy cargado hacia lo físico: un rival con Defensa alta o Fuego Fatuo/Reflejo puede frenar al equipo."
        : special / total > 0.75
          ? "Muy cargado hacia lo especial: un rival con Defensa Especial alta o Pantalla Luz puede frenar al equipo."
          : "Buen equilibrio entre ataques físicos y especiales.";

  const speed = members
    .map((m) => ({ name: m.entry.es, value: (m.stats ?? statsForGen(m.entry, gen))[5] }))
    .sort((a, b) => b.value - a.value);

  return {
    defensive,
    sharedWeaknesses: defensive.filter((d) => d.shared).map((d) => d.type),
    coverage,
    uncovered: coverage.filter((c) => c.hitters.length === 0).map((c) => c.type),
    balance: { physical, special, status, mixedNote },
    speed,
  };
}

export interface TeamSuggestion {
  entry: PokemonIndexEntry;
  resists: TypeName[];
  covers: TypeName[];
  score: number;
}

/** Pokémon que resisten las debilidades compartidas del equipo y aportan cobertura que falta. */
export function suggestForTeam(
  analysis: TeamAnalysis,
  members: TeamMemberInput[],
  pool: PokemonIndexEntry[],
  gen: Generation,
  { includeLegendary = false, limit = 6 } = {},
): TeamSuggestion[] {
  const inTeam = new Set(members.map((m) => m.entry.speciesId));
  const weakTypes = analysis.defensive.filter((d) => d.weak >= 2 && d.weak > d.resist + d.immune).map((d) => d.type);
  const out: TeamSuggestion[] = [];
  for (const p of pool) {
    if (!p.isDefault || p.gen > gen || inTeam.has(p.speciesId)) continue;
    if (!includeLegendary && (p.legendary || p.mythical)) continue;
    const t = typesForGen(p, gen);
    const resists = weakTypes.filter((w) => typeEffectiveness(w, t, gen) < 1);
    const covers = analysis.uncovered.filter((u) => t.some((a) => typeEffectiveness(a, [u], gen) > 1));
    // Penaliza añadir otro Pokémon débil a las debilidades compartidas.
    const worsens = analysis.sharedWeaknesses.filter((w) => typeEffectiveness(w, t, gen) > 1).length;
    const total = statsForGen(p, gen).reduce((a, b) => a + b, 0);
    const score = resists.length * 2 + covers.length * 1.5 - worsens * 3 + Math.min(1, Math.max(-1, (total - 480) / 120));
    if (resists.length + covers.length === 0) continue;
    out.push({ entry: p, resists, covers, score });
  }
  return out.sort((a, b) => b.score - a.score || a.entry.speciesId - b.entry.speciesId).slice(0, limit);
}
