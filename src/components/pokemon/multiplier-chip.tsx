import { formatMultiplier } from "@/lib/ui/format";
import { cn } from "@/lib/utils";

/** Color semántico de un multiplicador de daño recibido. */
export function multiplierTone(m: number): string {
  if (m === 0) return "bg-violet-500/15 text-violet-200 ring-violet-400/30";
  if (m >= 4) return "bg-red-500/25 text-red-100 ring-red-400/50";
  if (m > 1) return "bg-orange-500/15 text-orange-100 ring-orange-400/40";
  if (m === 1) return "bg-white/5 text-muted-foreground ring-white/10";
  if (m <= 0.25) return "bg-emerald-500/20 text-emerald-100 ring-emerald-400/40";
  return "bg-teal-500/12 text-teal-100 ring-teal-400/30";
}

export function MultiplierChip({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-11 items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-sm font-semibold tabular ring-1", multiplierTone(value), className)}>
      ×{formatMultiplier(value)}
    </span>
  );
}
