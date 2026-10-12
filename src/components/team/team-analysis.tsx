"use client";

import { useQueries } from "@tanstack/react-query";
import { AlertTriangle, Gauge, Plus, ShieldAlert, Swords } from "lucide-react";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import { TypeBadge } from "@/components/pokemon/type-badge";
import type { PokemonMovesResponse } from "@/components/search/use-pokemon-moves";
import { Button } from "@/components/ui/button";
import type { Generation, PokemonIndexEntry } from "@/lib/domain";
import { getVersionGroup } from "@/lib/data/games";
import { moveCategoryForGen, moveValuesForVersionGroup } from "@/lib/engine/learnset";
import { artworkCandidatesById } from "@/lib/engine/sprites";
import { analyzeTeam, suggestForTeam, type TeamMemberInput } from "@/lib/engine/team";
import { typeLabel } from "@/lib/engine/type-chart";
import type { TeamMember } from "@/lib/team/model";
import { TYPE_COLORS } from "@/lib/ui/type-colors";
import { cn } from "@/lib/utils";

interface Props {
  members: TeamMember[];
  resolve: (slug: string) => PokemonIndexEntry | undefined;
  pool: PokemonIndexEntry[];
  gen: Generation;
  versionGroup: string;
  onAdd: (slug: string) => void;
  canAdd: boolean;
}

