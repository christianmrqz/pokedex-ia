"use client";

import { ArrowLeftRight, Gauge, Swords } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useGame } from "@/components/game/game-context";
import { MultiplierChip } from "@/components/pokemon/multiplier-chip";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { PokemonPicker } from "@/components/search/pokemon-picker";
import { usePokedexIndex } from "@/components/search/use-pokedex-index";
import { usePokemonMoves } from "@/components/search/use-pokemon-moves";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getDictionary } from "@/i18n";
import { STAT_KEYS, type Generation, type PokemonIndexEntry, type StatTuple } from "@/lib/domain";
import { generationLabel, getVersionGroup } from "@/lib/data/games";
import { compareMatchup, highlightMoves, type StatRange } from "@/lib/engine/compare";
import { artworkCandidatesById } from "@/lib/engine/sprites";
import { calcStats } from "@/lib/engine/stats";
import { defensiveProfile, typeLabel } from "@/lib/engine/type-chart";
import { formatDexNumber } from "@/lib/ui/format";
import { cn } from "@/lib/utils";

const t = getDictionary();
/** Colores validados (contraste, daltonismo y luminosidad sobre el fondo oscuro). */
const COLOR_A = "#1fa3b8";
const COLOR_B = "#d9773d";

type Mode = "base" | "50" | "100";

