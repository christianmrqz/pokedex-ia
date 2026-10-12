import { BookOpen, Calculator, Shield, Swords, Users, Sparkles, Scale } from "lucide-react";
import { getDictionary } from "@/i18n";

const t = getDictionary();

export interface NavItem {
  href: string;
  label: string;
  icon: typeof BookOpen;
  /** Funcionalidad aún no implementada (se muestra como próximamente). */
  soon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/pokedex", label: t.nav.pokedex, icon: BookOpen },
  { href: "/tipos", label: t.nav.types, icon: Shield },
  { href: "/calculadora/estadisticas", label: t.nav.stats, icon: Calculator },
  { href: "/calculadora/dano", label: t.nav.damage, icon: Swords },
  { href: "/comparador", label: t.nav.compare, icon: Scale },
  { href: "/asistente", label: t.nav.assistant, icon: Sparkles },
  { href: "/equipos", label: t.nav.teams, icon: Users },
];
