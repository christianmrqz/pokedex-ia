/** Texto legible de una condición de evolución (server-side: usa el catálogo de movimientos). */
import { format, getDictionary } from "@/i18n";
import { moveName } from "@/lib/data/catalog";
import { getPokemonBySlug } from "@/lib/data/pokedex";
import { isTypeName } from "@/lib/domain";
import { prettifySlug } from "@/lib/data/games";
import { typeLabel } from "@/lib/engine/type-chart";
import type { EvolutionCondition } from "@/lib/pokeapi/transform";

const t = getDictionary().evolution;

export function describeEvolution(c: EvolutionCondition, names: Record<string, string>): string {
  const name = (slug: string) => names[slug] ?? prettifySlug(slug);
  const species = (slug: string) => getPokemonBySlug(slug)?.es ?? prettifySlug(slug);
  const type = (slug: string) => (isTypeName(slug) ? typeLabel(slug) : slug);
  const parts: string[] = [];

  switch (c.trigger) {
    case "level-up":
      parts.push(c.minLevel ? format(t.level, { n: c.minLevel }) : t.levelUp);
      break;
    case "trade":
      parts.push(t.trade);
      break;
    case "use-item":
      if (c.item) parts.push(format(t.useItem, { item: name(c.item) }));
      break;
    case "shed":
      parts.push(t.shed);
      break;
    case "spin":
      parts.push(t.spin);
      break;
    case "use-move":
    case "agile-style-move":
    case "strong-style-move": {
      const move = c.usedMove ?? c.knownMove;
      if (move) {
        const template = c.trigger === "agile-style-move" ? t.agileStyle : c.trigger === "strong-style-move" ? t.strongStyle : c.minMoveCount ? t.usedMoveTimes : t.usedMoveOnce;
        parts.push(format(template, { move: moveName(move), n: c.minMoveCount ?? "" }));
      } else parts.push(t.other);
      break;
    }
    case "three-critical-hits":
      parts.push(t.criticalHits);
      break;
    case "take-damage":
    case "recoil-damage":
      parts.push(c.minDamageTaken ? format(t.damage, { n: c.minDamageTaken }) : t.other);
      break;
    case "tower-of-darkness":
      parts.push(t.towerDarkness);
      break;
    case "tower-of-waters":
      parts.push(t.towerWaters);
      break;
    case "three-defeated-bisharp":
      parts.push(t.bisharp);
      break;
    case "gimmighoul-coins":
      parts.push(t.coins);
      break;
    case "meltan-candies":
      parts.push(t.meltan);
      break;
    case "in-battle-level-up":
      parts.push(c.minLevel ? format(t.level, { n: c.minLevel }) : t.inBattle);
      break;
    default:
      parts.push(t.other);
  }

  if (c.trigger !== "use-item" && c.item) parts.push(format(t.useItem, { item: name(c.item) }));
  if (c.heldItem) parts.push(format(t.holding, { item: name(c.heldItem) }));
  if (c.knownMove && !c.trigger.endsWith("style-move")) parts.push(format(t.knowsMove, { move: moveName(c.knownMove) }));
  if (c.knownMoveType) parts.push(format(t.knowsMoveType, { type: type(c.knownMoveType) }));
  if (c.minHappiness) parts.push(t.happiness);
  if (c.minAffection) parts.push(t.affection);
  if (c.minBeauty) parts.push(format(t.beauty, { n: c.minBeauty }));
  if (c.timeOfDay === "day") parts.push(t.day);
  if (c.timeOfDay === "night") parts.push(t.night);
  if (c.timeOfDay === "dusk") parts.push(t.dusk);
  if (c.gender === "female") parts.push(t.female);
  if (c.gender === "male") parts.push(t.male);
  if (c.needsRain) parts.push(t.rain);
  if (c.partySpecies) parts.push(format(t.party, { pokemon: species(c.partySpecies) }));
  if (c.partyType) parts.push(format(t.partyType, { type: type(c.partyType) }));
  if (c.relativeStats === 1) parts.push(t.atkGtDef);
  if (c.relativeStats === 0) parts.push(t.atkEqDef);
  if (c.relativeStats === -1) parts.push(t.atkLtDef);
  if (c.tradeSpecies) parts.push(format(t.tradeFor, { pokemon: species(c.tradeSpecies) }));
  if (c.upsideDown) parts.push(t.upsideDown);
  if (c.minSteps) parts.push(format(t.steps, { n: c.minSteps }));
  if (c.locations?.length) parts.push(format(t.location, { place: c.locations.map(name).join(", ") }));

  return parts.length ? parts.join(" · ") : t.other;
}
