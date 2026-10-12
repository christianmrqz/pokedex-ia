import type { Locale } from "@/lib/domain";
import { en } from "./en";
import { es, type Dictionary } from "./es";

export const DEFAULT_LOCALE: Locale = "es";

const dictionaries: Record<Locale, Dictionary> = { es, en };

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale];
}

/** Sustituye marcadores {clave} en una plantilla. */
export function format(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (params[k] !== undefined ? String(params[k]) : `{${k}}`));
}

export type { Dictionary };
