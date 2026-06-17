import { PendingItem } from "@/stores/use-dump-store";

export function mapApiItemsToPendingItems(apiItems: any[]): PendingItem[] {
  return (apiItems || []).map((raw: any) => {
    const item: PendingItem = {
      category: raw.category,
      title: raw.title,
      content: raw.content || "",
      aiConfidence: raw.confidence,
      needsClarification: raw.needsClarification,
    };

    if (raw.category === "task") {
      item.task = {
        isCompleted: false,
        dueAt: raw.dueAt ? new Date(raw.dueAt) : undefined,
      };
    }

    if (raw.category === "finance") {
      item.finance = {
        type: raw.financeType || "expense",
        amount: raw.amount || 0,
        currency: "IDR",
        occurredAt: raw.occurredAt ? new Date(raw.occurredAt) : new Date(),
      };
    }

    if (raw.category === "note") {
      item.note = {
        noteType: "general",
      };
    }

    return item;
  });
}
