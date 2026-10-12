/**
 * Respuesta determinista: redacta en español los hechos calculados, sin IA.
 * Es la respuesta cuando no hay clave de IA configurada o la API no está disponible.
 */
import type { AssistantFacts } from "./facts";
import type { Interpretation } from "./interpret";

const x = (m: number) => `×${String(m).replace(".", ",")}`;

export function deterministicAnswer(facts: AssistantFacts, interp: Interpretation): string {
  const out: string[] = [];
  const { pokemon } = facts;

  if (facts.enfrentamiento) {
    const e = facts.enfrentamiento;
    out.push(`**${e.atacante} contra ${e.defensor}** (${facts.generacion})`);
    for (const v of e.ventajaTipos) out.push(`- ${v.de}: su mejor ataque de su propio tipo es ${v.tipo} (${x(v.multiplicador)}).`);
    const [a, b] = e.velocidadNivel50;
    out.push(
      a.minimo > b.maximo
        ? `- ${a.pokemon} es siempre más rápido a nivel 50 (${a.minimo}–${a.maximo} frente a ${b.minimo}–${b.maximo}).`
        : b.minimo > a.maximo
          ? `- ${b.pokemon} es siempre más rápido a nivel 50 (${b.minimo}–${b.maximo} frente a ${a.minimo}–${a.maximo}).`
          : `- Velocidad a nivel 50: ${a.pokemon} ${a.minimo}–${a.maximo} y ${b.pokemon} ${b.minimo}–${b.maximo}; depende del entrenamiento.`,
    );
    for (const d of e.danos) out.push(`- ${d.atacante} con ${d.movimiento}: ${d.porcentaje} de los PS de ${d.defensor} (${d.rango}). ${d.ko}`);
    if (e.danos.length) out.push(`  _Condiciones: ${e.danos[0].condiciones}${e.juegoMovimientos ? `; movimientos de ${e.juegoMovimientos}` : ""}._`);
  }

  if (facts.efectividad?.length) {
    for (const ef of facts.efectividad) {
      const parts = ef.desglose.map((d) => `${x(d.multiplicador)} contra ${d.contraTipo}`).join(" y ");
      out.push(`**${ef.tipoAtaque} contra ${ef.defensor}: ${x(ef.total)}.** Se multiplica la efectividad contra cada tipo: ${parts} = ${x(ef.total)}.`);
    }
  }

  if (facts.repartos?.length) {
    out.push(`**Repartos recomendados para ${facts.repartos[0].pokemon}**`);
    for (const r of facts.repartos) {
      const evs = Object.entries(r.ev)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${v} ${k}`)
        .join(" / ");
      const zeroIv = Object.entries(r.iv)
        .filter(([, v]) => v === 0)
        .map(([k]) => k);
      out.push(
        `- ${r.objetivo}: ${evs}${r.naturaleza ? `, naturaleza ${r.naturaleza}${r.alternativa ? ` (o ${r.alternativa})` : ""}` : ""}${zeroIv.length ? `, IV 0 en ${zeroIv.join(" y ")}` : ""}. ${r.motivos[0] ?? ""}`,
      );
    }
  }

  if (facts.cobertura) {
    const c = facts.cobertura;
    out.push(`**Mejor cobertura${c.base.length ? ` partiendo de ${c.base.join("/")}` : ""}**`);
    for (const m of c.mejores) {
      out.push(`- ${m.tipos.join(" + ")}: supereficaz contra ${m.supereficazContra} de ${m.total} combinaciones de tipos; ${m.bloqueadoPor} lo resisten todo${m.ejemplosQueLoBloquean.length ? ` (p. ej. ${m.ejemplosQueLoBloquean.slice(0, 3).join(", ")})` : ""}.`);
    }
  }

  if (facts.combinacionDeTipos) {
    const c = facts.combinacionDeTipos;
    out.push(`**Rival de tipo ${c.tipos.join("/")}**`);
    out.push(`- Debilidades: ${c.debilidades.map((d) => `${d.tipo} ${x(d.multiplicador)}`).join(", ") || "ninguna"}.`);
    if (c.inmunidades.length) out.push(`- Inmune a: ${c.inmunidades.join(", ")}.`);
    if (c.rivalesSugeridos.length) out.push(`- Buenas opciones: ${c.rivalesSugeridos.slice(0, 4).map((r) => `${r.nombre} (${r.motivos[0]})`).join("; ")}.`);
  }

  const showProfile = !facts.enfrentamiento && !facts.repartos && !facts.efectividad;
  for (const p of pokemon) {
    if (!showProfile && !p.rivalesSugeridos) continue;
    const weak = p.debilidades.map((d) => `${d.tipo} ${x(d.multiplicador)}`).join(", ");
    out.push(`**${p.nombre}** (${p.tipos.join("/")}, ${facts.generacion})`);
    out.push(
      p.debilidades.length === 1
        ? `- ${p.nombre} solo tiene una debilidad natural: ${weak}.`
        : `- Debilidades: ${weak || "ninguna"}.`,
    );
    if (p.inmunidades.length) out.push(`- Inmune a: ${p.inmunidades.join(", ")} (por tipo).`);
    out.push(`- Conviene atacarle con ${p.ladoRecomendadoParaAtacarle}.`);
    if (p.rivalesSugeridos?.length) {
      out.push(`- Buenas opciones: ${p.rivalesSugeridos.slice(0, 4).map((r) => `${r.nombre} (${r.motivos.slice(0, 2).join(", ")})`).join("; ")}.`);
    }
  }

  if (!out.length) {
    out.push(
      interp.pokemon.length || interp.types.length
        ? "No tengo datos calculados para responder a esa pregunta concreta."
        : "No he reconocido ningún Pokémon ni tipo en la pregunta. Prueba, por ejemplo: «¿Cómo derroto a Drapion?» o «Mi Pokémon: Garchomp. Rival: Drapion».",
    );
  }
  for (const n of facts.notas) out.push(`_${n}_`);
  return out.join("\n");
}
