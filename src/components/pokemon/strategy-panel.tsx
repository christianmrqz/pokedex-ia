"use client";

import { Crosshair, Info } from "lucide-react";
import Link from "next/link";
import { useGame } from "@/components/game/game-context";
import { format, getDictionary } from "@/i18n";
import type { Generation, TypeName } from "@/lib/domain";
import { generationLabel } from "@/lib/data/games";
import type { CounterReason } from "@/lib/engine/strategy";
import { artworkCandidatesById } from "@/lib/engine/sprites";
import { typeLabel } from "@/lib/engine/type-chart";
import type { StrategyView } from "@/lib/pokemon/view-models";
import { cn } from "@/lib/utils";
import { MultiplierChip } from "./multiplier-chip";
import { PokemonImage } from "./pokemon-image";
import { Section } from "./section";
import { TypeBadge } from "./type-badge";

const t = getDictionary();

export interface StrategyPanelProps {
  name: string;
  byGen: Partial<Record<Generation, StrategyView>>;
  introducedIn: number;
}

export function StrategyPanel({ name, byGen, introducedIn }: StrategyPanelProps) {
  const { gen: selectedGen } = useGame();
  const gen = (selectedGen >= introducedIn ? selectedGen : 9) as Generation;
  const s = byGen[gen];
  if (!s) return null;

  const [, , def, , spd] = s.stats;
  const recommended: [TypeName, number][] = [...s.quad.map((x) => [x, 4] as [TypeName, number]), ...s.double.map((x) => [x, 2] as [TypeName, number])];
  const avoid: [TypeName, number][] = [
    ...s.immune.map((x) => [x, 0] as [TypeName, number]),
    ...s.quarter.map((x) => [x, 0.25] as [TypeName, number]),
    ...s.half.map((x) => [x, 0.5] as [TypeName, number]),
  ];

  return (
    <Section id="estrategia" title={t.strategy.title} icon={<Crosshair />} description={`${name} · ${generationLabel(gen)}`}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t.strategy.recommended}>
          {recommended.length ? (
            <ul className="flex flex-wrap gap-2">
              {recommended.map(([type, m]) => (
                <li key={type} className="flex items-center gap-1.5">
                  <TypeBadge type={type} />
                  <MultiplierChip value={m} className="min-w-0 text-xs" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t.weakness.noWeakness(name)}</p>
          )}
        </Card>
        <Card title={t.strategy.avoid}>
          <ul className="flex flex-wrap gap-2">
            {avoid.map(([type, m]) => (
              <li key={type} className="flex items-center gap-1.5">
                <TypeBadge type={type} size="xs" />
                <MultiplierChip value={m} className="min-w-0 text-xs" />
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t.strategy.side}>
          <p className="font-medium">{s.side === "either" ? t.strategy.either : s.side === "physical" ? t.strategy.special : t.strategy.physical}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.stats.def} <span className="font-mono text-foreground tabular">{def}</span> · {t.stats.spd}{" "}
            <span className="font-mono text-foreground tabular">{spd}</span>
          </p>
          {s.stabThreats.length > 0 && (
            <div className="mt-3 border-t border-border pt-3 text-sm">
              <p className="mb-2 text-xs text-muted-foreground">{t.strategy.stabThreats}</p>
              {s.stabThreats.map((st) => (
                <div key={st.type} className="mb-1.5 flex flex-wrap items-center gap-1">
                  <TypeBadge type={st.type} size="xs" />
                  <span className="text-muted-foreground">→</span>
                  {st.hitsSuperEffective.map((x) => (
                    <TypeBadge key={x} type={x} size="xs" className="opacity-80" />
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {s.counters.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-lg font-semibold">{t.strategy.counters}</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {s.counters.map((c) => (
              <Link
                key={c.slug}
                href={`/pokemon/${c.slug}`}
                className="group flex gap-3 rounded-2xl border border-border bg-background/40 p-3 transition-colors hover:border-primary/40 hover:bg-white/[0.04]"
              >
                <div className="grid size-20 shrink-0 place-items-center rounded-xl bg-white/[0.04]">
                  <PokemonImage candidates={artworkCandidatesById(c.id)} alt={c.name} size={80} sizes="80px" className="transition-transform group-hover:scale-110" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold">{c.name}</span>
                    {c.types.map((x) => (
                      <TypeBadge key={x} type={x} size="xs" />
                    ))}
                  </div>
                  <ul className="mt-1.5 flex flex-wrap gap-1">
                    {c.reasons.map((r, i) => (
                      <ReasonChip key={i} reason={r} />
                    ))}
                  </ul>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {t.strategy.countersNote}
          </p>
        </div>
      )}
    </Section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background/40 p-4">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function ReasonChip({ reason }: { reason: CounterReason }) {
  const r = t.strategy.reasons;
  let text: string;
  let tone = "border-white/10 bg-white/5 text-muted-foreground";
  switch (reason.key) {
    case "stab":
      text = format(r.stab, { type: typeLabel(reason.type), m: reason.multiplier });
      tone = "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
      break;
    case "resists":
      text = reason.multiplier === 0 ? format(r.immune, { type: typeLabel(reason.type) }) : format(r.resists, { type: typeLabel(reason.type), m: String(reason.multiplier).replace(".", ",") });
      tone = "border-teal-400/25 bg-teal-500/10 text-teal-100";
      break;
    case "weakTo":
      text = format(r.weakTo, { type: typeLabel(reason.type), m: reason.multiplier });
      tone = "border-red-400/25 bg-red-500/10 text-red-100";
      break;
    case "faster":
      text = format(r.faster, { own: reason.own, rival: reason.rival });
      break;
    case "slower":
      text = format(r.slower, { own: reason.own, rival: reason.rival });
      break;
    case "physicalEdge":
      text = format(r.physicalEdge, { atk: reason.atk, def: reason.def });
      break;
    case "specialEdge":
      text = format(r.specialEdge, { spa: reason.spa, spd: reason.spd });
      break;
  }
  return <li className={cn("rounded-md border px-1.5 py-0.5 text-[11px]", tone)}>{text}</li>;
}
