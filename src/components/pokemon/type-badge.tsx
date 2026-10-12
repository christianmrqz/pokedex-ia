import type { TypeName } from "@/lib/domain";
import { typeLabel } from "@/lib/engine/type-chart";
import { TYPE_COLORS, typeTextColor } from "@/lib/ui/type-colors";
import { cn } from "@/lib/utils";

interface Props {
  type: TypeName;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  xs: "h-5 px-1.5 text-[10px]",
  sm: "h-6 px-2 text-xs",
  md: "h-7 px-3 text-sm",
  lg: "h-9 px-4 text-base",
};

export function TypeBadge({ type, size = "sm", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold tracking-wide whitespace-nowrap uppercase shadow-sm",
        SIZES[size],
        className,
      )}
      style={{
        backgroundColor: TYPE_COLORS[type],
        color: typeTextColor(type),
        boxShadow: `0 0 0 1px ${TYPE_COLORS[type]}55, 0 4px 14px -6px ${TYPE_COLORS[type]}`,
      }}
    >
      {typeLabel(type)}
    </span>
  );
}
