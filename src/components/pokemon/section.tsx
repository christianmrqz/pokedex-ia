import { cn } from "@/lib/utils";

interface Props {
  id: string;
  title: string;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Bloque de contenido de la ficha con ancla para la navegación por secciones. */
export function Section({ id, title, icon, description, actions, children, className }: Props) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-28 rounded-3xl surface p-5 sm:p-7", className)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
            {icon && <span className="text-primary [&_svg]:size-5">{icon}</span>}
            {title}
          </h2>
          {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