export function Comparator({ abilityNames }: { abilityNames: Record<string, string> }) {
  const router = useRouter();
  const params = useSearchParams();
  const { data } = usePokedexIndex();
  const { gen: selectedGen, versionGroup } = useGame();
  const [mode, setMode] = useState<Mode>("base");
  const aSlug = params.get("a") ?? "garchomp";
  const bSlug = params.get("b") ?? "drapion";
  const a = data?.bySlug.get(aSlug);
  const b = data?.bySlug.get(bSlug);
  const movesA = usePokemonMoves(a?.slug ?? null);
  const movesB = usePokemonMoves(b?.slug ?? null);
  // Los movimientos de ambos se comparan en el mismo juego: el elegido si ambos tienen datos, o el más reciente en común.
  const commonVgs = movesA.data && movesB.data ? movesA.data.versionGroups.filter((v) => movesB.data!.versionGroups.includes(v)) : [];
  const sharedVg = versionGroup !== "auto" && commonVgs.includes(versionGroup) ? versionGroup : commonVgs.at(-1);

  const set = (key: "a" | "b", slug: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, slug);
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  const pickers = (
    <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
      <PickerWithSwatch color={COLOR_A} label="Pokémon A">
        <PokemonPicker value={a?.slug ?? aSlug} onChange={(s) => set("a", s)} label="Pokémon A" />
      </PickerWithSwatch>
      <Button
        variant="outline"
        size="icon"
        className="mx-auto"
        aria-label="Intercambiar"
        onClick={() => router.replace(`?a=${bSlug}&b=${aSlug}`, { scroll: false })}
      >
        <ArrowLeftRight />
      </Button>
      <PickerWithSwatch color={COLOR_B} label="Pokémon B">
        <PokemonPicker value={b?.slug ?? bSlug} onChange={(s) => set("b", s)} label="Pokémon B" />
      </PickerWithSwatch>
    </div>
  );

  if (!a || !b) {
    return (
      <div className="space-y-6">
        {pickers}
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  // Si uno de los dos no existía en la generación elegida, se usa la actual.
  const gen = (selectedGen >= Math.max(a.gen, b.gen) ? selectedGen : 9) as Generation;
  const level = mode === "100" ? 100 : 50;
  const m = compareMatchup(a, b, gen, level);
  const realStats = (base: StatTuple): StatTuple => calcStats({ gen, base, level, ivs: [31, 31, 31, 31, 31, 31], evs: [0, 0, 0, 0, 0, 0] });
  const shownA = mode === "base" ? m.aStats : realStats(m.aStats);
  const shownB = mode === "base" ? m.bStats : realStats(m.bStats);

  return (
    <div className="space-y-6">
      {pickers}
      <p className="text-sm text-muted-foreground">
        {generationLabel(gen)} · tabla de tipos y estadísticas base de esa generación
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Header entry={a} types={m.aTypes} color={COLOR_A} abilityNames={abilityNames} />
        <Header entry={b} types={m.bTypes} color={COLOR_B} abilityNames={abilityNames} />
      </div>

      {/* Estadísticas */}
      <section className="rounded-3xl surface p-5 sm:p-7" aria-labelledby="cmp-stats">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="cmp-stats" className="text-xl font-semibold">
            Estadísticas
          </h2>
          <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as Mode)} variant="outline" size="sm">
            <ToggleGroupItem value="base">Base</ToggleGroupItem>
            <ToggleGroupItem value="50">Reales Nv 50</ToggleGroupItem>
            <ToggleGroupItem value="100">Reales Nv 100</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Legend a={a.es} b={b.es} />
        <MirroredBars a={shownA} b={shownB} max={mode === "base" ? 255 : Math.max(...shownA, ...shownB)} />
        <p className="mt-3 text-xs text-muted-foreground">
          {mode === "base"
            ? "Estadísticas base: no dependen del nivel ni del entrenamiento."
            : `Estadísticas reales a nivel ${level} con IV 31, sin EV y naturaleza neutra.`}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tipos */}
        <section className="rounded-3xl surface p-5 sm:p-6" aria-labelledby="cmp-types">
          <h2 id="cmp-types" className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Swords className="size-5 text-primary" /> Ventaja de tipos
          </h2>
          <MatchLine attacker={a.es} defender={b.es} type={m.aOffense.type} multiplier={m.aOffense.multiplier} color={COLOR_A} />
          <MatchLine attacker={b.es} defender={a.es} type={m.bOffense.type} multiplier={m.bOffense.multiplier} color={COLOR_B} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <WeakList entry={a} types={m.aTypes} gen={gen} color={COLOR_A} />
            <WeakList entry={b} types={m.bTypes} gen={gen} color={COLOR_B} />
          </div>
        </section>

        {/* Velocidad */}
        <section className="rounded-3xl surface p-5 sm:p-6" aria-labelledby="cmp-speed">
          <h2 id="cmp-speed" className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Gauge className="size-5 text-primary" /> Velocidad a nivel {m.speed.level}
          </h2>
          <SpeedRow name={a.es} range={m.speed.a} color={COLOR_A} />
          <SpeedRow name={b.es} range={m.speed.b} color={COLOR_B} />
          <p className="mt-4 text-sm">{speedVerdict(a.es, b.es, m.speed.a, m.speed.b)}</p>
          <p className="mt-2 text-xs text-muted-foreground">Mínimo: IV 0, sin EV y naturaleza que la reduce. Máximo: IV 31, 252 EV y naturaleza que la aumenta.</p>
        </section>
      </div>

      <section className="rounded-3xl surface p-5 sm:p-7" aria-labelledby="cmp-eval">
        <h2 id="cmp-eval" className="mb-4 text-xl font-semibold">
          Evaluación
        </h2>
        <ul className="space-y-2 text-sm">
          {evaluate(a.es, b.es, m).map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {line}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <MovesBlock self={a} target={b} selfTypes={m.aTypes} targetTypes={m.bTypes} color={COLOR_A} query={movesA} sharedVg={sharedVg} />
        <MovesBlock self={b} target={a} selfTypes={m.bTypes} targetTypes={m.aTypes} color={COLOR_B} query={movesB} sharedVg={sharedVg} />
      </div>
    </div>
  );
}

function PickerWithSwatch({ color, label, children }: { color: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-3 shrink-0 rounded-full" style={{ background: color }} aria-label={label} />
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Legend({ a, b }: { a: string; b: string }) {
  return (
    <div className="mb-4 flex justify-between text-sm">
      <span className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: COLOR_A }} /> {a}
      </span>
      <span className="flex items-center gap-2">
        {b} <span className="size-2.5 rounded-full" style={{ background: COLOR_B }} />
      </span>
    </div>
  );
}

function Header({ entry, types, color, abilityNames }: { entry: PokemonIndexEntry; types: PokemonIndexEntry["types"]; color: string; abilityNames: Record<string, string> }) {
  return (
    <Link href={`/pokemon/${entry.slug}`} className="group flex min-w-0 items-center gap-4 rounded-3xl surface p-4 transition-colors hover:border-white/20">
      <div className="relative size-24 shrink-0">
        <div aria-hidden className="absolute inset-2 rounded-full blur-xl" style={{ background: `${color}55` }} />
        <PokemonImage candidates={artworkCandidatesById(entry.id)} alt={entry.es} size={96} sizes="96px" className="relative size-full transition-transform group-hover:scale-105" />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-xs text-muted-foreground">{formatDexNumber(entry.speciesId)}</p>
        <h3 className="truncate text-xl font-bold">{entry.es}</h3>
        <div className="mt-1 flex gap-1">
          {types.map((ty) => (
            <TypeBadge key={ty} type={ty} size="xs" />
          ))}
        </div>
        <p className="mt-1.5 truncate text-xs text-muted-foreground">
          {[...entry.abilities, ...(entry.hidden ? [entry.hidden] : [])].map((s) => abilityNames[s] ?? s).join(" · ")}
        </p>
      </div>
    </Link>
  );
}

