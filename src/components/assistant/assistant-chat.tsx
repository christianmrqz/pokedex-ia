"use client";

import { Bot, Database, Loader2, Send, Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/components/game/game-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AssistantEvent } from "@/lib/assistant/events";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  mode?: "ai" | "deterministic";
  notice?: string;
  facts?: unknown;
  pending?: boolean;
}

const EXAMPLES = [
  "¿Qué Pokémon me recomiendas para derrotar a Drapion?",
  "Mi Pokémon: Garchomp. Rival: Drapion",
  "¿Por qué mi ataque de tipo Lucha no es supereficaz contra Drapion?",
  "¿Cómo reparto los EV de mi Charizard?",
  "¿Qué Pokémon me conviene utilizar contra un rival de tipo Agua/Volador?",
  "¿Cuál es la mejor combinación de ataques para cubrir más tipos?",
];

interface Props {
  /** Pokémon que se está viendo: da contexto a preguntas como "¿qué naturaleza le pongo?". */
  contextSlug?: string;
  contextName?: string;
  compact?: boolean;
}

export function AssistantChat({ contextSlug, contextName, compact }: Props) {
  const { versionGroup } = useGame();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    // Solo se reenvía el texto de los turnos anteriores (sin datos) para mantener el contexto.
    const history = messages.filter((m) => !m.pending).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "", pending: true }]);
    const update = (fn: (msg: ChatMessage) => ChatMessage) =>
      setMessages((all) => all.map((msg, i) => (i === all.length - 1 ? fn(msg) : msg)));

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, contextSlug, versionGroup, history: history.slice(-10) }),
      });
      if (!res.ok || !res.body) throw new Error(`Error ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as AssistantEvent;
          // Un nuevo "meta" reinicia la respuesta (p. ej. si la IA falla y se pasa al modo sin IA).
          if (event.type === "meta") update((m) => ({ ...m, content: "", mode: event.mode, notice: event.notice, facts: event.facts }));
          else if (event.type === "text") update((m) => ({ ...m, content: m.content + event.delta }));
          else if (event.type === "error") update((m) => ({ ...m, content: event.message }));
        }
      }
      update((m) => ({ ...m, pending: false }));
    } catch {
      update((m) => ({ ...m, pending: false, content: "No se pudo obtener respuesta. Comprueba tu conexión e inténtalo de nuevo." }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex flex-col", compact ? "h-full" : "min-h-[60vh]")}>
      <div className={cn("flex-1 space-y-4 overflow-y-auto", compact && "pr-1")}>
        {messages.length === 0 && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {contextName ? `Pregunta lo que quieras sobre ${contextName} o cualquier otro Pokémon.` : "Pregunta en lenguaje natural. Las respuestas se basan solo en datos verificados y cálculos de la aplicación."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(contextName
                ? [`¿Cómo derroto a ${contextName}?`, `¿Qué naturaleza le conviene a ${contextName}?`, `¿Cómo reparto los EV de ${contextName}?`]
                : EXAMPLES
              ).map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => ask(ex)}
                  className="rounded-full border border-border bg-white/[0.03] px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", m.role === "user" ? "bg-white/10" : "bg-primary/15 text-primary")}>
              {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
            </span>
            <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm", m.role === "user" ? "bg-white/[0.07]" : "surface")}>
              {m.role === "assistant" && m.pending && !m.content ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Calculando…
                </span>
              ) : (
                <RichText text={m.content} />
              )}
              {m.role === "assistant" && !m.pending && (
                <div className="mt-3 space-y-2 border-t border-border pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    {m.mode === "ai" ? <Sparkles className="size-3.5 text-primary" /> : <Database className="size-3.5" />}
                    {m.mode === "ai" ? "Redactado por IA a partir de los datos calculados" : "Respuesta generada sin IA, con los datos calculados"}
                  </span>
                  {m.notice && <p className="text-amber-200/80">{m.notice}</p>}
                  {m.facts !== undefined && (
                    <details>
                      <summary className="cursor-pointer hover:text-foreground">Datos usados</summary>
                      <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/30 p-2 text-[11px] leading-relaxed whitespace-pre-wrap">{JSON.stringify(m.facts, null, 2)}</pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="mt-4 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(input);
            }
          }}
          placeholder="Escribe tu pregunta…"
          rows={compact ? 2 : 2}
          maxLength={1000}
          className="min-h-11 resize-none"
          aria-label="Pregunta"
        />
        <Button type="submit" size="icon-lg" disabled={busy || !input.trim()} aria-label="Enviar">
          {busy ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </form>
    </div>
  );
}

/** Markdown mínimo: párrafos, listas con "- ", **negrita** y _cursiva_. */
function RichText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={blocks.length} className="my-1.5 list-disc space-y-1 pl-5">
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const heading = line.match(/^#{1,4}\s+(.*)/);
    blocks.push(
      <p key={blocks.length} className={cn("my-1.5 leading-relaxed", heading && "font-semibold")}>
        {inline(heading ? heading[1] : line)}
      </p>,
    );
  }
  flush();
  return <div>{blocks}</div>;
}

function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : part.length > 2 && part.startsWith("_") && part.endsWith("_") ? (
      <em key={i} className="text-muted-foreground">
        {part.slice(1, -1)}
      </em>
    ) : (
      part
    ),
  );
}
