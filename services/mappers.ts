import { PendingItem } from "@/stores/use-dump-store";
import { ExtractedItem } from "@/types";

export function mapApiItemsToPendingItems(apiItems: ExtractedItem[] = []): PendingItem[] {
  return apiItems.map((raw) => {
    const item: PendingItem = {
      category: raw.category,
      title: raw.title,
      content: raw.content || "",
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      source: raw.source || "ai",
      aiConfidence: raw.confidence,
      needsClarification: raw.needsClarification,
    };

    if (raw.category === "task") {
      item.task = {
        isCompleted: false,
        dueAt: raw.dueAt ? new Date(raw.dueAt) : undefined,
        priority: raw.priority || "none",
      };
    }

    if (raw.category === "finance") {
      item.finance = {
        type: raw.financeType || "expense",
        amount: raw.amount || 0,
        currency: "IDR",
        occurredAt: raw.occurredAt ? new Date(raw.occurredAt) : new Date(),
        paymentMethod: raw.paymentMethod || undefined,
      };
    }

    if (raw.category === "note") {
      item.isPinned = !!raw.isPinned;
    }

    return item;
  });
}
