"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getDictionary } from "@/i18n";
import { searchPokemon } from "@/lib/engine/search";
import { cn } from "@/lib/utils";
import { SearchResultRow } from "./search-result-row";
import { useSearchIndex } from "./use-search-index";

const t = getDictionary();

/** Buscador principal de la portada: escribe "Drapion" y pulsa Enter. */
export function HeroSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const debounced = useDebouncedValue(query, 80);
  // El índice se descarga al primer foco, no en la carga de la página.
  const { data: items, isLoading } = useSearchIndex(focused || query.length > 0);
  const results = useMemo(() => (items ? searchPokemon(items, debounced, 8) : []), [items, debounced]);
  const open = focused && query.trim().length > 0;

  const go = (slug: string) => {
    setFocused(false);
    router.push(`/pokemon/${slug}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active].item.slug);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  };

  return (
    <div className="relative w-full">
      <div
        className={cn(
          "flex h-16 items-center gap-3 rounded-2xl border border-white/10 bg-background/70 px-5 shadow-2xl shadow-black/40 backdrop-blur-xl transition-[border-color,box-shadow] sm:h-[4.5rem]",
          focused && "border-primary/50 shadow-primary/10",
        )}
      >
        <Search className="size-6 shrink-0 text-muted-foreground" />
        <input
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
          aria-label={t.common.searchPlaceholder}
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={t.common.searchPlaceholder}
          className="h-full min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground/70 sm:text-xl"
        />
        <kbd className="hidden items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground sm:flex">
          <CornerDownLeft className="size-3" /> Enter
        </kbd>
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-border bg-popover/95 p-1.5 shadow-2xl backdrop-blur-xl"
        >
          {isLoading && <li className="px-3 py-4 text-sm text-muted-foreground">{t.common.loading}</li>}
          {!isLoading && results.length === 0 && <li className="px-3 py-4 text-sm text-muted-foreground">{t.common.noResults}</li>}
          {results.map(({ item }, i) => (
            <li
              key={item.slug}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                go(item.slug);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("cursor-pointer rounded-xl px-3 py-2", i === active && "bg-white/[0.07]")}
            >
              <SearchResultRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