function MirroredBars({ a, b, max }: { a: StatTuple; b: StatTuple; max: number }) {
  const rows = [...STAT_KEYS.map((k, i) => ({ label: t.stats[k], a: a[i], b: b[i] }))];
  const totalA = a.reduce((x, y) => x + y, 0);
  const totalB = b.reduce((x, y) => x + y, 0);
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td className={cn("w-12 py-1.5 pr-2 text-right font-mono tabular", r.a > r.b ? "font-semibold" : "text-muted-foreground")}>{r.a}</td>
            <td className="w-1/2 py-1.5">
              <div className="flex h-2.5 justify-end">
                <div className="h-full rounded-l-full" style={{ width: `${(r.a / max) * 100}%`, background: COLOR_A }} />
              </div>
            </td>
            <th scope="row" className="w-24 px-2 py-1.5 text-center text-xs font-normal whitespace-nowrap text-muted-foreground">
              {r.label}
            </th>
            <td className="w-1/2 py-1.5">
              <div className="flex h-2.5">
                <div className="h-full rounded-r-full" style={{ width: `${(r.b / max) * 100}%`, background: COLOR_B }} />
              </div>
            </td>
            <td className={cn("w-12 py-1.5 pl-2 font-mono tabular", r.b > r.a ? "font-semibold" : "text-muted-foreground")}>{r.b}</td>
          </tr>
        ))}
        <tr>
          <td className="pt-3 pr-2 text-right font-mono font-semibold tabular">{totalA}</td>
          <td />
          <th scope="row" className="pt-3 text-center text-xs font-medium">
            {t.stats.total}
          </th>
          <td />
          <td className="pt-3 pl-2 font-mono font-semibold tabular">{totalB}</td>
        </tr>
      </tbody>
    </table>
  );
}

function MatchLine({ attacker, defender, type, multiplier, color }: { attacker: string; defender: string; type: PokemonIndexEntry["types"][number]; multiplier: number; color: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-1.5 text-sm">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      <span>
        {attacker} → {defender}: mejor ataque de su tipo
      </span>
      <TypeBadge type={type} size="xs" />
      <MultiplierChip value={multiplier} className="min-w-0 text-xs" />
    </div>
  );
}

function WeakList({ entry, types, gen, color }: { entry: PokemonIndexEntry; types: PokemonIndexEntry["types"]; gen: Generation; color: string }) {
  const p = defensiveProfile(types, gen);
  return (
    <div className="rounded-2xl border border-border bg-background/40 p-3">
      <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="size-2 rounded-full" style={{ background: color }} /> {entry.es}
      </p>
      <div className="flex flex-wrap gap-1">
        {[...p.quad, ...p.double].map((ty) => (
          <span key={ty} className="flex items-center gap-1">
            <TypeBadge type={ty} size="xs" />
            <span className="font-mono text-[11px] text-muted-foreground">×{p.quad.includes(ty) ? 4 : 2}</span>
          </span>
        ))}
      </div>
      {p.immune.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Inmune: {p.immune.map((x) => typeLabel(x)).join(", ")}</p>}
    </div>
  );
}

function SpeedRow({ name, range, color }: { name: string; range: StatRange; color: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 py-2 text-sm">
      <span className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: color }} /> {name}
      </span>
      <span className="font-mono tabular text-muted-foreground">
        {range.min} – <span className="text-foreground">{range.neutral}</span> – {range.max}
      </span>
    </div>
  );
}

function speedVerdict(a: string, b: string, ra: StatRange, rb: StatRange): string {
  if (ra.min > rb.max) return `${a} es siempre más rápido que ${b}, sin importar su entrenamiento.`;
  if (rb.min > ra.max) return `${b} es siempre más rápido que ${a}, sin importar su entrenamiento.`;
  if (ra.neutral === rb.neutral) return "Con IV máximos y sin EV empatan: la velocidad dependerá del entrenamiento (o de un empate aleatorio).";
  const faster = ra.neutral > rb.neutral ? a : b;
  return `Sus rangos se solapan: sin entrenar en Velocidad, ${faster} es más rápido, pero el reparto de EV y la naturaleza pueden cambiarlo.`;
}

