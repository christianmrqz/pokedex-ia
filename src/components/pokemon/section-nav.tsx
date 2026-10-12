"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface SectionLink {
  id: string;
  label: string;
}

/** Navegación fija entre secciones de la ficha, con la sección visible resaltada. */
export function SectionNav({ links }: { links: SectionLink[] }) {
  const [active, setActive] = useState(links[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    for (const l of links) {
      const el = document.getElementById(l.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [links]);

  return (
    <nav
      aria-label="Secciones"
      className="sticky top-14 z-30 -mx-4 border-b border-border/60 bg-background/75 px-4 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-2"
    >
      <ul className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
        {links.map((l) => (
          <li key={l.id}>
            <a
              href={`#${l.id}`}
              className={cn(
                "block rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                active === l.id && "bg-white/10 text-foreground",
              )}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
