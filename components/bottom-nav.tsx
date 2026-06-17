"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CheckSquare, DollarSign, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: Home,
  },
  {
    href: "/tasks",
    label: "Tasks",
    icon: CheckSquare,
  },
  {
    href: "/finances",
    label: "Finances",
    icon: DollarSign,
  },
  {
    href: "/notes",
    label: "Notes",
    icon: FileText,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t bg-background/85 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_35px_-25px_rgb(0_0_0/.35)] backdrop-blur-xl"
      aria-label="Primary"
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-3 text-[11px] font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <span className="absolute bottom-0 left-1/2 h-0.5 w-10 -translate-x-1/2 bg-primary shadow-[0_0_18px_-6px_hsl(var(--primary))]" />
            )}
            <Icon
              className={cn(
                "size-5 transition-transform duration-200",
                isActive && "translate-y-[-1px]"
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "transition-colors duration-200",
                isActive && "font-semibold"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