function evaluate(a: string, b: string, m: ReturnType<typeof compareMatchup>): string[] {
  const lines: string[] = [];
  const ao = m.aOffense.multiplier;
  const bo = m.bOffense.multiplier;
  if (ao > bo) lines.push(`${a} tiene ventaja de tipos: su ${typeLabel(m.aOffense.type)} hace ×${ao} y ${b} solo consigue ×${bo} con su propio tipo.`);
  else if (bo > ao) lines.push(`${b} tiene ventaja de tipos: su ${typeLabel(m.bOffense.type)} hace ×${bo} y ${a} solo consigue ×${ao} con su propio tipo.`);
  else lines.push(`Ninguno tiene ventaja clara de tipos con ataques de su propio tipo (×${ao} frente a ×${bo}).`);

  const [, aAtk, aDef, aSpa, aSpd] = m.aStats;
  const [, bAtk, bDef, bSpa, bSpd] = m.bStats;
  const aBest = aAtk >= aSpa ? { name: "Ataque", value: aAtk, vs: bDef, vsName: "Defensa" } : { name: "Ataque Especial", value: aSpa, vs: bSpd, vsName: "Defensa Especial" };
  const bBest = bAtk >= bSpa ? { name: "Ataque", value: bAtk, vs: aDef, vsName: "Defensa" } : { name: "Ataque Especial", value: bSpa, vs: aSpd, vsName: "Defensa Especial" };
  lines.push(`${a} ataca con su ${aBest.name} (${aBest.value}) contra la ${aBest.vsName} de ${b} (${aBest.vs}).`);
  lines.push(`${b} ataca con su ${bBest.name} (${bBest.value}) contra la ${bBest.vsName} de ${a} (${bBest.vs}).`);
  lines.push(speedVerdict(a, b, m.speed.a, m.speed.b));
  lines.push("La evaluación usa tipos y estadísticas; para daños concretos usa la calculadora de daño.");
  return lines;
}

function MovesBlock({
  self,
  target,
  selfTypes,
  targetTypes,
  color,
  query,
  sharedVg,
}: {
  self: PokemonIndexEntry;
  target: PokemonIndexEntry;
  selfTypes: PokemonIndexEntry["types"];
  targetTypes: PokemonIndexEntry["types"];
  color: string;
  query: ReturnType<typeof usePokemonMoves>;
  /** Juego común a ambos; si no comparten ninguno se usa el más reciente de cada uno. */
  sharedVg: string | undefined;
}) {
  const { data, isLoading, error } = query;
  const vgSlug = sharedVg ?? data?.versionGroups.at(-1);
  const vg = vgSlug ? getVersionGroup(vgSlug) : undefined;
  const list = data && vg ? highlightMoves(data.learnset, data.moves, { slug: vg.slug, order: vg.order, gen: vg.gen }, selfTypes, targetTypes) : [];

  return (
    <section className="rounded-3xl surface p-5 sm:p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
        <span className="size-2.5 rounded-full" style={{ background: color }} /> Movimientos destacados de {self.es}
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Contra {target.es}
        {vg ? ` · ${vg.es}` : ""}
        {!sharedVg && data ? " (no coinciden en ningún juego)" : ""} · el más fuerte de cada tipo que puede aprender
      </p>
      {isLoading && <Skeleton className="h-40" />}
      {error && <p className="text-sm text-muted-foreground">No se pudieron cargar los movimientos ({(error as Error).message}).</p>}
      {data && list.length === 0 && <p className="text-sm text-muted-foreground">Sin datos de movimientos para este juego.</p>}
      <ul className="space-y-1.5">
        {list.map((mv) => (
          <li key={mv.move} className="flex items-center gap-2 text-sm">
            <TypeBadge type={mv.type} size="xs" />
            <span className="flex-1 truncate">
              {data?.moves[mv.move]?.es ?? mv.move}
              {mv.stab && <span className="ml-1.5 text-[10px] text-primary">STAB</span>}
            </span>
            <span className="font-mono text-xs text-muted-foreground tabular">{mv.power}</span>
            <MultiplierChip value={mv.effectiveness} className="min-w-0 text-xs" />
          </li>
        ))}
      </ul>
    </section>
  );
}
