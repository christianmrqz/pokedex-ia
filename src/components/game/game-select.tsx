"use client";

import { Gamepad2 } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GENERATIONS } from "@/lib/domain";
import { generationLabel, versionGroupsForGen } from "@/lib/data/games";
import { getDictionary } from "@/i18n";
import { cn } from "@/lib/utils";
import { useGame } from "./game-context";

const t = getDictionary();

/** Selector global del juego: determina la tabla de tipos y los movimientos disponibles. */
export function GameSelect({ className }: { className?: string }) {
  const { versionGroup, setVersionGroup } = useGame();
  return (
    <Select value={versionGroup} onValueChange={setVersionGroup}>
      <SelectTrigger size="sm" className={cn("max-w-56 gap-2", className)} aria-label={t.common.game}>
        <Gamepad2 className="text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-96">
        <SelectItem value="auto">{t.common.autoGame}</SelectItem>
        {[...GENERATIONS].reverse().map((gen) => (
          <SelectGroup key={gen}>
            <SelectLabel>{generationLabel(gen)}</SelectLabel>
            {versionGroupsForGen(gen)
              .slice()
              .reverse()
              .map((vg) => (
                <SelectItem key={vg.slug} value={vg.slug}>
                  {vg.es}
                </SelectItem>
              ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
