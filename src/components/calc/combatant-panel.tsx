"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { natureLabel } from "@/components/calc/stat-calculator";
import { PokemonPicker } from "@/components/search/pokemon-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDictionary } from "@/i18n";
import { STAT_KEYS, TYPE_NAMES, type Generation, type PokemonIndexEntry, type StatTuple } from "@/lib/domain";
import { NATURES } from "@/lib/data/games";
import type { CombatantInput } from "@/lib/engine/damage";
import { typeLabel } from "@/lib/engine/type-chart";
import { cn } from "@/lib/utils";

const t = getDictionary();

const STATUS: [CombatantInput["status"], string][] = [
  ["", "Sin estado"],
  ["brn", "Quemado"],
  ["par", "Paralizado"],
  ["psn", "Envenenado"],
  ["tox", "Gravemente envenenado"],
  ["slp", "Dormido"],
  ["frz", "Congelado"],
];

interface Props {
  role: "attacker" | "defender";
  title: string;
  accent: string;
  entry: PokemonIndexEntry | undefined;
  slug: string;
  onSlug: (slug: string) => void;
  value: CombatantInput;
  onChange: (v: CombatantInput) => void;
  gen: Generation;
  abilityNames: Record<string, string>;
  items: { name: string; label: string }[];
  children?: React.ReactNode;
}

export function CombatantPanel({ title, accent, entry, slug, onSlug, value, onChange, gen, abilityNames, items, children }: Props) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof CombatantInput>(k: K, v: CombatantInput[K]) => onChange({ ...value, [k]: v });
  const setTuple = (k: "ivs" | "evs" | "boosts", i: number, v: number) => {
    const next = [...value[k]] as StatTuple;
    next[i] = v;
    onChange({ ...value, [k]: next });
  };
  const abilities = entry ? [...entry.abilities, ...(entry.hidden ? [entry.hidden] : [])] : [];
  const evTotal = value.evs.reduce((a, b) => a + b, 0);

  return (
    <section className="space-y-4 rounded-3xl surface p-5" aria-label={title}>
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <span className="size-2.5 rounded-full" style={{ background: accent }} /> {title}
      </h2>
      <PokemonPicker value={slug} onChange={onSlug} label={title} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Nivel">
          <Input type="number" min={1} max={100} value={value.level} onChange={(e) => set("level", Math.min(100, Math.max(1, Number(e.target.value) || 1)))} className="font-mono" />
        </Field>
        <Field label="PS actuales (%)">
          <Input type="number" min={1} max={100} value={value.hpPercent} onChange={(e) => set("hpPercent", Math.min(100, Math.max(1, Number(e.target.value) || 1)))} className="font-mono" />
        </Field>
        {gen >= 3 && (
          <Field label="Naturaleza" className="col-span-2">
            <Select value={value.nature ?? "hardy"} onValueChange={(v) => set("nature", v)}>
              <SelectTrigger className="w-full">
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
          </Field>
        )}
        {gen >= 3 && (
          <Field label="Habilidad">
            <Select value={value.ability ?? abilities[0] ?? "none"} onValueChange={(v) => set("ability", v === "none" ? null : v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {abilities.length === 0 && <SelectItem value="none">—</SelectItem>}
                {abilities.map((a) => (
                  <SelectItem key={a} value={a}>
                    {abilityNames[a] ?? a}
                    {a === entry?.hidden ? " (oculta)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {gen >= 2 && (
          <Field label="Objeto">
            <Select value={value.item ?? "none"} onValueChange={(v) => set("item", v === "none" ? null : v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="none">Sin objeto</SelectItem>
                {items.map((i) => (
                  <SelectItem key={i.name} value={i.name}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {gen >= 9 && (
          <Field label="Teracristal">
            <Select value={value.teraType ?? "none"} onValueChange={(v) => set("teraType", v === "none" ? null : (v as CombatantInput["teraType"]))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="none">Sin Teracristal</SelectItem>
                {TYPE_NAMES.map((ty) => (
                  <SelectItem key={ty} value={ty}>
                    {typeLabel(ty)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label="Estado">
          <Select value={value.status || "none"} onValueChange={(v) => set("status", (v === "none" ? "" : v) as CombatantInput["status"])}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS.map(([k, label]) => (
                <SelectItem key={k || "none"} value={k || "none"}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {children}

      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground" aria-expanded={open}>
        IV, EV y modificadores {evTotal > 0 && <span className="font-mono text-xs">({evTotal} EV)</span>}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="text-left font-medium" />
              <th className="font-medium">IV</th>
              <th className="font-medium">EV</th>
              <th className="font-medium">Mod.</th>
            </tr>
          </thead>
          <tbody>
            {STAT_KEYS.map((k, i) => (
              <tr key={k}>
                <th scope="row" className="py-1 pr-2 text-left font-normal text-muted-foreground">
                  {t.stats[k]}
                </th>
                <td className="px-1 py-1">
                  <Input type="number" min={0} max={31} value={value.ivs[i]} onChange={(e) => setTuple("ivs", i, Math.min(31, Math.max(0, Number(e.target.value) || 0)))} className="h-8 text-center font-mono" aria-label={`IV ${t.stats[k]}`} />
                </td>
                <td className="px-1 py-1">
                  <Input type="number" min={0} max={252} step={4} value={value.evs[i]} onChange={(e) => setTuple("evs", i, Math.min(252, Math.max(0, Number(e.target.value) || 0)))} className="h-8 text-center font-mono" aria-label={`EV ${t.stats[k]}`} />
                </td>
                <td className="px-1 py-1">
                  {i === 0 ? null : (
                    <Select value={String(value.boosts[i])} onValueChange={(v) => setTuple("boosts", i, Number(v))}>
                      <SelectTrigger size="sm" className="w-full font-mono" aria-label={`Modificador ${t.stats[k]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6].map((b) => (
                          <SelectItem key={b} value={String(b)}>
                            {b > 0 ? `+${b}` : b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open && evTotal > 510 && <p className="text-xs text-red-300">Más de 510 EV: no es un reparto legal.</p>}
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-xs text-muted-foreground", className)}>
      {label}
      {children}
    </label>
  );
}
