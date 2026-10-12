import { getDictionary } from "@/i18n";

const t = getDictionary();

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm text-muted-foreground sm:px-6 md:grid-cols-[2fr_1fr]">
        <p className="max-w-2xl leading-relaxed">{t.footer.disclaimer}</p>
        <ul className="space-y-1.5">
          <li>
            {t.footer.data}:{" "}
            <a className="text-foreground/80 underline-offset-4 hover:underline" href="https://pokeapi.co" target="_blank" rel="noreferrer">
              PokéAPI
            </a>
          </li>
          <li>
            {t.footer.images}:{" "}
            <a
              className="text-foreground/80 underline-offset-4 hover:underline"
              href="https://github.com/PokeAPI/sprites"
              target="_blank"
              rel="noreferrer"
            >
              PokeAPI/sprites
            </a>
          </li>
          <li>
            {t.footer.calc}:{" "}
            <a
              className="text-foreground/80 underline-offset-4 hover:underline"
              href="https://github.com/smogon/damage-calc"
              target="_blank"
              rel="noreferrer"
            >
              @smogon/calc
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
