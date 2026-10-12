import type { Metadata } from "next";
import { AssistantChat } from "@/components/assistant/assistant-chat";

export const metadata: Metadata = {
  title: "Asistente",
  description: "Pregunta cómo derrotar a un Pokémon, qué naturaleza usar o qué cobertura de ataques elegir. Respuestas basadas en datos verificados.",
};

export default function AssistantPage() {
  const aiEnabled = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold sm:text-4xl">Asistente de combate</h1>
        <p className="mt-2 text-muted-foreground">
          Interpreta tu pregunta, consulta los datos de PokéAPI, ejecuta los cálculos y te lo explica.{" "}
          {aiEnabled
            ? "Las respuestas las redacta Claude usando solo esos datos."
            : "La IA no está configurada en este servidor: las respuestas se generan sin IA con los mismos datos."}
        </p>
      </header>
      <div className="rounded-3xl surface p-4 sm:p-6">
        <AssistantChat />
      </div>
    </div>
  );
}
