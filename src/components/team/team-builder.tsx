"use client";

import { Check, ClipboardCopy, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useGame } from "@/components/game/game-context";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { PokemonPicker } from "@/components/search/pokemon-picker";
import { usePokedexIndex } from "@/components/search/use-pokedex-index";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import itemNames from "@/data/generated/items.json";
import type { Generation } from "@/lib/domain";
import { generationLabel } from "@/lib/data/games";
import { smogonItems } from "@/lib/engine/damage";
import { artworkCandidatesById } from "@/lib/engine/sprites";
import { typesForGen } from "@/lib/engine/type-chart";
import { MAX_TEAM_SIZE, newMember, type Team, type TeamMember } from "@/lib/team/model";
import { teamToShowdown } from "@/lib/team/showdown";
import { cn } from "@/lib/utils";
import { MemberEditor } from "./member-editor";
import { TeamAnalysis } from "./team-analysis";
import { useTeams } from "./use-teams";

const ITEM_ES = itemNames as Record<string, string | null>;

export function TeamBuilder({ abilityNames }: { abilityNames: Record<string, string> }) {
  const { data } = usePokedexIndex();
  const { gen: selectedGen, versionGroup } = useGame();
  const gen = selectedGen as Generation;
  const { teams, loaded, save, remove } = useTeams();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const active = teams.find((t) => t.id === activeId) ?? teams[0] ?? null;
  const items = useMemo(() => smogonItems(gen).map((name) => ({ name, label: ITEM_ES[name] ?? name })).sort((a, b) => a.label.localeCompare(b.label, "es")), [gen]);

  if (!data || !loaded) return <Skeleton className="h-[30rem] rounded-3xl" />;
  const resolve = (slug: string) => data.bySlug.get(slug);

  const createTeam = () => {
    const team: Team = { id: crypto.randomUUID(), name: `Equipo ${teams.length + 1}`, members: [], updatedAt: Date.now() };
    save(team);
    setActiveId(team.id);
  };
  const update = (fn: (t: Team) => Team) => active && save(fn(active));
  const addMember = (slug: string) => {
    const entry = resolve(slug);
    if (!entry || !active || active.members.length >= MAX_TEAM_SIZE) return;
    update((t) => ({ ...t, members: [...t.members, newMember(slug, entry.abilities[0] ?? entry.hidden ?? null)] }));
  };
  const setMember = (i: number, m: TeamMember) => update((t) => ({ ...t, members: t.members.map((x, j) => (j === i ? m : x)) }));
  const removeMember = (i: number) => update((t) => ({ ...t, members: t.members.filter((_, j) => j !== i) }));

  const exportText = active ? teamToShowdown(active.members, resolve, gen) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const editingMember = active && editing !== null ? active.members[editing] : null;
  const editingEntry = editingMember ? resolve(editingMember.slug) : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-2">
        <Button onClick={createTeam} className="w-full">
          <Plus /> Nuevo equipo
        </Button>
        {teams.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveId(t.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-white/5",
              active?.id === t.id && "border-primary/50 bg-primary/[0.06]",
            )}
          >
            <span className="truncate">{t.name}</span>
            <span className="font-mono text-xs text-muted-foreground">{t.members.length}/6</span>
          </button>
        ))}
        <p className="pt-2 text-xs text-muted-foreground">Los equipos se guardan solo en este navegador.</p>
      </aside>

      {!active ? (
        <div className="rounded-3xl surface p-10 text-center text-muted-foreground">Crea tu primer equipo para empezar.</div>
      ) : (
        <div className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={active.name}
              onChange={(e) => update((t) => ({ ...t, name: e.target.value.slice(0, 40) }))}
              className="h-10 max-w-xs text-lg font-semibold"
              aria-label="Nombre del equipo"
            />
            <span className="text-sm text-muted-foreground">{generationLabel(gen)}</span>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={copy} disabled={!active.members.length}>
                {copied ? <Check /> : <ClipboardCopy />} {copied ? "Copiado" : "Exportar (Showdown)"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (window.confirm(`¿Eliminar «${active.name}»?`)) remove(active.id);
                }}
                aria-label="Eliminar equipo"
              >
                <Trash2 />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {active.members.map((m, i) => {
              const entry = resolve(m.slug);
              if (!entry) return null;
              const exists = entry.gen <= gen;
              return (
                <div key={`${m.slug}-${i}`} className="relative rounded-2xl surface p-4">
                  <div className="flex items-center gap-3">
                    <PokemonImage candidates={artworkCandidatesById(entry.id)} alt={entry.es} size={72} sizes="72px" className="size-16" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{entry.es}</p>
                      <div className="mt-1 flex gap-1">
                        {typesForGen(entry, exists ? gen : 9).map((ty) => (
                          <TypeBadge key={ty} type={ty} size="xs" />
                        ))}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        Nv {m.level}
                        {m.ability && ` · ${abilityNames[m.ability] ?? m.ability}`}
                        {m.item && ` · ${ITEM_ES[m.item] ?? m.item}`}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{m.moves.length ? `${m.moves.length} movimiento(s)` : "Sin movimientos"}</p>
                  {!exists && <p className="mt-1 text-xs text-amber-200">No existe en la {generationLabel(gen)}.</p>}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button size="icon-xs" variant="ghost" onClick={() => setEditing(i)} aria-label={`Editar ${entry.es}`}>
                      <Pencil />
                    </Button>
                    <Button size="icon-xs" variant="ghost" onClick={() => removeMember(i)} aria-label={`Quitar ${entry.es}`}>
                      <X />
                    </Button>
                  </div>
                </div>
              );
            })}
            {active.members.length < MAX_TEAM_SIZE && (
              <div className="flex flex-col justify-center gap-2 rounded-2xl border border-dashed border-border p-4">
                <p className="text-xs text-muted-foreground">Añadir Pokémon ({active.members.length}/6)</p>
                <PokemonPicker value={null} onChange={addMember} label="Añadir Pokémon" />
              </div>
            )}
          </div>

          <TeamAnalysis
            members={active.members}
            resolve={resolve}
            pool={data.entries}
            gen={gen}
            versionGroup={versionGroup}
            onAdd={addMember}
            canAdd={active.members.length < MAX_TEAM_SIZE}
          />

          {exportText && (
            <details className="rounded-2xl surface p-4 text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver texto exportado</summary>
              <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre">{exportText}</pre>
            </details>
          )}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingEntry?.es}</DialogTitle>
            <DialogDescription>Naturaleza, habilidad, objeto, movimientos, IV y EV.</DialogDescription>
          </DialogHeader>
          {editingMember && editingEntry && editing !== null && (
            <MemberEditor
              member={editingMember}
              entry={editingEntry}
              onChange={(m) => setMember(editing, m)}
              gen={gen}
              versionGroup={versionGroup}
              abilityNames={abilityNames}
              items={items}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
