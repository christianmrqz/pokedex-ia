import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { deterministicAnswer } from "@/lib/assistant/answer";
import { buildFacts } from "@/lib/assistant/facts";
import type { AssistantEvent } from "@/lib/assistant/events";
import { interpretQuestion } from "@/lib/assistant/interpret";
import { ASSISTANT_SYSTEM_PROMPT, buildUserMessage } from "@/lib/assistant/prompt";
import { getVersionGroup } from "@/lib/data/games";
import { GENERATIONS, type Generation } from "@/lib/domain";

const MODEL = "claude-opus-5-5";

const Body = z.object({
  question: z.string().trim().min(1).max(1000),
  /** Pokémon que el usuario está viendo (contexto para preguntas como "¿qué naturaleza le pongo?"). */
  contextSlug: z.string().max(80).nullish(),
  versionGroup: z.string().max(80).nullish(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .max(12)
    .default([]),
});

/** La IA es opcional: solo se usa si hay credenciales en el servidor (nunca en el navegador). */
function aiConfigured() {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Petición no válida" }, { status: 400 });
  const { question, contextSlug, versionGroup, history } = parsed.data;

  const vg = versionGroup && versionGroup !== "auto" ? getVersionGroup(versionGroup) : undefined;
  const gen: Generation = vg && GENERATIONS.includes(vg.gen) ? vg.gen : 9;
  const interp = interpretQuestion(question, contextSlug);
  const facts = await buildFacts(interp, gen, vg?.slug ?? null);
  const fallbackText = deterministicAnswer(facts, interp);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AssistantEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      const pokemon = interp.pokemon.map((p) => p.slug);

      if (!aiConfigured()) {
        send({ type: "meta", mode: "deterministic", facts, pokemon });
        send({ type: "text", delta: fallbackText });
        send({ type: "done" });
        controller.close();
        return;
      }

      try {
        const client = new Anthropic();
        const messages: Anthropic.Beta.BetaMessageParam[] = [
          ...history.map((h) => ({ role: h.role, content: h.content })),
          { role: "user", content: buildUserMessage(question, facts) },
        ];
        const ai = client.beta.messages.stream({
          model: MODEL,
          max_tokens: 64000,
          // Ante un rechazo de los filtros de seguridad, la API reintenta con otro modelo en la misma llamada.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low" },
          system: [{ type: "text", text: ASSISTANT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          messages,
        });
        send({ type: "meta", mode: "ai", facts, pokemon });
        for await (const event of ai) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") send({ type: "text", delta: event.delta.text });
        }
        const final = await ai.finalMessage();
        if (final.stop_reason === "refusal") {
          send({ type: "text", delta: `\n\nNo he podido completar la respuesta. Estos son los datos calculados:\n\n${fallbackText}` });
        } else if (final.stop_reason === "max_tokens") {
          send({ type: "text", delta: "\n\n_(Respuesta recortada por longitud.)_" });
        }
        send({ type: "done" });
      } catch (err) {
        // Cualquier fallo de la API se resuelve con la respuesta determinista.
        const reason =
          err instanceof Anthropic.AuthenticationError
            ? "La clave de IA no es válida"
            : err instanceof Anthropic.RateLimitError
              ? "Se ha superado el límite de uso de la IA"
              : err instanceof Anthropic.APIError
                ? `La IA no está disponible (${err.status ?? "sin respuesta"})`
                : "La IA no está disponible";
        send({ type: "meta", mode: "deterministic", facts, pokemon, notice: `${reason}: respuesta generada sin IA.` });
        send({ type: "text", delta: fallbackText });
        send({ type: "done" });
      } finally {
        try {
          controller.close();
        } catch {
          // Ya cerrado.
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
