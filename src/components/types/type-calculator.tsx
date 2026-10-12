"use client";

import Link from "next/link";
import { useState } from "react";
import { useGame } from "@/components/game/game-context";
import { MultiplierChip, multiplierTone } from "@/components/pokemon/multiplier-chip";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDictionary } from "@/i18n";
import { GENERATIONS, type Generation, type TypeName } from "@/lib/domain";
import { generationLabel } from "@/lib/data/games";
import { defensiveProfile, getTypeChart, offensiveProfile, typeLabel, typesInGen } from "@/lib/engine/type-chart";
import { TYPE_COLORS, typeTextColor } from "@/lib/ui/type-colors";
import { formatMultiplier } from "@/lib/ui/format";
import { cn } from "@/lib/utils";

const t = getDictionary();
const ROWS = [4, 2, 1, 0.5, 0.25, 0] as const;

export interface TypeComboExample {
  slug: string;
  name: string;
  types: TypeName[];
}

export function TypeCalculator({ examples }: { examples: TypeComboExample[] }) {
  const { gen: globalGen } = useGame();
  const [localGen, setLocalGen] = useState<Generation | null>(null);
  const gen = localGen ?? globalGen;
  const available = typesInGen(gen);
  const [defense, setDefense] = useState<TypeName[]>(["poison", "dark"]);
  const [attack, setAttack] = useState<TypeName>("ground");
  const validDefense = defense.filter((d) => available.includes(d));
  const validAttack = available.includes(attack) ? attack : "normal";

  const toggleDefense = (ty: TypeName) =>
    setDefense((cur) => (cur.includes(ty) ? cur.filter((x) => x !== ty) : cur.length >= 2 ? [cur[1], ty] : [...cur, ty]));

  const profile = defensiveProfile(validDefense, gen);
  const rows: Record<number, TypeName[]> = { 4: profile.quad, 2: profile.double, 1: profile.neutral, 0.5: profile.half, 0.25: profile.quarter, 0: profile.immune };

  const comboKey = [...validDefense].sort().join("/");
  const matching = comboKey ? examples.filter((e) => [...e.types].sort().join("/") === comboKey).slice(0, 12) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={String(gen)} onValueChange={(v) => setLocalGen(Number(v) as Generation)}>
          <SelectTrigger className="w-48" aria-label={t.common.generation}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[...GENERATIONS].reverse().map((g) => (
              <SelectItem key={g} value={String(g)}>
                {generationLabel(g)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{available.length} tipos en esta generación</span>
      </div>

      <Tabs defaultValue="defense">
        <TabsList>
          <TabsTrigger value="defense">{t.types.defense}</TabsTrigger>
          <TabsTrigger value="offense">{t.types.offense}</TabsTrigger>
          <TabsTrigger value="chart">{t.types.chart}</TabsTrigger>
        </TabsList>

        <TabsContent value="defense" className="mt-5 space-y-5">
          <TypePicker available={available} selected={validDefense} onToggle={toggleDefense} hint={t.types.pickTypes} />
          <div className="rounded-3xl surface p-5 sm:p-7">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">{t.types.defender}:</span>
              {validDefense.length ? validDefense.map((d) => <TypeBadge key={d} type={d} size="md" />) : <span className="text-sm">—</span>}
            </div>
            {validDefense.length > 0 && (
              <div className="space-y-2.5">
                {ROWS.filter((m) => rows[m].length).map((m) => (
                  <div key={m} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex w-56 shrink-0 items-center gap-2">
                      <MultiplierChip value={m} />
                      <span className="text-sm text-muted-foreground">{t.multipliers[String(m)]}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {rows[m].map((ty) => (
                        <TypeBadge key={ty} type={ty} size={m === 1 ? "xs" : "sm"} className={m === 1 ? "opacity-70" : undefined} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {matching.length > 0 && (
              <div className="mt-6 border-t border-border pt-4">
                <p className="mb-2 text-xs text-muted-foreground">Pokémon con esta combinación</p>
                <div className="flex flex-wrap gap-2">
                  {matching.map((m) => (
                    <Link key={m.slug} href={`/pokemon/${m.slug}`} className="rounded-full border border-border px-3 py-1 text-sm hover:border-primary/40">
                      {m.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="offense" className="mt-5 space-y-5">
          <TypePicker available={available} selected={[validAttack]} onToggle={setAttack} hint="Elige el tipo del ataque" />
          <div className="rounded-3xl surface p-5 sm:p-7">
            {(() => {
              const entries = offensiveProfile(validAttack, gen);
              return (
                <div className="space-y-2.5">
                  {ROWS.filter((m) => entries.some((e) => e.multiplier === m)).map((m) => (
                    <div key={m} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex w-56 shrink-0 items-center gap-2">
                        <MultiplierChip value={m} />
                        <span className="text-sm text-muted-foreground">{t.multipliers[String(m)]}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {entries
                          .filter((e) => e.multiplier === m)
                          .map((e) => (
                            <TypeBadge key={e.type} type={e.type} size="sm" />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </TabsContent>

        <TabsContent value="chart" className="mt-5">
          <FullChart gen={gen} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TypePicker({ available, selected, onToggle, hint }: { available: TypeName[]; selected: TypeName[]; onToggle: (t: TypeName) => void; hint: string }) {
  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">{hint}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-9">
        {available.map((ty) => {
          const on = selected.includes(ty);
          return (
            <button
              key={ty}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(ty)}
              className={cn("rounded-lg py-2 text-xs font-semibold uppercase transition-all", !on && "opacity-40 hover:opacity-75")}
              style={{
                background: TYPE_COLORS[ty],
                color: typeTextColor(ty),
                boxShadow: on ? `0 0 0 2px var(--background), 0 0 0 4px ${TYPE_COLORS[ty]}` : undefined,
              }}
            >
              {typeLabel(ty)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FullChart({ gen }: { gen: Generation }) {
  const types = typesInGen(gen);
  const chart = getTypeChart(gen);
  const [hover, setHover] = useState<{ a: TypeName; d: TypeName } | null>(null);
  return (
    <div className="rounded-3xl surface p-3 sm:p-5">
      <p className="mb-3 text-sm text-muted-foreground">
        Filas: tipo atacante · Columnas: tipo defensor.{" "}
        {hover && (
          <span className="text-foreground">
            {typeLabel(hover.a)} → {typeLabel(hover.d)}: ×{formatMultiplier(chart[hover.a][hover.d])}
          </span>
        )}
      </p>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-0.5 text-[11px]" onMouseLeave={() => setHover(null)}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card p-1 text-left text-muted-foreground">
                {t.types.attacker} ↓
              </th>
              {types.map((d) => (
                <th key={d} className="p-0.5">
                  <span className="block w-9 truncate rounded py-0.5 text-center font-semibold" style={{ background: TYPE_COLORS[d], color: typeTextColor(d) }} title={typeLabel(d)}>
                    {typeLabel(d).slice(0, 3)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map((a) => (
              <tr key={a}>
                <th scope="row" className="sticky left-0 z-10 bg-card p-0.5 text-left">
                  <span className="block w-20 truncate rounded px-1.5 py-0.5 font-semibold" style={{ background: TYPE_COLORS[a], color: typeTextColor(a) }}>
                    {typeLabel(a)}
                  </span>
                </th>
                {types.map((d) => {
                  const v = chart[a][d];
                  const highlighted = hover && (hover.a === a || hover.d === d);
                  return (
                    <td
                      key={d}
                      onMouseEnter={() => setHover({ a, d })}
                      className={cn(
                        "h-7 w-9 rounded text-center font-mono font-semibold ring-1 transition-opacity",
                        v === 1 ? "text-transparent ring-white/5" : multiplierTone(v),
                        hover && !highlighted && "opacity-40",
                      )}
                      title={`${typeLabel(a)} → ${typeLabel(d)}: ×${v}`}
                    >
                      {v === 1 ? "1" : formatMultiplier(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
