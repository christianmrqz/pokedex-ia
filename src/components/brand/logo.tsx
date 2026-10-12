import Link from "next/link";
import { cn } from "@/lib/utils";

/** Marca propia de DexLab (no utiliza logotipos oficiales). */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)} aria-label="DexLab, inicio">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="dexlab-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="oklch(0.86 0.13 195)" />
            <stop offset="1" stopColor="oklch(0.7 0.16 280)" />
          </linearGradient>
        </defs>
        <path
          d="M16 2.5 28 9.25v13.5L16 29.5 4 22.75V9.25Z"
          fill="none"
          stroke="url(#dexlab-g)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="16" r="5.2" fill="none" stroke="url(#dexlab-g)" strokeWidth="2" />
        <circle cx="16" cy="16" r="1.9" fill="url(#dexlab-g)" className="transition-transform duration-500 group-hover:scale-125" style={{ transformOrigin: "16px 16px" }} />
      </svg>
      <span className="font-heading text-lg font-semibold tracking-tight">
        Dex<span className="text-primary">Lab</span>
      </span>
    </Link>
  );
}
