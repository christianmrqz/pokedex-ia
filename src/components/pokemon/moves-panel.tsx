"use client";

import { Search, Swords } from "lucide-react";
import { useMemo, useState } from "react";
import { useGame } from "@/components/game/game-context";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getDictionary } from "@/i18n";
import { TYPE_NAMES, type MoveCategory, type TypeName } from "@/lib/domain";
import { getVersionGroup, learnMethodName } from "@/lib/data/games";
import { moveCategoryForGen, moveValuesForVersionGroup, movesForVersionGroup, type Learnset } from "@/lib/engine/learnset";
import { normalize } from "@/lib/engine/search";
import { typeExistsInGen, typeLabel } from "@/lib/engine/type-chart";
import type { MoveView } from "@/lib/pokemon/view-models";
import { cn } from "@/lib/utils";
import { Section } from "./section";
import { TypeBadge } from "./type-badge";

const t = getDictionary();

export interface MovesPanelProps {
  learnset: Learnset;
  moves: Record<string, MoveView>;
  /** Grupos de versiones con datos para este Pokémon, del más antiguo al más reciente. */
  versionGroups: string[];
}

const CATEGORY_STYLE: Record<MoveCategory, string> = {
  physical: "bg-orange-500/15 text-orange-200 ring-orange-400/30",
  special: "bg-sky-500/15 text-sky-200 ring-sky-400/30",
  status: "bg-white/5 text-muted-foreground ring-white/15",
};

export function MovesPanel({ learnset, moves, versionGroups }: MovesPanelProps) {
  const { versionGroup: globalVg } = useGame();
  const [localVg, setLocalVg] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("all");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [minPower, setMinPower] = useState("0");

  const latest = versionGroups.at(-1) ?? null;
  const globalHasData = globalVg !== "auto" && versionGroups.includes(globalVg);
  const vg = localVg ?? (globalHasData ? globalVg : latest);
  const vgEntry = vg ? getVersionGroup(vg) : undefined;
  const missingGlobal = globalVg !== "auto" && !globalHasData && !localVg;

  const rows = useMemo(() => {
    if (!vg || !vgEntry) return [];
    return movesForVersionGroup(learnset, vg)
      .map((r) => {
        const m = moves[r.move];
        if (!m) return null;
        const values = moveValuesForVersionGroup({ ...m, id: 0, gen: 0 }, vgEntry.order);
        return { ...r, move: m, slug: r.move, values, category: moveCategoryForGen(m.category, values.type, vgEntry.gen) };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [learnset, moves, vg, vgEntry]);

  const methods = useMemo(() => [...new Set(rows.map((r) => r.method))], [rows]);
  const q = normalize(query);
  const filtered = rows.filter(
    (r) =>
      (method === "all" || r.method === method) &&
      (type === "all" || r.values.type === type) &&
      (category === "all" || r.category === category) &&
      (Number(minPower) === 0 || (r.values.power ?? 0) >= Number(minPower)) &&
      (!q || normalize(r.move.es).includes(q) || normalize(r.move.en).includes(q)),
  );

  return (
    <Section
      id="movimientos"
      title={t.moves.title}
      icon={<Swords />}
      description={vgEntry ? `${vgEntry.es} · ${t.moves.count(filtered.length)}` : undefined}
      actions={
        versionGroups.length > 0 && (
          <Select value={vg ?? undefined} onValueChange={setLocalVg}>
            <SelectTrigger size="sm" className="max-w-64" aria-label={t.common.game}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-80">
              {[...versionGroups].reverse().map((slug) => (
                <SelectItem key={slug} value={slug}>
                  {getVersionGroup(slug)?.es ?? slug}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }
    >
      {versionGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.moves.none}</p>
      ) : (
        <>
          {missingGlobal && (
            <p className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
              {t.moves.noData(getVersionGroup(globalVg)?.es ?? globalVg)}
            </p>
          )}
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.moves.filter} className="pl-8" />
            </div>
            <FilterSelect value={method} onChange={setMethod} options={[["all", t.moves.allMethods], ...methods.map((m) => [m, learnMethodName(m)] as [string, string])]} />
            <FilterSelect
              value={type}
              onChange={setType}
              options={[["all", t.moves.allTypes], ...TYPE_NAMES.filter((x) => !vgEntry || typeExistsInGen(x, vgEntry.gen)).map((x) => [x, typeLabel(x)] as [string, string])]}
            />
            <FilterSelect
              value={category}
              onChange={setCategory}
              options={[
                ["all", t.moves.allCategories],
                ["physical", t.moves.physical],
                ["special", t.moves.special],
                ["status", t.moves.status],
              ]}
            />
            <FilterSelect
              value={minPower}
              onChange={setMinPower}
              options={[
                ["0", t.moves.minPower],
                ["60", "≥ 60"],
                ["80", "≥ 80"],
                ["100", "≥ 100"],
                ["120", "≥ 120"],
              ]}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t.moves.none}</p>
          ) : (
            <div className="-mx-5 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2 pl-5 font-medium sm:pl-2">{t.moves.method}</th>
                    <th className="px-2 py-2 font-medium">{t.moves.name}</th>
                    <th className="px-2 py-2 font-medium">{t.moves.type}</th>
                    <th className="px-2 py-2 font-medium">{t.moves.category}</th>
                    <th className="px-2 py-2 text-right font-medium">{t.moves.power}</th>
                    <th className="px-2 py-2 text-right font-medium">{t.moves.accuracy}</th>
                    <th className="px-2 py-2 text-right font-medium">{t.moves.pp}</th>
                    <th className="py-2 pr-5 pl-2 text-right font-medium sm:pr-2">{t.moves.priority}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={`${r.slug}-${r.method}-${r.level}`} className="border-b border-border/50 transition-colors hover:bg-white/[0.03]">
                      <td className="py-2 pr-2 pl-5 whitespace-nowrap text-muted-foreground sm:pl-2">
                        {r.method === "level-up" ? (
                          <span className="font-mono tabular">
                            {t.moves.level} {r.level || "—"}
                          </span>
                        ) : (
                          learnMethodName(r.method)
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help font-medium">{r.move.es}</span>
                          </TooltipTrigger>
                          {r.move.description && <TooltipContent className="max-w-xs">{r.move.description}</TooltipContent>}
                        </Tooltip>
                        {r.move.en !== r.move.es && <div className="text-xs text-muted-foreground">{r.move.en}</div>}
                      </td>
                      <td className="px-2 py-2">
                        <TypeBadge type={r.values.type as TypeName} size="xs" />
                      </td>
                      <td className="px-2 py-2">
                        <span className={cn("rounded px-1.5 py-0.5 text-xs ring-1", CATEGORY_STYLE[r.category])}>{t.moves[r.category]}</span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono tabular">{r.values.power ?? "—"}</td>
                      <td className="px-2 py-2 text-right font-mono tabular">{r.values.accuracy != null ? `${r.values.accuracy}%` : "—"}</td>
                      <td className="px-2 py-2 text-right font-mono tabular">{r.values.pp ?? "—"}</td>
                      <td className="py-2 pr-5 pl-2 text-right font-mono tabular sm:pr-2">
                        {r.move.priority > 0 ? `+${r.move.priority}` : r.move.priority}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {t.moves.historical}
            {vgEntry && vgEntry.gen < 4 ? ` · ${t.moves.categoryByType}` : ""} · {t.common.source}: PokéAPI (version_group_details)
          </p>
        </>
      )}
    </Section>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-80">
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