export function TeamAnalysis({ members, resolve, pool, gen, versionGroup, onAdd, canAdd }: Props) {
  // Datos de los movimientos elegidos (misma caché que el resto de la aplicación).
  const queries = useQueries({
    queries: members.map((m) => ({
      queryKey: ["pokemon-moves", m.slug],
      queryFn: async (): Promise<PokemonMovesResponse> => {
        const res = await fetch(`/api/pokemon/${m.slug}`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      },
      staleTime: 1000 * 60 * 60,
      enabled: m.moves.length > 0,
    })),
  });

  const inputs: TeamMemberInput[] = members.flatMap((m, i) => {
    const entry = resolve(m.slug);
    if (!entry) return [];
    const data = queries[i]?.data;
    const vgSlug = data ? (versionGroup !== "auto" && data.versionGroups.includes(versionGroup) ? versionGroup : data.versionGroups.at(-1)) : undefined;
    const vg = vgSlug ? getVersionGroup(vgSlug) : undefined;
    const moves = data && vg
      ? m.moves.flatMap((slug) => {
          const mv = data.moves[slug];
          if (!mv) return [];
          const values = moveValuesForVersionGroup({ ...mv, id: 0, gen: 0 }, vg.order);
          return [{ type: values.type, category: moveCategoryForGen(mv.category, values.type, vg.gen), power: values.power }];
        })
      : [];
    return [{ entry, moves }];
  });

  if (inputs.length === 0) {
    return <p className="rounded-3xl surface p-6 text-sm text-muted-foreground">Añade Pokémon para ver el análisis del equipo.</p>;
  }

  const a = analyzeTeam(inputs, gen);
  const suggestions = suggestForTeam(a, inputs, pool, gen);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl surface p-5 sm:p-6" aria-labelledby="team-def">
        <h2 id="team-def" className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <ShieldAlert className="size-5 text-primary" /> Defensa del equipo
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">Cuántos miembros son débiles, resisten o son inmunes a cada tipo de ataque.</p>
        {a.sharedWeaknesses.length > 0 && (
          <p className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            <AlertTriangle className="size-4" /> Debilidades compartidas:
            {a.sharedWeaknesses.map((t) => (
              <TypeBadge key={t} type={t} size="xs" />
            ))}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="py-1 text-left font-medium">Ataque</th>
                <th className="py-1 font-medium">Débiles</th>
                <th className="py-1 font-medium">Resisten</th>
                <th className="py-1 font-medium">Inmunes</th>
              </tr>
            </thead>
            <tbody>
              {a.defensive.map((d) => (
                <tr key={d.type} className={cn("border-t border-border/40", d.shared && "bg-red-500/[0.07]")}>
                  <td className="py-1.5">
                    <TypeBadge type={d.type} size="xs" />
                  </td>
                  <td className={cn("py-1.5 text-center font-mono tabular", d.weak >= 3 ? "font-semibold text-red-200" : d.weak ? "" : "text-muted-foreground/50")}>{d.weak}</td>
                  <td className={cn("py-1.5 text-center font-mono tabular", d.resist ? "text-teal-200" : "text-muted-foreground/50")}>{d.resist}</td>
                  <td className={cn("py-1.5 text-center font-mono tabular", d.immune ? "text-violet-200" : "text-muted-foreground/50")}>{d.immune}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl surface p-5 sm:p-6" aria-labelledby="team-off">
        <h2 id="team-off" className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Swords className="size-5 text-primary" /> Cobertura ofensiva
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">Tipos a los que algún miembro golpea de forma supereficaz (con sus movimientos elegidos o, si no tiene, con sus tipos).</p>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {a.coverage.map((c) => (
            <div
              key={c.type}
              title={c.hitters.join(", ") || "Sin cobertura"}
              className={cn("flex items-center justify-between rounded-lg border-l-4 bg-white/[0.03] px-2 py-1.5 text-xs", !c.hitters.length && "opacity-50")}
              style={{ borderLeftColor: TYPE_COLORS[c.type] }}
            >
              {typeLabel(c.type)}
              <span className="font-mono tabular">{c.hitters.length}</span>
            </div>
          ))}
        </div>
        {a.uncovered.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Sin ataques supereficaces contra: {a.uncovered.map((u) => typeLabel(u)).join(", ")}.
          </p>
        )}
        <p className="mt-3 text-sm">
          Físicos <span className="font-mono">{a.balance.physical}</span> · Especiales <span className="font-mono">{a.balance.special}</span>
          {a.balance.status > 0 && (
            <>
              {" "}
              · Estado <span className="font-mono">{a.balance.status}</span>
            </>
          )}
          <span className="block text-xs text-muted-foreground">{a.balance.mixedNote}</span>
        </p>
      </section>

      <section className="rounded-3xl surface p-5 sm:p-6" aria-labelledby="team-speed">
        <h2 id="team-speed" className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Gauge className="size-5 text-primary" /> Velocidad base
        </h2>
        <ol className="space-y-1.5 text-sm">
          {a.speed.map((s) => (
            <li key={s.name} className="flex items-center gap-3">
              <span className="w-32 truncate">{s.name}</span>
              <span className="h-2 flex-1 rounded-full bg-white/[0.06]">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${(s.value / 200) * 100}%` }} />
              </span>
              <span className="w-10 text-right font-mono tabular">{s.value}</span>
            </li>
          ))}
        </ol>
      </section>

      {suggestions.length > 0 && (
        <section className="rounded-3xl surface p-5 sm:p-6" aria-labelledby="team-sugg">
          <h2 id="team-sugg" className="mb-1 text-lg font-semibold">
            Sugerencias para cubrir huecos
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">Resisten las debilidades más repetidas del equipo o aportan cobertura que falta. Basado en tipos.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestions.map((s) => (
              <div key={s.entry.slug} className="flex items-center gap-3 rounded-2xl border border-border bg-background/40 p-3">
                <PokemonImage candidates={artworkCandidatesById(s.entry.id)} alt={s.entry.es} size={64} sizes="64px" className="size-14" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.entry.es}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.resists.length > 0 && `Resiste ${s.resists.map((r) => typeLabel(r)).join(", ")}. `}
                    {s.covers.length > 0 && `Cubre ${s.covers.map((r) => typeLabel(r)).join(", ")}.`}
                  </p>
                </div>
                <Button size="icon-sm" variant="outline" onClick={() => onAdd(s.entry.slug)} disabled={!canAdd} aria-label={`Añadir ${s.entry.es}`}>
                  <Plus />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
