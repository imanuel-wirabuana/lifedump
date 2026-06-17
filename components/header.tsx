import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
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
