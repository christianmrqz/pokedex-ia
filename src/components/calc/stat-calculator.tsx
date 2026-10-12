"use client";

import { ArrowDown, ArrowUp, Calculator, Lightbulb, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useGame } from "@/components/game/game-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { getDictionary } from "@/i18n";
import { STAT_KEYS, type Generation, type PokemonIndexEntry, type StatTuple } from "@/lib/domain";
import { NATURES, generationLabel } from "@/lib/data/games";
import { OBJECTIVES, recommendSpread, type Objective } from "@/lib/engine/optimizer";
import { calcStats, evRules, hpDvFromOthers, natureMultipliers, validateEvs } from "@/lib/engine/stats";
import { statsForGen } from "@/lib/engine/strategy";
import { cn } from "@/lib/utils";

const t = getDictionary();

export const OBJECTIVE_LABELS: Record<Objective, string> = {
  "physical-attacker": "Máximo ataque físico",
  "special-attacker": "Máximo ataque especial",
  "max-speed": "Máxima velocidad",
  "physical-wall": "Máxima resistencia física",
  "special-wall": "Máxima resistencia especial",
  balanced: "Reparto equilibrado",
  "trick-room": "Espacio Raro",
};

const STAT_PRETTY: Record<string, string> = {
  hp: t.stats.hp,
  attack: t.stats.atk,
  defense: t.stats.def,
  "special-attack": t.stats.spa,
  "special-defense": t.stats.spd,
  speed: t.stats.spe,
};

export function natureLabel(slug: string): string {
  const n = NATURES.find((x) => x.slug === slug);
  if (!n) return slug;
  if (!n.up || !n.down) return `${n.es} (neutra)`;
  return `${n.es} (+${STAT_PRETTY[n.up]} −${STAT_PRETTY[n.down]})`;
}

