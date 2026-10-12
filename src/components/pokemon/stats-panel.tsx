"use client";

import { BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { useGame } from "@/components/game/game-context";
import { getDictionary } from "@/i18n";
import { STAT_KEYS, type StatTuple } from "@/lib/domain";
import { generationLabel } from "@/lib/data/games";
import { statsForGen } from "@/lib/engine/strategy";
import { Section } from "./section";

const t = getDictionary();
/** Máximo posible de una estadística base: la escala no se recorta. */
const STAT_MAX = 255;

export interface StatsPanelProps {
  stats: StatTuple;
  statHistory?: { untilGen: number; stats: StatTuple }[];
  evYield?: StatTuple | null;
  introducedIn: number;
}

export function StatsPanel({ stats: current, statHistory, evYield, introducedIn }: StatsPanelProps) {
  const { gen: selectedGen } = useGame();
  const gen = selectedGen >= introducedIn ? selectedGen : 9;
  const stats = useMemo(() => statsForGen({ stats: current, statHistory }, gen), [current, statHistory, gen]);
  const changed = stats.join() !== current.join();
  const total = stats.reduce((a, b) => a + b, 0);
  const isGen1 = gen === 1;

  const rows = STAT_KEYS.map((key, i) => ({ key, label: t.stats[key], value: stats[i], current: current[i] }));
  const radarData = rows.map((r) => ({ stat: r.label, value: r.value }));
  // El radar compara la forma del reparto: escala al máximo del propio Pokémon (mínimo 150).
  const radarMax = Math.max(150, ...stats);

  return (
    <Section
      id="estadisticas"
      title={t.pokemon.sections.stats}
      icon={<BarChart3 />}
      description={changed ? t.pokemon.statsChanged(generationLabel(gen)) : generationLabel(gen)}
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <table className="w-full border-separate border-spacing-y-2.5 text-sm">
            <caption className="sr-only">{t.pokemon.sections.stats}</caption>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row" className="w-24 pr-3 text-left font-normal whitespace-nowrap text-muted-foreground">
                    {isGen1 && (r.key === "spa" || r.key === "spd") ? "Especial" : r.label}
                  </th>
                  <td className="w-12 pr-3 text-right font-mono font-semibold tabular">{r.value}</td>
                  <td className="w-full">
                    <div className="h-2.5 w-full rounded-full bg-white/[0.06]" role="presentation">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                        style={{ width: `${(r.value / STAT_MAX) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="w-14 pl-3 text-right font-mono text-xs text-muted-foreground tabular">
                    {changed && r.value !== r.current ? `→ ${r.current}` : ""}
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row" className="pt-2 pr-3 text-left font-medium">
                  {t.stats.total}
                </th>
                <td className="pt-2 pr-3 text-right font-mono font-semibold tabular">{total}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
          {evYield && evYield.some((v) => v > 0) && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t.pokemon.evYield}:{" "}
              {STAT_KEYS.map((k, i) => (evYield[i] ? `${evYield[i]} ${t.stats[k]}` : null))
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {changed && (
            <p className="mt-2 text-xs text-muted-foreground">
              → {generationLabel(9)} · {t.common.source}: @smogon/calc
            </p>
          )}
        </div>
        <div className="mx-auto aspect-square w-full max-w-[340px]" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="stat" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, radarMax]} tick={false} axisLine={false} />
              <Tooltip
                cursor={false}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: "var(--foreground)" }}
                labelStyle={{ color: "var(--muted-foreground)" }}
                formatter={(v) => [String(v), ""]}
              />
              <Radar
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="var(--primary)"
                fillOpacity={0.12}
                dot={{ r: 4, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Section>
  );
}
