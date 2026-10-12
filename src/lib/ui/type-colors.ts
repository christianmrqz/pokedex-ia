import type { TypeName } from "@/lib/domain";

/** Colores de tipo (mismos valores que --color-type-* en globals.css). */
export const TYPE_COLORS: Record<TypeName, string> = {
  normal: "#a0a29f",
  fire: "#ff8f45",
  water: "#4d90d5",
  electric: "#f3d23b",
  grass: "#63bb5b",
  ice: "#74cec0",
  fighting: "#ce4069",
  poison: "#ab6ac8",
  ground: "#d97746",
  flying: "#8fa8dd",
  psychic: "#f97176",
  bug: "#90c12c",
  rock: "#c7b78b",
  ghost: "#5f75bd",
  dragon: "#2a7fd0",
  dark: "#6e6680",
  steel: "#5a8ea1",
  fairy: "#ec8fe6",
};

/** Tipos claros que necesitan texto oscuro para mantener el contraste. */
const LIGHT_TYPES = new Set<TypeName>(["electric", "ice", "rock", "normal", "bug", "fairy", "flying", "grass"]);

export function typeTextColor(type: TypeName): string {
  return LIGHT_TYPES.has(type) ? "#16181d" : "#ffffff";
}

/** Fondo atmosférico basado en los tipos de un Pokémon. */
export function typeGradient(types: TypeName[], alpha = 0.35): string {
  const [a, b = a] = types.map((t) => TYPE_COLORS[t]);
  const hex = (c: string, al: number) =>
    `${c}${Math.round(al * 255)
      .toString(16)
      .padStart(2, "0")}`;
  return `radial-gradient(120% 90% at 20% 10%, ${hex(a, alpha)}, transparent 60%), radial-gradient(100% 80% at 90% 90%, ${hex(b, alpha * 0.9)}, transparent 60%)`;
}
