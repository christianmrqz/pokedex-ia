"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PokemonCard } from "@/components/pokemon/pokemon-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useFavorites } from "@/components/favorites/use-favorites";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getDictionary } from "@/i18n";
import { GENERATIONS, STAT_KEYS, TYPE_NAMES, type TypeName } from "@/lib/domain";
import { POKEMON, totalStats } from "@/lib/data/pokedex";
import { romanGen } from "@/lib/data/games";
import { normalize } from "@/lib/engine/search";
import { typeLabel } from "@/lib/engine/type-chart";
import { TYPE_COLORS, typeTextColor } from "@/lib/ui/type-colors";
import { cn } from "@/lib/utils";

const t = getDictionary();
const PAGE = 60;
type SortKey = "dex" | "name" | "total" | (typeof STAT_KEYS)[number];

export function PokedexExplorer({ abilityNames }: { abilityNames: Record<string, string> }) {
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<TypeName[]>([]);
  const [gens, setGens] = useState<number[]>([]);
  const [ability, setAbility] = useState("");
  const [sort, setSort] = useState<SortKey>("dex");
  const [desc, setDesc] = useState(false);
  const [onlyDefault, setOnlyDefault] = useState(true);
  const [legendary, setLegendary] = useState(true);
  const [megas, setMegas] = useState(false);
  const [minTotal, setMinTotal] = useState(0);
  const [minSpeed, setMinSpeed] = useState(0);
  const [limit, setLimit] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const { favorites } = useFavorites();
  const q = normalize(useDebouncedValue(query, 150));
  const abilityQ = normalize(useDebouncedValue(ability, 150));

  const matchingAbilities = useMemo(() => {
    if (!abilityQ) return null;
    return new Set(Object.entries(abilityNames).filter(([slug, name]) => normalize(name).includes(abilityQ) || slug.includes(abilityQ.replace(/ /g, "-"))).map(([slug]) => slug));
  }, [abilityNames, abilityQ]);

  const results = useMemo(() => {
    const list = POKEMON.filter((p) => {
      if (onlyFavorites) return favorites.includes(p.slug);
      if (onlyDefault && !p.isDefault && !(megas && p.kind === "mega")) return false;
      if (!megas && p.kind === "mega") return false;
      if (p.kind === "gmax" && onlyDefault) return false;
      if (!legendary && (p.legendary || p.mythical)) return false;
      if (types.length && !types.every((ty) => p.types.includes(ty))) return false;
      if (gens.length && !gens.includes(p.gen)) return false;
      if (minTotal && totalStats(p) < minTotal) return false;
      if (minSpeed && p.stats[5] < minSpeed) return false;
      if (matchingAbilities && ![...p.abilities, p.hidden].some((a) => a && matchingAbilities.has(a))) return false;
      if (q && !normalize(p.es).includes(q) && !normalize(p.en).includes(q) && String(p.speciesId) !== q) return false;
      return true;
    });
    const value = (p: (typeof POKEMON)[number]) =>
      sort === "dex" ? p.speciesId * 100000 + p.id : sort === "total" ? totalStats(p) : sort === "name" ? 0 : p.stats[STAT_KEYS.indexOf(sort)];
    list.sort((a, b) => (sort === "name" ? a.es.localeCompare(b.es, "es") : value(a) - value(b)) * (desc ? -1 : 1));
    return list;
  }, [onlyDefault, megas, legendary, types, gens, minTotal, minSpeed, matchingAbilities, q, sort, desc, onlyFavorites, favorites]);

  // Al cambiar los filtros se vuelve a la primera página.
  const filterKey = JSON.stringify([q, types, gens, abilityQ, sort, desc, onlyDefault, legendary, megas, minTotal, minSpeed, onlyFavorites]);
  const [lastKey, setLastKey] = useState(filterKey);
  if (lastKey !== filterKey) {
    setLastKey(filterKey);
    setLimit(PAGE);
  }

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setLimit((l) => l + PAGE), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [results.length]);

  const toggleType = (ty: TypeName) =>
    setTypes((cur) => (cur.includes(ty) ? cur.filter((x) => x !== ty) : cur.length >= 2 ? [cur[1], ty] : [...cur, ty]));
  const toggleGen = (g: number) => setGens((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  const reset = () => {
    setQuery("");
    setTypes([]);
    setGens([]);
    setAbility("");
    setMinTotal(0);
    setMinSpeed(0);
    setSort("dex");
    setDesc(false);
  };
  const activeFilters = types.length + gens.length + (ability ? 1 : 0) + (minTotal ? 1 : 0) + (minSpeed ? 1 : 0);
  const metric =
    sort !== "dex" && sort !== "name"
      ? (p: (typeof POKEMON)[number]) => ({
          label: t.explorer.sortOptions[sort],
          value: sort === "total" ? totalStats(p) : p.stats[STAT_KEYS.indexOf(sort)],
        })
      : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className={cn("space-y-6 lg:sticky lg:top-20 lg:block lg:self-start", !showFilters && "hidden")}>
        <FilterGroup title={t.explorer.type}>
          <div className="grid grid-cols-3 gap-1.5">
            {TYPE_NAMES.map((ty) => {
              const on = types.includes(ty);
              return (
                <button
                  key={ty}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleType(ty)}
                  className={cn("rounded-md px-1.5 py-1 text-[11px] font-semibold uppercase transition-all", !on && "opacity-45 hover:opacity-80")}
                  style={{ background: TYPE_COLORS[ty], color: typeTextColor(ty), boxShadow: on ? `0 0 0 2px var(--background), 0 0 0 3px ${TYPE_COLORS[ty]}` : undefined }}
                >
                  {typeLabel(ty)}
                </button>
              );
            })}
          </div>
        </FilterGroup>
        <FilterGroup title={t.explorer.generation}>
          <div className="grid grid-cols-5 gap-1.5">
            {GENERATIONS.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={gens.includes(g)}
                onClick={() => toggleGen(g)}
                className={cn(
                  "rounded-md border border-border py-1 text-xs font-medium transition-colors",
                  gens.includes(g) ? "border-primary/60 bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {romanGen(g)}
              </button>
            ))}
          </div>
        </FilterGroup>
        <FilterGroup title={t.explorer.ability}>
          <Input value={ability} onChange={(e) => setAbility(e.target.value)} placeholder={t.explorer.abilityPlaceholder} />
        </FilterGroup>
        <FilterGroup title={`Total mínimo: ${minTotal || "—"}`}>
          <Slider value={[minTotal]} onValueChange={([v]) => setMinTotal(v)} min={0} max={700} step={10} aria-label="Total mínimo" />
        </FilterGroup>
        <FilterGroup title={`Velocidad mínima: ${minSpeed || "—"}`}>
          <Slider value={[minSpeed]} onValueChange={([v]) => setMinSpeed(v)} min={0} max={200} step={5} aria-label="Velocidad mínima" />
        </FilterGroup>
        <div className="space-y-3 text-sm">
          <ToggleRow label={t.explorer.onlyDefault} checked={onlyDefault} onChange={setOnlyDefault} />
          <ToggleRow label={t.explorer.legendary} checked={legendary} onChange={setLegendary} />
          <ToggleRow label={t.explorer.megas} checked={megas} onChange={setMegas} />
          <ToggleRow label={`Solo favoritos (${favorites.length})`} checked={onlyFavorites} onChange={setOnlyFavorites} />
        </div>
        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X /> {t.common.clear}
          </Button>
        )}
      </aside>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.common.searchPlaceholder} className="h-10 pl-9" />
          </div>
          <Button variant="outline" className="h-10 lg:hidden" onClick={() => setShowFilters((s) => !s)}>
            <SlidersHorizontal /> {t.explorer.filters}
            {activeFilters > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{activeFilters}</span>}
          </Button>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-10! w-40" aria-label={t.explorer.sort}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(t.explorer.sortOptions).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="size-10" onClick={() => setDesc((d) => !d)} aria-label={desc ? "Orden descendente" : "Orden ascendente"}>
            {desc ? <ArrowDownWideNarrow /> : <ArrowUpNarrowWide />}
          </Button>
        </div>
        <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
          {t.explorer.results(results.length)}
        </p>
        {results.length === 0 ? (
          <div className="rounded-2xl surface p-10 text-center text-muted-foreground">{t.explorer.empty}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {results.slice(0, limit).map((p) => (
              <PokemonCard key={p.slug} entry={p} metric={metric?.(p)} />
            ))}
          </div>
        )}
        {limit < results.length && (
          <div ref={sentinel} className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
              {t.explorer.loadMore}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
