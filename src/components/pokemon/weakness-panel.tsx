"use client";

import { ShieldHalf } from "lucide-react";
import { useMemo, useState } from "react";
import { useGame } from "@/components/game/game-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { format, getDictionary } from "@/i18n";
import type { TypeName } from "@/lib/domain";
import { generationLabel } from "@/lib/data/games";
import {
  SUPPORTED_DEFENSIVE_ABILITIES,
  TERA_TYPES,
  advancedProfile,
  type BattleConditions,
  type EffectNote,
} from "@/lib/engine/battle-effectiveness";
import { defensiveProfile, typeLabel, typesForGen } from "@/lib/engine/type-chart";
import { TYPE_COLORS } from "@/lib/ui/type-colors";
import { cn } from "@/lib/utils";
import { MultiplierChip, multiplierTone } from "./multiplier-chip";
import { Section } from "./section";
import { TypeBadge } from "./type-badge";

const t = getDictionary();

export interface WeaknessPanelProps {
  name: string;
  types: TypeName[];
  pastTypes?: { untilGen: number; types: TypeName[] }[];
  introducedIn: number;
  abilities: { slug: string; name: string; hidden: boolean }[];
  /** Nombres en español (PokéAPI) de objetos y habilidades usados en el modo avanzado. */
  labels: Record<string, string>;
}

const ITEMS = ["air-balloon", "iron-ball", "ring-target"] as const;
const ATTACKER_ABILITIES = ["scrappy", "minds-eye", "tinted-lens", "mold-breaker"] as const;
const QUICK_ROWS = [4, 2, 1, 0.5, 0.25, 0] as const;

export function WeaknessPanel(props: WeaknessPanelProps) {
  const { gen: selectedGen } = useGame();
  const gen = selectedGen >= props.introducedIn ? selectedGen : 9;
  const types = useMemo(() => typesForGen(props, gen), [props, gen]);
  const [mode, setMode] = useState<"quick" | "advanced">("quick");

  return (
    <Section
      id="debilidades"
      title={t.weakness.title}
      icon={<ShieldHalf />}
      description={
        <span className="flex flex-wrap items-center gap-1.5">
          {generationLabel(gen)} ·{" "}
          {types.map((type) => (
            <TypeBadge key={type} type={type} size="xs" />
          ))}
        </span>
      }
      actions={
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && setMode(v as "quick" | "advanced")}
          variant="outline"
          size="sm"
          aria-label="Modo"
        >
          <ToggleGroupItem value="quick">{t.weakness.quick}</ToggleGroupItem>
          <ToggleGroupItem value="advanced">{t.weakness.advanced}</ToggleGroupItem>
        </ToggleGroup>
      }
    >
      <p className="-mt-2 mb-4 text-xs text-muted-foreground">{mode === "quick" ? t.weakness.quickHelp : t.weakness.advancedHelp}</p>
      {mode === "quick" ? <QuickView types={types} gen={gen} /> : <AdvancedView {...props} types={types} gen={gen} />}
    </Section>
  );
}

