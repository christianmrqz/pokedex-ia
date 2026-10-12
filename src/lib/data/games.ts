/**
 * Catálogos ligeros (aptos para el navegador): grupos de versiones, generaciones,
 * métodos de aprendizaje y naturalezas.
 */
import generationsData from "@/data/generated/generations.json";
import learnMethodsData from "@/data/generated/learn-methods.json";
import naturesData from "@/data/generated/natures.json";
import versionGroupsData from "@/data/generated/version-groups.json";
import type { Generation, NatureEntry, VersionGroupEntry } from "@/lib/domain";

export const NATURES = naturesData as NatureEntry[];
export const VERSION_GROUPS = versionGroupsData as VersionGroupEntry[];
export const LEARN_METHODS = learnMethodsData as Record<string, { es: string | null; en: string }>;
export const GENERATION_NAMES = generationsData as { id: number; slug: string; es: string; en: string }[];

const vgBySlug = new Map(VERSION_GROUPS.map((v) => [v.slug, v]));

export function getVersionGroup(slug: string): VersionGroupEntry | undefined {
  return vgBySlug.get(slug);
}

const LEARN_METHOD_ES_FALLBACK: Record<string, string> = {
  "level-up": "Nivel",
  machine: "MT/DT",
  egg: "Huevo",
  tutor: "Tutor",
  "stadium-surfing-pikachu": "Pikachu surfista",
  "light-ball-egg": "Huevo (Bola Luminosa)",
  "colosseum-purification": "Purificación",
  "xd-shadow": "Movimiento oscuro",
  "xd-purification": "Purificación",
  "form-change": "Cambio de forma",
  "zygarde-cube": "Cubo de Zygarde",
};

export function learnMethodName(slug: string, locale: "es" | "en" = "es"): string {
  if (locale === "en") return LEARN_METHODS[slug]?.en ?? prettifySlug(slug);
  return LEARN_METHOD_ES_FALLBACK[slug] ?? LEARN_METHODS[slug]?.es ?? prettifySlug(slug);
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

export function romanGen(gen: number): string {
  return ROMAN[gen] ?? String(gen);
}

export function generationLabel(gen: number, locale: "es" | "en" = "es"): string {
  return locale === "es" ? `Generación ${romanGen(gen)}` : `Generation ${romanGen(gen)}`;
}

export function versionGroupsForGen(gen: Generation): VersionGroupEntry[] {
  return VERSION_GROUPS.filter((v) => v.gen === gen);
}

export function prettifySlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
