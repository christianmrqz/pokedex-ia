"use client";

import { natureLabel } from "@/components/calc/stat-calculator";
import { usePokemonMoves } from "@/components/search/use-pokemon-moves";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getDictionary } from "@/i18n";
import { STAT_KEYS, TYPE_NAMES, type Generation, type PokemonIndexEntry, type StatTuple } from "@/lib/domain";
import { NATURES, getVersionGroup } from "@/lib/data/games";
import { movesForVersionGroup } from "@/lib/engine/learnset";
import { evRules, validateEvs } from "@/lib/engine/stats";
import { typeLabel } from "@/lib/engine/type-chart";
import type { TeamMember } from "@/lib/team/model";
import { cn } from "@/lib/utils";

const t = getDictionary();

interface Props {
  member: TeamMember;
  entry: PokemonIndexEntry;
  onChange: (m: TeamMember) => void;
  gen: Generation;
  versionGroup: string;
  abilityNames: Record<string, string>;
  items: { name: string; label: string }[];
}

export function MemberEditor({ member, entry, onChange, gen, versionGroup, abilityNames, items }: Props) {
  const { data, isLoading } = usePokemonMoves(entry.slug);
  const vgSlug = data ? (versionGroup !== "auto" && data.versionGroups.includes(versionGroup) ? versionGroup : data.versionGroups.at(-1)) : undefined;
  const vg = vgSlug ? getVersionGroup(vgSlug) : undefined;
  const learnable = data && vg ? [...new Set(movesForVersionGroup(data.learnset, vg.slug).map((r) => r.move))].sort((a, b) => (data.moves[a]?.es ?? a).localeCompare(data.moves[b]?.es ?? b, "es")) : [];
  const rules = evRules(gen);
  const problems = gen >= 3 ? validateEvs(member.evs, gen) : [];
  const abilities = [...entry.abilities, ...(entry.hidden ? [entry.hidden] : [])];
  const set = <K extends keyof TeamMember>(k: K, v: TeamMember[K]) => onChange({ ...member, [k]: v });
  const setTuple = (k: "evs" | "ivs", i: number, v: number) => {
    const next = [...member[k]] as StatTuple;
    next[i] = v;
    onChange({ ...member, [k]: next });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nivel">
          <Input type="number" min={1} max={100} value={member.level} onChange={(e) => set("level", Math.min(100, Math.max(1, Number(e.target.value) || 1)))} />
        </Field>
        {gen >= 3 && (
          <Field label="Naturaleza">
            <Select value={member.nature} onValueChange={(v) => set("nature", v)}>
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
            <Select value={member.ability ?? abilities[0]} onValueChange={(v) => set("ability", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {abilities.map((a) => (
                  <SelectItem key={a} value={a}>
                    {abilityNames[a] ?? a}
                    {a === entry.hidden ? " (oculta)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {gen >= 2 && (
          <Field label="Objeto">
            <Select value={member.item ?? "none"} onValueChange={(v) => set("item", v === "none" ? null : v)}>
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
            <Select value={member.teraType ?? "none"} onValueChange={(v) => set("teraType", v === "none" ? null : (v as TeamMember["teraType"]))}>
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
      </div>

      <div>
        <p className="mb-2 text-xs text-muted-foreground">Movimientos {vg ? `(${vg.es})` : ""}</p>
        {isLoading ? (
          <Skeleton className="h-20" />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Select
                key={i}
                value={member.moves[i] ?? "none"}
                onValueChange={(v) => {
                  const next = [...member.moves];
                  if (v === "none") next.splice(i, 1);
                  else next[i] = v;
                  set("moves", next.filter(Boolean).slice(0, 4));
                }}
              >
                <SelectTrigger className="w-full" aria-label={`Movimiento ${i + 1}`}>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="none">—</SelectItem>
                  {learnable
                    .filter((m) => m === member.moves[i] || !member.moves.includes(m))
                    .map((m) => (
                      <SelectItem key={m} value={m}>
                        <span className="size-2 rounded-full" style={{ background: `var(--color-type-${data?.moves[m]?.type ?? "normal"})` }} />
                        {data?.moves[m]?.es ?? m}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        )}
        {!isLoading && learnable.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Sin datos de movimientos para este Pokémon.</p>}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="text-left font-medium" />
            <th className="font-medium">{gen <= 2 ? "DV" : "IV"}</th>
            <th className="font-medium">{gen <= 2 ? "Experiencia" : "EV"}</th>
          </tr>
        </thead>
        <tbody>
          {STAT_KEYS.map((k, i) => (
            <tr key={k}>
              <th scope="row" className="py-1 pr-2 text-left font-normal text-muted-foreground">
                {t.stats[k]}
              </th>
              <td className="px-1 py-1">
                <Input type="number" min={0} max={rules.maxIv} value={member.ivs[i]} onChange={(e) => setTuple("ivs", i, Math.min(rules.maxIv, Math.max(0, Number(e.target.value) || 0)))} className="h-8 text-center font-mono" aria-label={`IV ${t.stats[k]}`} />
              </td>
              <td className="px-1 py-1">
                <Input type="number" min={0} max={rules.perStat} step={4} value={member.evs[i]} onChange={(e) => setTuple("evs", i, Math.min(rules.perStat, Math.max(0, Number(e.target.value) || 0)))} className="h-8 text-center font-mono" aria-label={`EV ${t.stats[k]}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rules.total !== null && (
        <p className={cn("text-xs text-muted-foreground", problems.length && "text-red-300")}>
          EV: {member.evs.reduce((a, b) => a + b, 0)} / {rules.total}
          {problems.length > 0 && ` · ${problems.join(" · ")}`}
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  );
}