export function StatCalculator({ pokemon }: { pokemon: PokemonIndexEntry }) {
  const { gen: selectedGen } = useGame();
  const gen = (selectedGen >= pokemon.gen ? selectedGen : 9) as Generation;
  const rules = evRules(gen);
  const isShedinja = pokemon.speciesSlug === "shedinja";
  const base = statsForGen(pokemon, gen);

  const [level, setLevel] = useState(50);
  const [ivs, setIvs] = useState<StatTuple>([31, 31, 31, 31, 31, 31]);
  const [evs, setEvs] = useState<StatTuple>([0, 0, 0, 0, 0, 0]);
  const [nature, setNature] = useState("hardy");
  const [objective, setObjective] = useState<Objective | null>(null);
  const [lastGen, setLastGen] = useState(gen);

  // Al pasar entre Gen 1-2 (DV/experiencia) y Gen 3+ (IV/EV) se reinician los valores.
  if ((lastGen <= 2) !== (gen <= 2)) {
    setLastGen(gen);
    setIvs(gen <= 2 ? [15, 15, 15, 15, 15, 15] : [31, 31, 31, 31, 31, 31]);
    setEvs([0, 0, 0, 0, 0, 0]);
    setObjective(null);
  } else if (lastGen !== gen) {
    setLastGen(gen);
  }

  const natureEntry = rules.hasNatures ? NATURES.find((n) => n.slug === nature) : null;
  const stats = calcStats({ gen, base, level, ivs, evs, nature: natureEntry, isShedinja });
  const mult = natureMultipliers(natureEntry);
  const problems = validateEvs(evs, gen);
  const evTotal = evs.reduce((a, b) => a + b, 0);
  const recommendation = objective ? recommendSpread(objective, base, gen, { isShedinja }) : null;
  const hpDv = gen <= 2 ? hpDvFromOthers(ivs[1], ivs[2], ivs[5], ivs[3]) : null;

  const setAt = (arr: StatTuple, i: number, v: number): StatTuple => {
    const next = [...arr] as StatTuple;
    next[i] = v;
    // En Gen 1-2 At. Esp. y Def. Esp. comparten la estadística Especial.
    if (gen <= 2 && (i === 3 || i === 4)) {
      next[3] = v;
      next[4] = v;
    }
    return next;
  };

  const applyObjective = (o: Objective) => {
    const r = recommendSpread(o, base, gen, { isShedinja });
    setObjective(o);
    setEvs(r.evs);
    setIvs(r.ivs);
    if (r.nature) setNature(r.nature);
  };

  const statLabel = (i: number) => (gen === 1 && (i === 3 || i === 4) ? "Especial" : t.stats[STAT_KEYS[i]]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="calc-level">
            Nivel
          </label>
          <div className="mt-1.5 flex items-center gap-3">
            <Slider id="calc-level" value={[level]} onValueChange={([v]) => setLevel(v)} min={1} max={100} step={1} className="flex-1" aria-label="Nivel" />
            <Input
              type="number"
              min={1}
              max={100}
              value={level}
              onChange={(e) => setLevel(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
              className="w-20 text-center font-mono"
              aria-label="Nivel (número)"
            />
            <Button variant="outline" size="sm" onClick={() => setLevel(50)}>
              50
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLevel(100)}>
              100
            </Button>
          </div>
        </div>
        {rules.hasNatures ? (
          <div>
            <label className="text-xs text-muted-foreground">Naturaleza</label>
            <Select value={nature} onValueChange={setNature}>
              <SelectTrigger className="mt-1.5 w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {NATURES.map((n) => (
                  <SelectItem key={n.slug} value={n.slug}>
                    {natureLabel(n.slug)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{generationLabel(gen)}: sin naturalezas · DV 0-15 · experiencia 0-65535</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 font-medium">Estadística</th>
              <th className="py-2 text-right font-medium">Base</th>
              <th className="px-3 py-2 font-medium">{gen <= 2 ? "DV" : "IV"}</th>
              <th className="py-2 font-medium">{gen <= 2 ? "Experiencia" : "EV"}</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {STAT_KEYS.map((key, i) => {
              const linked = gen <= 2 && i === 4;
              const derivedHp = gen <= 2 && i === 0;
              return (
                <tr key={key} className="border-b border-border/50">
                  <th scope="row" className="py-2.5 pr-2 text-left font-normal whitespace-nowrap">
                    {statLabel(i)}
                    {mult[i] > 1 && <ArrowUp className="ml-1 inline size-3.5 text-orange-300" aria-label="aumentada por la naturaleza" />}
                    {mult[i] < 1 && <ArrowDown className="ml-1 inline size-3.5 text-sky-300" aria-label="reducida por la naturaleza" />}
                  </th>
                  <td className="py-2.5 pr-3 text-right font-mono text-muted-foreground tabular">{base[i]}</td>
                  <td className="px-3 py-2.5">
                    <Input
                      type="number"
                      min={0}
                      max={rules.maxIv}
                      disabled={linked || derivedHp}
                      value={derivedHp ? (hpDv ?? 0) : ivs[i]}
                      onChange={(e) => setIvs(setAt(ivs, i, Math.min(rules.maxIv, Math.max(0, Number(e.target.value) || 0))))}
                      className="h-8 w-16 text-center font-mono"
                      aria-label={`${gen <= 2 ? "DV" : "IV"} de ${statLabel(i)}`}
                    />
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[evs[i]]}
                        onValueChange={([v]) => setEvs(setAt(evs, i, v))}
                        min={0}
                        max={rules.perStat}
                        step={gen <= 2 ? 256 : 4}
                        disabled={linked}
                        className="w-28 sm:w-40"
                        aria-label={`EV de ${statLabel(i)}`}
                      />
                      <Input
                        type="number"
                        min={0}
                        max={rules.perStat}
                        disabled={linked}
                        value={evs[i]}
                        onChange={(e) => setEvs(setAt(evs, i, Math.min(rules.perStat, Math.max(0, Number(e.target.value) || 0))))}
                        className="h-8 w-20 text-center font-mono"
                        aria-label={`EV de ${statLabel(i)} (número)`}
                      />
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono text-lg font-semibold tabular">{stats[i]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        {rules.total !== null ? (
          <p className={cn("text-muted-foreground", problems.length && "text-red-300")}>
            EV usados: <span className="font-mono tabular">{evTotal}</span> / {rules.total} · máximo {rules.perStat} por estadística
            {problems.length > 0 && ` · ${problems.join(" · ")}`}
          </p>
        ) : (
          <p className="text-muted-foreground">El DV de PS se deriva de los demás DV ({hpDv}).</p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIvs(Array(6).fill(rules.maxIv) as StatTuple)}>
            IV máx.
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIvs([0, 0, 0, 0, 0, 0])}>
            IV 0
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEvs([0, 0, 0, 0, 0, 0]);
              setObjective(null);
            }}
          >
            <RotateCcw /> EV
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background/40 p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <Lightbulb className="size-4 text-primary" /> ¿Qué EV e IV me convienen?
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {OBJECTIVES.map((o) => (
            <Button key={o} variant={objective === o ? "default" : "outline"} size="sm" onClick={() => applyObjective(o)}>
              {OBJECTIVE_LABELS[o]}
            </Button>
          ))}
        </div>
        {recommendation && (
          <ul className="mt-4 space-y-1.5 text-sm text-foreground/85">
            {recommendation.altNature && (
              <li>
                Alternativa: <span className="font-medium">{natureLabel(recommendation.altNature)}</span>
              </li>
            )}
            {recommendation.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                {r}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          31 IV no siempre es lo mejor: un atacante especial prefiere 0 IV en Ataque (menos daño por confusión y Juego Sucio) y un equipo de Espacio Raro
          quiere 0 IV en Velocidad.
        </p>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calculator className="size-3.5" />
        Fórmulas oficiales de {generationLabel(gen)} · estadísticas base de {pokemon.es} en esa generación
        {isShedinja && " · Shedinja siempre tiene 1 PS"}
      </p>
    </div>
  );
}
