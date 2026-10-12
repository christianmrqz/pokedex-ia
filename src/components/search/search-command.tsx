"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getDictionary } from "@/i18n";
import { searchPokemon } from "@/lib/engine/search";
import { cn } from "@/lib/utils";
import { SearchResultRow } from "./search-result-row";
import { useSearchIndex } from "./use-search-index";

const t = getDictionary();

/** Buscador global (Ctrl/⌘ + K o "/"). */
export function SearchCommand({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 100);
  const { data: items, isLoading } = useSearchIndex(open);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName));
      if ((e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => (items ? searchPokemon(items, debounced, 12) : []), [items, debounced]);

  const go = (slug: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/pokemon/${slug}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg border border-input bg-input/30 px-3 text-sm text-muted-foreground transition-colors hover:bg-input/50 hover:text-foreground",
          className,
        )}
      >
        <Search className="size-4" />
        <span className="hidden flex-1 text-left xl:inline">{t.common.search} Pokémon…</span>
        <kbd className="hidden rounded border border-border bg-background/60 px-1.5 font-mono text-[10px] xl:inline">Ctrl K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title={t.common.search} description={t.common.searchHint} className="sm:max-w-xl">
        <Command shouldFilter={false} className="bg-popover">
          <CommandInput value={query} onValueChange={setQuery} placeholder={t.common.searchPlaceholder} autoFocus />
          <CommandList className="max-h-[60vh]">
            {isLoading && <div className="py-6 text-center text-sm text-muted-foreground">{t.common.loading}</div>}
            {!isLoading && debounced && results.length === 0 && <CommandEmpty>{t.common.noResults}</CommandEmpty>}
            {!debounced && !isLoading && <div className="px-3 py-6 text-center text-sm text-muted-foreground">{t.common.searchHint}</div>}
            {results.length > 0 && (
              <CommandGroup>
                {results.map(({ item }) => (
                  <CommandItem key={item.slug} value={item.slug} onSelect={() => go(item.slug)} className="py-2">
                    <SearchResultRow item={item} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
