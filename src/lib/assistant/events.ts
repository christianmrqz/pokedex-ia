/** Eventos NDJSON que la ruta /api/assistant envía al navegador. */
export type AssistantEvent =
  | { type: "meta"; mode: "ai" | "deterministic"; facts: unknown; pokemon: string[]; notice?: string }
  | { type: "text"; delta: string }
  | { type: "done" }
  | { type: "error"; message: string };
