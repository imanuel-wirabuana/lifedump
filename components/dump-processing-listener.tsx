"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

export function DumpProcessingListener() {
  const { userId } = useAuth();
  const router = useRouter();
  
  // Track toasts that are active to avoid duplicate/redundant trigger actions
  const activeToasts = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "users", userId, "dumps"),
      where("status", "in", ["queued", "processing"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const dumpId = change.doc.id;
        const dump = change.doc.data();
        const toastId = `dump-${dumpId}`;

        if (change.type === "added" || change.type === "modified") {
          // If the dump is queued or processing, show/update loading toast
          if (dump.status === "queued" || dump.status === "processing") {
            activeToasts.current[dumpId] = true;
            toast.loading("Organizing your dump...", {
              id: toastId,
              description: "You can continue using the app.",
            });
          }
        } else if (change.type === "removed") {
          // The dump has been removed from the query because its status changed
          // Wait, fetch the updated document state to check the new status
          const finalDump = change.doc.data();
          delete activeToasts.current[dumpId];

          if (finalDump.status === "needs_review") {
            toast.success("Your dump is ready to review", {
              id: toastId,
              description: "Check the AI categorization before saving.",
              action: {
                label: "Review",
                onClick: () => {
                  router.push(`/review/${dumpId}`);
                },
              },
              duration: 10000, // Show for 10s so they don't miss it
            });
          } else if (finalDump.status === "failed") {
            toast.error("Unable to organize your dump", {
              id: toastId,
              description: finalDump.error || "Your original input has been saved.",
              action: {
                label: "Open",
                onClick: () => {
                  router.push(`/review/${dumpId}`);
                },
              },
              duration: 10000,
            });
          } else if (finalDump.status === "confirmed") {
            toast.success("Your items have been saved", {
              id: toastId,
            });
          }
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [userId, router]);

  return null;
}