function QuickView({ types, gen }: { types: TypeName[]; gen: BattleConditions["gen"] }) {
  const profile = defensiveProfile(types, gen);
  const rows: Record<number, TypeName[]> = {
    4: profile.quad,
    2: profile.double,
    1: profile.neutral,
    0.5: profile.half,
    0.25: profile.quarter,
    0: profile.immune,
  };
  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        {QUICK_ROWS.filter((m) => rows[m].length > 0).map((m) => (
          <div key={m} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex w-56 shrink-0 items-center gap-2">
              <MultiplierChip value={m} />
              <span className="text-sm text-muted-foreground">{t.multipliers[String(m)]}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rows[m].map((type) => (
                <TypeBadge key={type} type={type} size={m === 1 ? "xs" : "sm"} className={m === 1 ? "opacity-70" : undefined} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <TypeGrid entries={profile.entries.map((e) => ({ type: e.type, value: e.multiplier }))} />
    </div>
  );
}

/** Tabla compacta de los tipos atacantes: se ve completa sin desplazarse. */
function TypeGrid({ entries }: { entries: { type: TypeName; value: number; changed?: boolean }[] }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:grid-cols-9">
      {entries.map((e) => (
        <div
          key={e.type}
          className={cn(
            "flex items-center justify-between gap-1 overflow-hidden rounded-lg border-l-4 bg-white/[0.03] py-1.5 pr-1.5 pl-2 ring-1 ring-white/5",
            e.changed && "ring-primary/60",
          )}
          style={{ borderLeftColor: TYPE_COLORS[e.type] }}
        >
          <span className="truncate text-xs">{typeLabel(e.type)}</span>
          <span className={cn("rounded px-1 font-mono text-xs font-semibold tabular ring-1", multiplierTone(e.value))}>
            {String(e.value).replace(".", ",")}
          </span>
        </div>
      ))}
    </div>
  );
}

function AdvancedView({ abilities, labels, types, gen }: WeaknessPanelProps & { types: TypeName[]; gen: BattleConditions["gen"] }) {
  const [ability, setAbility] = useState<string>(() => abilities.find((a) => SUPPORTED_DEFENSIVE_ABILITIES[a.slug])?.slug ?? "none");
  const [tera, setTera] = useState<string>("none");
  const [item, setItem] = useState<string>("none");
  const [attacker, setAttacker] = useState<string>("none");
  const [gravity, setGravity] = useState(false);
  const [strongWinds, setStrongWinds] = useState(false);
  const [roost, setRoost] = useState(false);

  const conditions: BattleConditions = {
    gen,
    defenderTypes: types,
    defenderAbility: ability === "none" ? null : ability,
    teraType: gen >= 9 && tera !== "none" ? (tera as BattleConditions["teraType"]) : null,
    defenderItem: item === "none" ? null : (item as BattleConditions["defenderItem"]),
    attackerAbility: attacker === "none" ? null : (attacker as BattleConditions["attackerAbility"]),
    gravity,
    strongWinds,
    roost,
  };
  const entries = advancedProfile(conditions);
  const abilityNames: Record<string, string> = { ...labels, ...Object.fromEntries(abilities.map((a) => [a.slug, a.name])) };
  const changed = entries.filter((e) => e.notes.some((n) => n.kind !== "type"));
  const selectedAbilityUnsupported = ability !== "none" && !SUPPORTED_DEFENSIVE_ABILITIES[ability];

  const groups = [...new Set(entries.map((e) => e.finalMultiplier))].sort((a, b) => b - a);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Control label={t.weakness.ability}>
          <Select value={ability} onValueChange={setAbility}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t.weakness.noAbility}</SelectItem>
              {abilities.map((a) => (
                <SelectItem key={a.slug} value={a.slug}>
                  {a.name}
                  {a.hidden ? ` (${t.pokemon.hiddenAbility})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Control>
        <Control label={t.weakness.tera}>
          <Select value={tera} onValueChange={setTera} disabled={gen < 9}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t.weakness.noTera}</SelectItem>
              {TERA_TYPES.map((tt) => (
                <SelectItem key={tt} value={tt}>
                  {tt === "stellar" ? "Astral" : typeLabel(tt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Control>
        <Control label={t.weakness.item}>
          <Select value={item} onValueChange={setItem} disabled={gen < 2}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t.weakness.noItem}</SelectItem>
              {ITEMS.map((i) => (
                <SelectItem key={i} value={i}>
                  {labels[i] ?? i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Control>
        <Control label={t.weakness.attacker}>
          <Select value={attacker} onValueChange={setAttacker} disabled={gen < 3}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t.weakness.noAbility}</SelectItem>
              {ATTACKER_ABILITIES.map((a) => (
                <SelectItem key={a} value={a}>
                  {labels[a] ?? a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Control>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Toggle label={t.weakness.gravity} checked={gravity} onChange={setGravity} />
        <Toggle label={t.weakness.strongWinds} checked={strongWinds} onChange={setStrongWinds} disabled={gen < 6} />
        {types.includes("flying") && <Toggle label={t.weakness.roost} checked={roost} onChange={setRoost} disabled={gen < 4} />}
      </div>
      {selectedAbilityUnsupported && <p className="text-xs text-muted-foreground">{t.weakness.unsupportedAbility}</p>}

      <div className="space-y-2.5">
        {groups.map((m) => (
          <div key={m} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex w-56 shrink-0 items-center gap-2">
              <MultiplierChip value={m} />
              <span className="text-sm text-muted-foreground">{t.multipliers[String(m)] ?? (m > 1 ? t.multipliers["2"] : t.multipliers["0.5"])}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {entries
                .filter((e) => e.finalMultiplier === m)
                .map((e) => (
                  <TypeBadge key={e.type} type={e.type} size={m === 1 ? "xs" : "sm"} className={m === 1 ? "opacity-70" : undefined} />
                ))}
            </div>
          </div>
        ))}
      </div>

      <TypeGrid entries={entries.map((e) => ({ type: e.type, value: e.finalMultiplier, changed: e.typeMultiplier !== e.finalMultiplier }))} />

      {changed.length > 0 && (
        <div className="rounded-2xl border border-border bg-background/40 p-4">
          <ul className="space-y-2 text-sm">
            {changed.map((e) => (
              <li key={e.type} className="flex flex-wrap items-center gap-2">
                <TypeBadge type={e.type} size="xs" />
                <span className="text-muted-foreground">
                  {t.weakness.typeMultiplier} <MultiplierChip value={e.typeMultiplier} className="mx-1 min-w-0 text-xs" /> →{" "}
                  {t.weakness.finalMultiplier} <MultiplierChip value={e.finalMultiplier} className="mx-1 min-w-0 text-xs" />
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {e.notes
                    .filter((n) => n.kind !== "type" || e.finalMultiplier === 0)
                    .map((n) => (
                      <NoteChip key={n.key + JSON.stringify(n.params)} note={n} names={abilityNames} />
                    ))}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-white/40" /> {t.notes["note.typeImmunity"]}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-violet-400" /> {t.weakness.legendAbility}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-sky-400" /> {t.weakness.tera}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-400" /> {t.weakness.legendModifier}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteChip({ note, names }: { note: EffectNote; names: Record<string, string> }) {
  const params: Record<string, string | number> = { ...note.params };
  if (typeof params.ability === "string") params.ability = names[params.ability] ?? params.ability;
  if (typeof params.type === "string") params.type = typeLabel(params.type as TypeName);
  const tone =
    note.kind === "ability-immunity"
      ? "border-violet-400/30 bg-violet-500/10 text-violet-100"
      : note.kind === "type"
        ? "border-white/15 bg-white/5"
        : note.kind === "tera"
          ? "border-sky-400/30 bg-sky-500/10 text-sky-100"
          : "border-amber-400/25 bg-amber-500/10 text-amber-100";
  return <span className={cn("rounded-md border px-2 py-0.5 text-xs", tone)}>{format(t.notes[note.key] ?? note.key, params)}</span>;
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
      {label}
      {children}
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
