"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/components/game/game-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 1000 * 60 * 60, gcTime: 1000 * 60 * 60, retry: 2, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <GameProvider>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </GameProvider>
    </QueryClientProvider>
  );
}
