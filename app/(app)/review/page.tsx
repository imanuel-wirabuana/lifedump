"use client";

import { useAuth } from "@clerk/nextjs";
import { useDumpStore } from "@/stores/use-dump-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Check, ArrowLeft, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useDumpsQuery } from "@/hooks/use-dumps";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ReviewPage() {
  const { userId } = useAuth();
  const { setCurrentInputText, setExtractedItems, setCurrentDumpId, setDumpStatus } = useDumpStore();

  const { data: dumps, isLoading } = useDumpsQuery(userId);

  const pendingDumps = (dumps || []).filter((dump) => dump.status === "needs_review");

  return (
    <div className="flex flex-col p-4 md:p-8 max-w-2xl mx-auto w-full pt-8 gap-6">
      {/* Back Button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Pending Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and confirm draft items extracted by the AI before saving them to your active lists.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="size-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pendingDumps.length > 0 ? (
        <div className="flex flex-col gap-4">
          {pendingDumps.map((dump) => {
            const itemCount = dump.extractedItems?.length || 0;

            return (
              <Card
                key={dump.id}
                onClick={() => {
                  setCurrentInputText(dump.rawText || "");
                  setExtractedItems(dump.extractedItems || []);
                  setCurrentDumpId(dump.id);
                  setDumpStatus("needs_review");
                }}
                className="border-border/50 shadow-sm hover:border-border transition-all duration-200 hover:-translate-y-[2px] cursor-pointer group hover:shadow-md"
              >
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium text-sm text-foreground/90 line-clamp-3 flex-1 italic pl-3 border-l-2 border-primary/20">
                      "{dump.rawText || "Empty dump"}"
                    </p>
                    <div className="flex gap-1.5 shrink-0 items-center">
                      <Badge variant="outline" className="text-[10px] shrink-0 font-medium capitalize h-5 px-1.5">
                        {dump.sourceType}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock className="size-3.5" />
                      <span suppressHydrationWarning>{formatRelativeTime(dump.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                        <Sparkles className="size-3 mr-1 inline-block" />
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </Badge>
                      <Button size="sm" className="h-7 px-3 text-xs bg-primary hover:bg-primary/95 text-white font-medium rounded-lg">
                        Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty className="border-border/40 py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Check className="size-6 text-emerald-500" />
            </EmptyMedia>
            <EmptyTitle>All caught up!</EmptyTitle>
            <EmptyDescription>You have no pending dumps to review. Everything has been organized.</EmptyDescription>
          </EmptyHeader>
          <Button asChild className="mt-4">
            <Link href="/">Return to Dashboard</Link>
          </Button>
        </Empty>
      )}
    </div>
  );
}
