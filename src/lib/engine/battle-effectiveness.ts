/**
 * Efectividad real de un tipo de ataque considerando las circunstancias del combate.
 *
 * Separa siempre dos valores:
 *  - typeMultiplier: lo que dice la tabla de tipos (tras Teracristalización o Respiro,
 *    que cambian los tipos del defensor).
 *  - finalMultiplier: el factor de daño final por tipo una vez aplicadas habilidades,
 *    objetos y efectos de campo.
 *
 * Cada modificación se documenta con una nota que indica su origen, para no confundir
 * una inmunidad de tipo con una inmunidad por habilidad u objeto.
 */
import { TYPE_NAMES, type Generation, type TypeName } from "@/lib/domain";
import { getTypeChart, typeExistsInGen, typesInGen } from "./type-chart";

export type NoteKind = "type" | "tera" | "ability-immunity" | "ability" | "item" | "field" | "attacker";

export interface EffectNote {
  kind: NoteKind;
  /** Clave de texto (i18n) y parámetros, para que la interfaz lo traduzca. */
  key: string;
  params?: Record<string, string | number>;
}

export interface BattleConditions {
  gen: Generation;
  /** Tipos del defensor en esa generación. */
  defenderTypes: TypeName[];
  defenderAbility?: string | null;
  /** Tipo Teracristal (solo Gen 9). "stellar" mantiene los tipos originales al defender. */
  teraType?: TypeName | "stellar" | null;
  defenderItem?: "air-balloon" | "iron-ball" | "ring-target" | null;
  /** Respiro: el defensor pierde el tipo Volador durante el turno. */
  roost?: boolean;
  gravity?: boolean;
  /** Turbulencia (Ráfaga Delta): el tipo Volador pierde sus debilidades. */
  strongWinds?: boolean;
  attackerAbility?: "scrappy" | "minds-eye" | "tinted-lens" | "mold-breaker" | "teravolt" | "turboblaze" | null;
}

export interface AdvancedEntry {
  type: TypeName;
  typeMultiplier: number;
  finalMultiplier: number;
  notes: EffectNote[];
}

/** Habilidades defensivas que esta calculadora sabe aplicar, con la generación desde la que actúan así. */
export const SUPPORTED_DEFENSIVE_ABILITIES: Record<string, { since: number }> = {
  levitate: { since: 3 },
  "flash-fire": { since: 3 },
  "well-baked-body": { since: 9 },
  "water-absorb": { since: 3 },
  "storm-drain": { since: 5 },
  "dry-skin": { since: 4 },
  "volt-absorb": { since: 3 },
  "motor-drive": { since: 4 },
  "lightning-rod": { since: 5 },
  "sap-sipper": { since: 5 },
  "earth-eater": { since: 9 },
  "wonder-guard": { since: 3 },
  "thick-fat": { since: 3 },
  heatproof: { since: 4 },
  "water-bubble": { since: 7 },
  fluffy: { since: 7 },
  "purifying-salt": { since: 9 },
  filter: { since: 4 },
  "solid-rock": { since: 4 },
  "prism-armor": { since: 7 },
  "tera-shell": { since: 9 },
  "delta-stream": { since: 6 },
};

const MOLD_BREAKERS = new Set(["mold-breaker", "teravolt", "turboblaze"]);
/** Habilidades que un Rompemoldes no puede ignorar. */
const UNBREAKABLE = new Set(["delta-stream", "prism-armor"]);

function effectiveDefenderTypes(c: BattleConditions, notesFor: EffectNote[]): TypeName[] {
  let types = c.defenderTypes.filter((t) => typeExistsInGen(t, c.gen));
  if (c.gen >= 9 && c.teraType && c.teraType !== "stellar") {
    types = [c.teraType];
    notesFor.push({ kind: "tera", key: "note.tera", params: { type: c.teraType } });
  }
  if (c.roost && types.includes("flying")) {
    const rest = types.filter((t) => t !== "flying");
    // Un Volador puro pasa a ser Normal desde Gen 5; en Gen 4 queda sin tipo.
    types = rest.length ? rest : c.gen >= 5 ? ["normal"] : [];
    notesFor.push({ kind: "field", key: "note.roost" });
  }
  return types;
}

