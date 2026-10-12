"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AssistantChat } from "./assistant-chat";

/** Botón flotante de la ficha: abre el asistente con el Pokémon visible como contexto. */
export function AskButton({ slug, name }: { slug: string; name: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="lg" className="fixed right-4 bottom-4 z-40 rounded-full shadow-2xl shadow-black/50 sm:right-6 sm:bottom-6">
          <Sparkles /> Preguntar
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Asistente · {name}</SheetTitle>
          <SheetDescription>Respuestas basadas en los datos y cálculos de la aplicación.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 px-4 pb-4">
          <AssistantChat contextSlug={slug} contextName={name} compact />
        </div>
      </SheetContent>
    </Sheet>
  );
}
