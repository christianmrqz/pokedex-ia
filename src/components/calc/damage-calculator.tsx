"use client";

import { ArrowLeftRight, Info } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useGame } from "@/components/game/game-context";
import { MultiplierChip } from "@/components/pokemon/multiplier-chip";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { usePokedexIndex } from "@/components/search/use-pokedex-index";
import { usePokemonMoves } from "@/components/search/use-pokemon-moves";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import itemNames from "@/data/generated/items.json";
import { type Generation, type PokemonIndexEntry, type TypeName } from "@/lib/domain";
import { generationLabel, getVersionGroup } from "@/lib/data/games";
import { DEFAULT_FIELD, computeDamage, defaultCombatant, smogonItems, smogonMoveName, speciesExistsInGen, type CombatantInput, type FieldInput } from "@/lib/engine/damage";
import { moveCategoryForGen, moveValuesForVersionGroup, movesForVersionGroup } from "@/lib/engine/learnset";
import { typeEffectiveness, typesForGen } from "@/lib/engine/type-chart";
import { cn } from "@/lib/utils";
import { CombatantPanel } from "./combatant-panel";

const COLOR_ATK = "#1fa3b8";
const COLOR_DEF = "#d9773d";
const ITEM_ES = itemNames as Record<string, string | null>;

const WEATHER: [FieldInput["weather"], string][] = [
  ["", "Sin clima"],
  ["Sun", "Sol"],
  ["Rain", "Lluvia"],
  ["Sand", "Tormenta de arena"],
  ["Snow", "Nieve"],
  ["Hail", "Granizo"],
  ["Harsh Sunshine", "Sol abrasador"],
  ["Heavy Rain", "Diluvio"],
  ["Strong Winds", "Turbulencia"],
];
const TERRAIN: [FieldInput["terrain"], string][] = [
  ["", "Sin campo"],
  ["Electric", "Campo Eléctrico"],
  ["Grassy", "Campo de Hierba"],
  ["Psychic", "Campo Psíquico"],
  ["Misty", "Campo de Niebla"],
];

function initialCombatant(entry: PokemonIndexEntry | undefined, prev?: CombatantInput): CombatantInput {
  const base = prev ? { ...prev } : defaultCombatant(entry?.smogon ?? "");
  return { ...base, species: entry?.smogon ?? "", ability: entry?.abilities[0] ?? entry?.hidden ?? null, teraType: null };
}

