"use client"

import Link from "next/link"
import { UserButton, useAuth } from "@clerk/nextjs"
import { useDumpsQuery } from "@/hooks/use-dumps"
import { Bell } from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function Header() {
  const { userId } = useAuth()
  const pathname = usePathname()

  const { data: dumps } = useDumpsQuery(userId)

  const reviewCount = (dumps || []).filter(
    (dump) => dump.status === "needs_review"
  ).length
  const failedCount = (dumps || []).filter(
    (dump) => dump.status === "failed"
  ).length
  const hasActionable = reviewCount + failedCount > 0
  const isReviewActive = pathname === "/review"

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="bg-linear-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-xl font-extrabold tracking-tight text-transparent transition-opacity hover:opacity-90"
        >
          LifeDump
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/review"
            className={cn(
              "relative rounded-md p-2 transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              isReviewActive
                ? "bg-accent/50 text-primary"
                : "text-muted-foreground"
            )}
            title="Pending reviews"
            aria-label={`${reviewCount} pending reviews, ${failedCount} failed dumps`}
          >
            <Bell className="size-5" />
            {hasActionable && (
              <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] leading-4 font-black text-white shadow-sm">
                {reviewCount + failedCount > 9
                  ? "9+"
                  : reviewCount + failedCount}
              </span>
            )}
          </Link>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-7 border border-border/50",
              },
            }}
          />
        </div>
      </div>
    </header>
  )
}
