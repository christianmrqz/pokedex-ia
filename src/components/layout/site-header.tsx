"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { GameSelect } from "@/components/game/game-select";
import { SearchCommand } from "@/components/search/search-command";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getDictionary } from "@/i18n";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

const t = getDictionary();

function isActive(pathname: string | null, href: string) {
  return !!pathname && (pathname === href || pathname.startsWith(`${href}/`));
}

function DesktopLinks({ pathname }: { pathname: string | null }) {
  return (
    <>
      {NAV_ITEMS.filter((i) => !i.soon).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground",
            isActive(pathname, item.href) && "bg-white/5 text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

function MobileLinks({ pathname, onNavigate }: { pathname: string | null; onNavigate: () => void }) {
  return (
    <>
      {NAV_ITEMS.map((item) =>
        item.soon ? (
          <span key={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60">
            <item.icon className="size-4" />
            {item.label}
            <span className="ml-auto text-[10px] uppercase">{t.common.soon}</span>
          </span>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-white/5", isActive(pathname, item.href) && "bg-white/5")}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ),
      )}
    </>
  );
}

/** usePathname puede suspender en rutas dinámicas: se aísla tras un Suspense. */
function WithPathname({ render }: { render: (pathname: string | null) => React.ReactNode }) {
  return render(usePathname());
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Principal">
          <Suspense fallback={<DesktopLinks pathname={null} />}>
            <WithPathname render={(p) => <DesktopLinks pathname={p} />} />
          </Suspense>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchCommand className="w-9 justify-center px-0 xl:w-64 xl:justify-start xl:px-3" />
          <GameSelect className="hidden sm:flex" />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menú">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>{t.appName}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label="Móvil">
                <Suspense fallback={<MobileLinks pathname={null} onNavigate={() => setOpen(false)} />}>
                  <WithPathname render={(p) => <MobileLinks pathname={p} onNavigate={() => setOpen(false)} />} />
                </Suspense>
                <div className="mt-4 border-t border-border pt-4">
                  <div className="mb-2 px-1 text-xs text-muted-foreground">{t.common.game}</div>
                  <GameSelect className="w-full max-w-none" />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
