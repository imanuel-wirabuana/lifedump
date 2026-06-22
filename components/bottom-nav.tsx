"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, CheckSquare, DollarSign, FileText, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
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
    href: "/",
    label: "Home",
    icon: Home,
    primary: true,
  },
  {
    href: "/notes",
    label: "Notes",
    icon: FileText,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-50 flex min-h-16 w-full items-center justify-around bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_35px_-25px_rgb(0_0_0/.35)] backdrop-blur-xl"
      aria-label="Primary"
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        const isPrimary = item.primary

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-[11px]",
              isPrimary && "-mt-5 min-h-20",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && !isPrimary && (
              <span className="absolute bottom-0 left-1/2 h-0.5 w-10 -translate-x-1/2 bg-primary shadow-[0_0_18px_-6px_hsl(var(--primary))]" />
            )}
            <span
              className={cn(
                "flex items-center justify-center transition-all duration-200",
                isPrimary
                  ? cn(
                      "size-14 rounded-full bg-background text-primary-foreground shadow-[0_0_18px_-6px_hsl(var(--primary))]",
                      isActive && "bg-primary"
                    )
                  : ""
              )}
            >
              <Icon
                className={cn(
                  "size-5 transition-transform duration-200",
                  isPrimary && "size-6",
                  isActive && !isPrimary && "-translate-y-0.5"
                )}
                aria-hidden="true"
              />
            </span>
            <span
              className={cn(
                "transition-colors duration-200",
                isPrimary && "text-[11px] font-bold",
                isPrimary && (isActive ? "text-primary" : "text-foreground"),
                isActive && "font-semibold"
              )}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
