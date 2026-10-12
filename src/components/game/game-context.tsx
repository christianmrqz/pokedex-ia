"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LATEST_GEN, type Generation, type VersionGroupEntry } from "@/lib/domain";
import { getVersionGroup } from "@/lib/data/games";

const STORAGE_KEY = "dexlab.game";

interface GameState {
  /** Grupo de versiones elegido o "auto" (el juego más reciente con datos). */
  versionGroup: string;
  /** Generación efectiva para la tabla de tipos y las fórmulas. */
  gen: Generation;
  selected: VersionGroupEntry | null;
  setVersionGroup: (slug: string) => void;
}

const GameContext = createContext<GameState | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [versionGroup, setState] = useState("auto");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferencia guardada, solo disponible en el navegador
      if (stored && (stored === "auto" || getVersionGroup(stored))) setState(stored);
    } catch {
      // Almacenamiento no disponible: se usa el valor por defecto.
    }
  }, []);

  const setVersionGroup = useCallback((slug: string) => {
    setState(slug);
    try {
      window.localStorage.setItem(STORAGE_KEY, slug);
    } catch {
      // Ignorado.
    }
  }, []);

  const value = useMemo<GameState>(() => {
    const selected = versionGroup === "auto" ? null : (getVersionGroup(versionGroup) ?? null);
    return { versionGroup, selected, gen: selected?.gen ?? LATEST_GEN, setVersionGroup };
  }, [versionGroup, setVersionGroup]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameState {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame debe usarse dentro de <GameProvider>");
  return ctx;
}
