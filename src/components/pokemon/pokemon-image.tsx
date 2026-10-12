"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Candidatos en orden de preferencia; si uno falla se prueba el siguiente. */
  candidates: string[];
  alt: string;
  size: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

export function PokemonImage({ candidates, alt, size, className, priority, sizes }: Props) {
  const key = candidates.join("|");
  const [failed, setFailed] = useState<{ key: string; index: number }>({ key, index: 0 });
  const index = failed.key === key ? failed.index : 0;
  const src = candidates[Math.min(index, candidates.length - 1)];
  const isPlaceholder = src.startsWith("/");

  return (
    <Image
      key={src}
      src={src}
      alt={alt}
      width={size}
      height={size}
      sizes={sizes}
      priority={priority}
      unoptimized={isPlaceholder}
      draggable={false}
      className={cn("select-none object-contain", isPlaceholder && "opacity-60", className)}
      onError={() => {
        if (index < candidates.length - 1) setFailed({ key, index: index + 1 });
      }}
    />
  );
}
