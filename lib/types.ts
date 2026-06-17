export type DumpSourceType = "text" | "image" | "voice";

export type DumpStatus = "queued" | "processing" | "needs_review" | "confirmed" | "failed";

export type Dump = {
  id: string;
  userId: string;
  sourceType: DumpSourceType;
  rawText?: string;
  transcript?: string;
  mediaPath?: string;
  status: DumpStatus;
  extractedItems?: any[] | null;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ItemCategory = "task" | "finance" | "note";

export type Item = {
  id: string;
  userId: string;
  dumpId: string;
  category: ItemCategory;
  title: string;
  content: string;
  task?: {
    dueAt?: Date;
    isCompleted: boolean;
  };
  finance?: {
    type: "expense" | "income";
    amount: number;
    currency: "IDR";
    occurredAt: Date;
  };
  note?: {
    noteType: "journal" | "general";
  };
  aiConfidence?: number;
  createdAt: Date;
  updatedAt: Date;
};