export function DamageCalculator({ abilityNames }: { abilityNames: Record<string, string> }) {
  const router = useRouter();
  const params = useSearchParams();
  const { data } = usePokedexIndex();
  const { gen: selectedGen, versionGroup } = useGame();
  const [aSlug, setASlug] = useState(params.get("a") ?? "garchomp");
  const [dSlug, setDSlug] = useState(params.get("d") ?? "drapion");
  const [attacker, setAttacker] = useState<CombatantInput | null>(null);
  const [defender, setDefender] = useState<CombatantInput | null>(null);
  const [move, setMove] = useState<string | null>(params.get("m"));
  const [field, setField] = useState<FieldInput>(DEFAULT_FIELD);

  const aEntry = data?.bySlug.get(aSlug);
  const dEntry = data?.bySlug.get(dSlug);
  const gen = (selectedGen >= Math.max(aEntry?.gen ?? 1, dEntry?.gen ?? 1) ? selectedGen : 9) as Generation;
  const atk = attacker ?? (aEntry ? initialCombatant(aEntry) : null);
  const def = defender ?? (dEntry ? initialCombatant(dEntry) : null);

  const moves = usePokemonMoves(aEntry?.slug ?? null);
  const vgSlug = moves.data ? (versionGroup !== "auto" && moves.data.versionGroups.includes(versionGroup) ? versionGroup : moves.data.versionGroups.at(-1)) : undefined;
  const vg = vgSlug ? getVersionGroup(vgSlug) : undefined;

  // Movimientos de daño aprendibles en el juego, con nombre en español.
  const moveOptions = useMemo(() => {
    if (!moves.data || !vg) return [];
    const seen = new Set<string>();
    return movesForVersionGroup(moves.data.learnset, vg.slug)
      .filter((r) => (seen.has(r.move) ? false : (seen.add(r.move), true)))
      .map((r) => {
        const m = moves.data!.moves[r.move];
        if (!m) return null;
        const values = moveValuesForVersionGroup({ ...m, id: 0, gen: 0 }, vg.order);
        const category = moveCategoryForGen(m.category, values.type, vg.gen);
        return category === "status" ? null : { slug: r.move, name: m.es, type: values.type, category, power: values.power, accuracy: values.accuracy };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && !!smogonMoveName(x.slug, gen))
      .sort((x, y) => x.name.localeCompare(y.name, "es"));
  }, [moves.data, vg, gen]);

  // Por defecto, el movimiento con más daño esperado contra el defensor (potencia × STAB × efectividad × precisión).
  const defenderTypes = dEntry ? typesForGen(dEntry, gen) : [];
  const attackerTypes = aEntry ? typesForGen(aEntry, gen) : [];
  const expected = (m: (typeof moveOptions)[number]) =>
    (m.power ?? 0) * (attackerTypes.includes(m.type) ? 1.5 : 1) * typeEffectiveness(m.type, defenderTypes, gen) * ((m.accuracy ?? 100) / 100);
  const bestMove = moveOptions.reduce<(typeof moveOptions)[number] | null>((best, m) => (!best || expected(m) > expected(best) ? m : best), null);
  const chosenMove = move && moveOptions.some((m) => m.slug === move) ? move : (bestMove?.slug ?? null);

  const items = useMemo(() => smogonItems(gen).map((name) => ({ name, label: ITEM_ES[name] ?? name })).sort((x, y) => x.label.localeCompare(y.label, "es")), [gen]);

  let result: ReturnType<typeof computeDamage> | null = null;
  let error: string | null = null;
  if (atk && def && chosenMove && aEntry?.smogon && dEntry?.smogon) {
    if (!speciesExistsInGen(aEntry.smogon, gen) || !speciesExistsInGen(dEntry.smogon, gen)) error = `Uno de los Pokémon no existe en la ${generationLabel(gen)}.`;
    else {
      try {
        result = computeDamage(gen, atk, def, chosenMove, field);
      } catch (e) {
        error = (e as Error).message;
      }
    }
  } else if ((aEntry && !aEntry.smogon) || (dEntry && !dEntry.smogon)) {
    error = "Esta forma no está disponible en el motor de cálculo (@smogon/calc).";
  }

  const syncUrl = (a: string, d: string, m: string | null) => router.replace(`?a=${a}&d=${d}${m ? `&m=${m}` : ""}`, { scroll: false });

  if (!data) return <Skeleton className="h-[40rem] rounded-3xl" />;

  const defTypes = dEntry ? (gen >= 9 && def?.teraType ? [def.teraType] : typesForGen(dEntry, gen)) : [];
  const effectiveness = result ? typeEffectiveness(result.moveType, defTypes as TypeName[], gen) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_minmax(0,1.1fr)_1fr]">
      <div className="order-1">
        {atk && (
          <CombatantPanel
            role="attacker"
            title="Atacante"
            accent={COLOR_ATK}
            entry={aEntry}
            slug={aSlug}
            onSlug={(s) => {
              setASlug(s);
              setAttacker(initialCombatant(data.bySlug.get(s), atk));
              setMove(null);
              syncUrl(s, dSlug, null);
            }}
            value={atk}
            onChange={setAttacker}
            gen={gen}
            abilityNames={abilityNames}
            items={items}
          >
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Movimiento {vg && <span>({vg.es})</span>}
              {moves.isLoading ? (
                <Skeleton className="h-8" />
              ) : moves.error ? (
                <span className="text-sm text-red-300">No se pudieron cargar los movimientos.</span>
              ) : (
                <Select
                  value={chosenMove ?? undefined}
                  onValueChange={(v) => {
                    setMove(v);
                    syncUrl(aSlug, dSlug, v);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elige un movimiento" />
                  </SelectTrigger>
                  <SelectContent className="max-h-96">
                    {(["physical", "special"] as const).map((cat) => (
                      <SelectGroup key={cat}>
                        <SelectLabel>{cat === "physical" ? "Físicos" : "Especiales"}</SelectLabel>
                        {moveOptions
                          .filter((m) => m.category === cat)
                          .map((m) => (
                            <SelectItem key={m.slug} value={m.slug}>
                              <span className="size-2 rounded-full" style={{ background: `var(--color-type-${m.type})` }} />
                              {m.name} {m.power ? <span className="text-muted-foreground">· {m.power}</span> : null}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </label>
          </CombatantPanel>
        )}
      </div>

      <div className="order-3 space-y-5 lg:order-2">
        <ResultCard result={result} error={error} effectiveness={effectiveness} attacker={aEntry?.es} defender={dEntry?.es} moveName={moveOptions.find((m) => m.slug === chosenMove)?.name} />
        <section className="space-y-4 rounded-3xl surface p-5" aria-label="Condiciones">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Condiciones</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setASlug(dSlug);
                setDSlug(aSlug);
                setAttacker(def);
                setDefender(atk);
                setMove(null);
                syncUrl(dSlug, aSlug, null);
              }}
            >
              <ArrowLeftRight /> Intercambiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{generationLabel(gen)} · cambia el juego en la cabecera</p>
          <div className="grid grid-cols-2 gap-3">
            <SimpleSelect label="Clima" value={field.weather} options={WEATHER} onChange={(v) => setField({ ...field, weather: v })} disabled={gen < 2} />
            <SimpleSelect label="Campo" value={field.terrain} options={TERRAIN} onChange={(v) => setField({ ...field, terrain: v })} disabled={gen < 6} />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <Toggle label="Golpe crítico" checked={field.isCrit} onChange={(v) => setField({ ...field, isCrit: v })} />
            <Toggle label="Combate doble" checked={field.doubles} onChange={(v) => setField({ ...field, doubles: v })} disabled={gen < 3} />
            <Toggle label="Reflejo (defensor)" checked={field.reflect} onChange={(v) => setField({ ...field, reflect: v })} />
            <Toggle label="Pantalla Luz (defensor)" checked={field.lightScreen} onChange={(v) => setField({ ...field, lightScreen: v })} />
            <Toggle label="Velo Aurora (defensor)" checked={field.auroraVeil} onChange={(v) => setField({ ...field, auroraVeil: v })} disabled={gen < 7} />
            <Toggle label="Refuerzo" checked={field.helpingHand} onChange={(v) => setField({ ...field, helpingHand: v })} disabled={gen < 3} />
            <Toggle label="Gravedad" checked={field.gravity} onChange={(v) => setField({ ...field, gravity: v })} disabled={gen < 4} />
          </div>
        </section>
      </div>

      <div className="order-2 lg:order-3">
        {def && (
          <CombatantPanel
            role="defender"
            title="Defensor"
            accent={COLOR_DEF}
            entry={dEntry}
            slug={dSlug}
            onSlug={(s) => {
              setDSlug(s);
              setDefender(initialCombatant(data.bySlug.get(s), def));
              syncUrl(aSlug, s, chosenMove);
            }}
            value={def}
            onChange={setDefender}
            gen={gen}
            abilityNames={abilityNames}
            items={items}
          />
        )}
      </div>
    </div>
  );
}

function ResultCard({
  result,
  error,
  effectiveness,
  attacker,
  defender,
  moveName,
}: {
  result: ReturnType<typeof computeDamage> | null;
  error: string | null;
  effectiveness: number | null;
  attacker?: string;
  defender?: string;
  moveName?: string;
}) {
  if (error) return <section className="rounded-3xl surface p-6 text-sm text-amber-100">{error}</section>;
  if (!result) return <Skeleton className="h-72 rounded-3xl" />;
  const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 });
  const remainingMax = Math.max(0, result.defenderHp - result.min);
  const remainingMin = Math.max(0, result.defenderHp - result.max);
  const pct = (n: number) => `${Math.min(100, (n / result.defenderMaxHp) * 100)}%`;

  return (
    <section className="rounded-3xl surface p-6" aria-live="polite" aria-label="Resultado">
      <p className="text-sm text-muted-foreground">
        {attacker} usa <span className="text-foreground">{moveName}</span> contra {defender}
      </p>
      <p className="mt-2 text-4xl font-bold tabular-nums sm:text-5xl">
        {fmt(result.minPercent)} – {fmt(result.maxPercent)} %
      </p>
      <p className="mt-1 font-mono text-sm text-muted-foreground tabular">
        {result.min} – {result.max} PS de {result.defenderHp}
        {result.defenderHp !== result.defenderMaxHp && ` (máx. ${result.defenderMaxHp})`}
      </p>

      {/* Barra de PS: verde = PS restantes seguros, ámbar = depende de la tirada */}
      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/[0.06]" role="img" aria-label={`PS restantes entre ${remainingMin} y ${remainingMax}`}>
        <div className="relative h-full" style={{ width: pct(result.defenderHp) }}>
          <div className="absolute inset-y-0 left-0 rounded-full bg-amber-400/70" style={{ width: `${(remainingMax / result.defenderHp) * 100}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-400" style={{ width: `${(remainingMin / result.defenderHp) * 100}%` }} />
        </div>
      </div>
      <p className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-400" /> PS que quedan siempre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-400/70" /> Según la tirada
        </span>
      </p>

      <p className={cn("mt-4 rounded-xl px-3 py-2 text-sm font-medium", result.ko?.hits === 1 ? "bg-red-500/15 text-red-100" : "bg-white/5")}>{result.koText}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Tipo</dt>
          <dd className="mt-1">
            <TypeBadge type={result.moveType} size="xs" />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Potencia</dt>
          <dd className="mt-1 font-mono tabular">{result.basePower}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">STAB</dt>
          <dd className="mt-1">{result.hasStab ? "Sí (×1,5)" : "No"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Efectividad</dt>
          <dd className="mt-1">{effectiveness !== null ? <MultiplierChip value={effectiveness} className="min-w-0 text-xs" /> : "—"}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        {result.moveCategory === "Physical" ? "Físico" : "Especial"}: Ataque {result.moveCategory === "Physical" ? result.attackerStats[1] : result.attackerStats[3]} contra{" "}
        {result.moveCategory === "Physical" ? "Defensa " + result.defenderStats[2] : "Def. Esp. " + result.defenderStats[4]} (estadísticas reales, antes de modificadores).
      </p>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Las 16 tiradas posibles</summary>
        <p className="mt-2 font-mono text-xs leading-relaxed tabular">{result.rolls.join(", ")}</p>
        {result.showdownDesc && <p className="mt-2 text-xs text-muted-foreground">Showdown: {result.showdownDesc}</p>}
      </details>
      <p className="mt-4 flex gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Cálculo de @smogon/calc, el motor de Pokémon Showdown. El daño varía entre el 85 % y el 100 % por una tirada aleatoria; no incluye efectos secundarios
        (quemaduras, retroceso…).
      </p>
    </section>
  );
}

function SimpleSelect<T extends string>({ label, value, options, onChange, disabled }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-xs text-muted-foreground", disabled && "opacity-50")}>
      {label}
      <Select value={value || "none"} onValueChange={(v) => onChange((v === "none" ? "" : v) as T)} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([k, l]) => (
            <SelectItem key={k || "none"} value={k || "none"}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={cn("flex items-center gap-2", disabled && "opacity-50")}>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
      {label}
    </label>
  );
}
