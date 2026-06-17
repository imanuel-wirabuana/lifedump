"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useDumpStore } from "@/store/use-dump-store";

export function DumpProcessingListener() {
  const { userId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setCurrentInputText, setExtractedItems, setCurrentDumpId, setDumpStatus } = useDumpStore();
  
  // Track toasts that are active to avoid duplicate/redundant trigger actions
  const activeToasts = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!userId) return;

    // Listen to dumps created in the last 10 minutes to track status updates deterministically
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const q = query(
      collection(db, "users", userId, "dumps"),
      where("createdAt", ">=", tenMinutesAgo)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const dumpId = change.doc.id;
        const dump = change.doc.data();
        const toastId = `dump-${dumpId}`;

        if (change.type === "added" || change.type === "modified") {
          if (dump.status === "processing") {
            activeToasts.current[dumpId] = true;
            toast.loading("Organizing your dump...", {
              id: toastId,
              description: "You can continue using the app.",
            });
          } else if (dump.status === "needs_review" && activeToasts.current[dumpId]) {
            delete activeToasts.current[dumpId];
            queryClient.invalidateQueries({ queryKey: ["items", userId] });
            queryClient.invalidateQueries({ queryKey: ["dumps", userId] });
            queryClient.invalidateQueries({ queryKey: ["dumps-infinite", userId] });
            toast.success("Dump organized successfully!", {
              id: toastId,
              description: "Items categorized. Tap to review and save.",
              action: {
                label: "Review",
                onClick: () => {
                  setCurrentInputText(dump.rawText || "");
                  setExtractedItems(dump.extractedItems || []);
                  setCurrentDumpId(dumpId);
                  setDumpStatus("needs_review");
                },
              },
              duration: 10000,
            });
          } else if (dump.status === "failed" && activeToasts.current[dumpId]) {
            delete activeToasts.current[dumpId];
            queryClient.invalidateQueries({ queryKey: ["items", userId] });
            queryClient.invalidateQueries({ queryKey: ["dumps", userId] });
            queryClient.invalidateQueries({ queryKey: ["dumps-infinite", userId] });
            toast.error("Failed to organize dump", {
              id: toastId,
              description: dump.error || "An error occurred during categorization.",
              action: {
                label: "View Dump",
                onClick: () => {
                  router.push(`/dumps/${dumpId}`);
                },
              },
              duration: 10000,
            });
          }
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [userId, router, queryClient, setCurrentInputText, setExtractedItems, setCurrentDumpId, setDumpStatus]);

  return null;
}