export function advancedProfile(c: BattleConditions): AdvancedEntry[] {
  const chart = getTypeChart(c.gen);
  const baseNotes: EffectNote[] = [];
  const types = effectiveDefenderTypes(c, baseNotes);

  const ignoresAbility =
    !!c.attackerAbility && MOLD_BREAKERS.has(c.attackerAbility) && !UNBREAKABLE.has(c.defenderAbility ?? "");
  const abilityInfo = c.defenderAbility ? SUPPORTED_DEFENSIVE_ABILITIES[c.defenderAbility] : undefined;
  const ability = abilityInfo && c.gen >= abilityInfo.since && !ignoresAbility ? c.defenderAbility! : null;
  const grounded = !!c.gravity || c.defenderItem === "iron-ball";

  return typesInGen(c.gen).map((attack) => {
    const notes: EffectNote[] = [...baseNotes];

    // 1) Efectividad de tipos pura, con las excepciones que anulan inmunidades de tipo concretas.
    let typeMultiplier = 1;
    let rawTypeMultiplier = 1;
    for (const def of types) {
      let f = chart[attack][def];
      rawTypeMultiplier *= f;
      if (f === 0) {
        if (def === "ghost" && (attack === "normal" || attack === "fighting") && (c.attackerAbility === "scrappy" || c.attackerAbility === "minds-eye")) {
          f = 1;
          notes.push({ kind: "attacker", key: "note.scrappy" });
        } else if (def === "flying" && attack === "ground" && grounded) {
          f = 1;
          notes.push({ kind: c.gravity ? "field" : "item", key: c.gravity ? "note.gravityGround" : "note.ironBallGround" });
        } else if (c.defenderItem === "ring-target") {
          f = 1;
          notes.push({ kind: "item", key: "note.ringTarget", params: { type: def } });
        }
      }
      if (c.strongWinds && def === "flying" && f > 1 && c.gen >= 6) {
        f = 1;
        notes.push({ kind: "field", key: "note.strongWinds" });
      }
      typeMultiplier *= f;
    }
    if (rawTypeMultiplier === 0 && typeMultiplier === 0) notes.push({ kind: "type", key: "note.typeImmunity" });

    // 2) Modificadores de habilidad, objeto y campo sobre el daño final.
    let finalMultiplier = typeMultiplier;
    const immune = (key: string) => {
      if (finalMultiplier !== 0) {
        finalMultiplier = 0;
        notes.push({ kind: "ability-immunity", key, params: { ability: ability ?? "" } });
      }
    };

    if (ability) {
      if (attack === "ground" && ability === "levitate" && !grounded) immune("note.abilityImmunity");
      if (attack === "ground" && ability === "earth-eater") immune("note.abilityImmunity");
      if (attack === "fire" && (ability === "flash-fire" || ability === "well-baked-body")) immune("note.abilityImmunity");
      if (attack === "water" && (ability === "water-absorb" || ability === "storm-drain" || ability === "dry-skin")) immune("note.abilityImmunity");
      if (attack === "electric" && (ability === "volt-absorb" || ability === "motor-drive" || ability === "lightning-rod")) immune("note.abilityImmunity");
      if (attack === "grass" && ability === "sap-sipper") immune("note.abilityImmunity");
      if (ability === "wonder-guard" && typeMultiplier <= 1) immune("note.wonderGuard");

      if (finalMultiplier > 0) {
        const factor = (f: number, key: string) => {
          finalMultiplier *= f;
          notes.push({ kind: "ability", key, params: { ability, factor: f } });
        };
        if (ability === "tera-shell" && typeMultiplier > 0) {
          // Caparazón Tera: a PS completos todos los ataques son poco eficaces.
          finalMultiplier = 0.5;
          notes.push({ kind: "ability", key: "note.teraShell", params: { ability } });
        }
        if (ability === "thick-fat" && (attack === "fire" || attack === "ice")) factor(0.5, "note.abilityFactor");
        if (ability === "heatproof" && attack === "fire") factor(0.5, "note.abilityFactor");
        if (ability === "water-bubble" && attack === "fire") factor(0.5, "note.abilityFactor");
        if (ability === "purifying-salt" && attack === "ghost") factor(0.5, "note.abilityFactor");
        if (ability === "dry-skin" && attack === "fire") factor(1.25, "note.abilityFactor");
        if (ability === "fluffy" && attack === "fire") factor(2, "note.fluffy");
        if ((ability === "filter" || ability === "solid-rock" || ability === "prism-armor") && typeMultiplier > 1) {
          factor(0.75, "note.abilityFactor");
        }
      }
    } else if (c.defenderAbility && ignoresAbility && SUPPORTED_DEFENSIVE_ABILITIES[c.defenderAbility]) {
      notes.push({ kind: "attacker", key: "note.moldBreaker", params: { ability: c.defenderAbility } });
    }

    if (attack === "ground" && c.defenderItem === "air-balloon" && !grounded && finalMultiplier > 0) {
      finalMultiplier = 0;
      notes.push({ kind: "item", key: "note.airBalloon" });
    }

    if (c.attackerAbility === "tinted-lens" && typeMultiplier > 0 && typeMultiplier < 1 && finalMultiplier > 0) {
      finalMultiplier *= 2;
      notes.push({ kind: "attacker", key: "note.tintedLens" });
    }

    return { type: attack, typeMultiplier, finalMultiplier: round(finalMultiplier), notes: dedupe(notes) };
  });
}

const round = (n: number) => Math.round(n * 10000) / 10000;

function dedupe(notes: EffectNote[]): EffectNote[] {
  const seen = new Set<string>();
  return notes.filter((n) => {
    const k = `${n.key}:${JSON.stringify(n.params ?? {})}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Tipos válidos como Teracristal (Gen 9): los 18 más Astral. */
export const TERA_TYPES: (TypeName | "stellar")[] = [...TYPE_NAMES, "stellar"];
