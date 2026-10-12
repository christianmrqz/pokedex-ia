import { describe, expect, it } from "vitest";
import { deterministicAnswer } from "@/lib/assistant/answer";
import { buildFacts } from "@/lib/assistant/facts";
import { interpretQuestion } from "@/lib/assistant/interpret";
import { buildUserMessage } from "@/lib/assistant/prompt";

async function run(question: string, gen: 1 | 5 | 9 = 9) {
  const interp = interpretQuestion(question);
  const facts = await buildFacts(interp, gen, null);
  return { interp, facts, answer: deterministicAnswer(facts, interp) };
}

describe("asistente: hechos y respuesta sin IA", () => {
  it("explica por qué Lucha es neutro contra Drapion con el desglose por tipo", async () => {
    const { facts, answer } = await run("¿Por qué mi ataque de tipo Lucha no es supereficaz contra Drapion?");
    expect(facts.efectividad).toEqual([
      {
        tipoAtaque: "Lucha",
        defensor: "Drapion",
        desglose: [
          { contraTipo: "Veneno", multiplicador: 0.5 },
          { contraTipo: "Siniestro", multiplicador: 2 },
        ],
        total: 1,
      },
    ]);
    expect(answer).toContain("×0,5 contra Veneno y ×2 contra Siniestro = ×1");
  });

  it("cómo derrotar a Drapion: única debilidad Tierra y rivales con motivos", async () => {
    const { facts, answer } = await run("¿Qué Pokémon me recomiendas para derrotar a Drapion?");
    expect(facts.pokemon[0].debilidades).toEqual([{ tipo: "Tierra", multiplicador: 2 }]);
    expect(facts.pokemon[0].inmunidades).toEqual(["Psíquico"]);
    expect(facts.pokemon[0].rivalesSugeridos?.length).toBeGreaterThan(0);
    expect(answer).toContain("Drapion solo tiene una debilidad natural: Tierra ×2");
  });

  it("rival de tipo Agua/Volador: Eléctrico ×4 e inmune a Tierra", async () => {
    const { facts } = await run("¿Qué Pokémon me conviene utilizar contra un rival de tipo Agua/Volador?");
    expect(facts.combinacionDeTipos?.debilidades).toContainEqual({ tipo: "Eléctrico", multiplicador: 4 });
    expect(facts.combinacionDeTipos?.inmunidades).toEqual(["Tierra"]);
  });

  it("repartos de EV coherentes para Charizard (atacante especial)", async () => {
    const { facts } = await run("¿Cómo reparto los EV de mi Charizard?");
    const special = facts.repartos?.find((r) => r.objetivo === "atacante especial");
    expect(special?.ev["Ataque Especial"]).toBe(252);
    expect(special?.iv["Ataque"]).toBe(0);
  });

  it("respeta la generación elegida (Clefairy era Normal en Gen 5)", async () => {
    const { facts } = await run("debilidades de Clefairy", 5);
    expect(facts.pokemon[0].tipos).toEqual(["Normal"]);
    expect(facts.pokemon[0].debilidades).toEqual([{ tipo: "Lucha", multiplicador: 2 }]);
  });

  it("indica cuando un Pokémon no existe en la generación", async () => {
    const { facts } = await run("¿Cómo derroto a Drapion?", 1);
    expect(facts.pokemon).toHaveLength(0);
    expect(facts.notas.join(" ")).toContain("no existe");
  });

  it("el mensaje para la IA incluye los datos y la pregunta", () => {
    const msg = buildUserMessage("¿Hola?", { a: 1 });
    expect(msg).toContain('<datos>\n{"a":1}\n</datos>');
    expect(msg).toContain("Pregunta: ¿Hola?");
  });
});
