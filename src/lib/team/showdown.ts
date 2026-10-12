/** Exportación de equipos al formato de texto de Pokémon Showdown. */
import type { Generation, PokemonIndexEntry } from "@/lib/domain";
import { smogonAbilityName, smogonMoveName } from "@/lib/engine/damage";
import type { TeamMember } from "./model";

const STAT_SHOWDOWN = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function memberToShowdown(member: TeamMember, entry: PokemonIndexEntry, gen: Generation): string {
  const lines: string[] = [];
  const species = entry.smogon ?? entry.en;
  lines.push(member.item ? `${species} @ ${member.item}` : species);
  if (member.ability) lines.push(`Ability: ${smogonAbilityName(member.ability, gen) ?? member.ability}`);
  if (member.level !== 100) lines.push(`Level: ${member.level}`);
  if (gen >= 9 && member.teraType) lines.push(`Tera Type: ${cap(member.teraType)}`);
  const evs = member.evs.map((v, i) => (v > 0 ? `${v} ${STAT_SHOWDOWN[i]}` : null)).filter(Boolean);
  if (evs.length) lines.push(`EVs: ${evs.join(" / ")}`);
  if (gen >= 3) lines.push(`${cap(member.nature)} Nature`);
  const ivs = member.ivs.map((v, i) => (v !== 31 ? `${v} ${STAT_SHOWDOWN[i]}` : null)).filter(Boolean);
  if (ivs.length) lines.push(`IVs: ${ivs.join(" / ")}`);
  for (const m of member.moves) lines.push(`- ${smogonMoveName(m, gen) ?? m}`);
  return lines.join("\n");
}

export function teamToShowdown(members: TeamMember[], resolve: (slug: string) => PokemonIndexEntry | undefined, gen: Generation): string {
  return members
    .map((m) => {
      const e = resolve(m.slug);
      return e ? memberToShowdown(m, e, gen) : null;
    })
    .filter(Boolean)
    .join("\n\n");
}
