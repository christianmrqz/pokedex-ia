"use client";

import { useCallback, useEffect, useState } from "react";
import { isTeam, type Team } from "@/lib/team/model";

const KEY = "dexlab.teams.v1";

function load(): Team[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isTeam) : [];
  } catch {
    return [];
  }
}

/** Equipos guardados en este navegador (localStorage). */
export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el almacenamiento solo existe en el navegador
    setTeams(load());
    setLoaded(true);
  }, []);

  const persist = useCallback((next: Team[]) => {
    setTeams(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Sin almacenamiento disponible (modo privado o cuota llena): el equipo vive solo en memoria.
    }
  }, []);

  const save = useCallback(
    (team: Team) => {
      const updated = { ...team, updatedAt: Date.now() };
      const exists = teams.some((t) => t.id === team.id);
      persist(exists ? teams.map((t) => (t.id === team.id ? updated : t)) : [...teams, updated]);
    },
    [teams, persist],
  );

  const remove = useCallback((id: string) => persist(teams.filter((t) => t.id !== id)), [teams, persist]);

  return { teams, loaded, save, remove };
}
