"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { useDumpsQuery } from "@/hooks/use-dumps";
import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Header() {
  const { userId } = useAuth();
  const pathname = usePathname();

  const { data: dumps } = useDumpsQuery(userId);

  const hasNeedsReview = (dumps || []).some((dump) => dump.status === "needs_review");
  const isReviewActive = pathname === "/review";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-xl font-extrabold tracking-tight text-transparent transition-opacity hover:opacity-90"
        >
          LifeDump
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/review"
            className={cn(
              "relative rounded-md p-2 hover:bg-accent hover:text-accent-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              isReviewActive ? "text-primary bg-accent/50" : "text-muted-foreground"
            )}
            title="Pending reviews"
          >
            <Bell className="size-5" />
            {hasNeedsReview && (
              <span className="absolute right-2 top-2 flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-rose-500"></span>
              </span>
            )}
          </Link>
          <ThemeToggle />
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
  );
}
