"use client";

import { ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getDictionary } from "@/i18n";
import { searchPokemon } from "@/lib/engine/search";
import { artworkCandidatesById } from "@/lib/engine/sprites";
import { cn } from "@/lib/utils";
import { SearchResultRow } from "./search-result-row";
import { useSearchIndex } from "./use-search-index";

const t = getDictionary();

interface Props {
  value: string | null;
  onChange: (slug: string) => void;
  label?: string;
  className?: string;
}

/** Selector de Pokémon con búsqueda tolerante a errores. */
export function PokemonPicker({ value, onChange, label, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 100);
  const { data: items } = useSearchIndex();
  const selected = useMemo(() => items?.find((i) => i.slug === value), [items, value]);
  const results = useMemo(() => (items && debounced ? searchPokemon(items, debounced, 10) : []), [items, debounced]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label ?? t.common.search}
          className={cn(
            "flex h-14 w-full items-center gap-3 rounded-xl border border-input bg-input/30 px-3 text-left transition-colors hover:bg-input/50",
            className,
          )}
        >
          {selected ? (
            <>
              <PokemonImage candidates={artworkCandidatesById(selected.id)} alt="" size={44} sizes="44px" className="size-11" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{selected.es}</span>
                <span className="flex gap-1">
                  {selected.types.map((ty) => (
                    <TypeBadge key={ty} type={ty} size="xs" />
                  ))}
                </span>
              </span>
            </>
          ) : (
            <span className="flex-1 text-muted-foreground">{label ?? t.common.searchPlaceholder}</span>
          )}
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,26rem)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder={t.common.searchPlaceholder} autoFocus />
          <CommandList className="max-h-80">
            {debounced && results.length === 0 && <CommandEmpty>{t.common.noResults}</CommandEmpty>}
            {!debounced && <div className="px-3 py-5 text-center text-sm text-muted-foreground">{t.common.searchHint}</div>}
            {results.length > 0 && (
              <CommandGroup>
                {results.map(({ item }) => (
                  <CommandItem
                    key={item.slug}
                    value={item.slug}
                    onSelect={() => {
                      onChange(item.slug);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <SearchResultRow item={item} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
