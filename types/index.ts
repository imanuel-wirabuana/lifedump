export type DumpSourceType = "text" | "image" | "voice";

export type DumpStatus = "processing" | "needs_review" | "confirmed" | "failed";

export type ExtractedItem = {
  category: ItemCategory;
  title: string;
  content?: string;
  confidence?: number;
  needsClarification?: boolean;
  dueAt?: string | null;
  priority?: "none" | "low" | "medium" | "high";
  tags?: string[];
  source?: "manual" | "ai";
  financeType?: "expense" | "income" | null;
  amount?: number | null;
  occurredAt?: string | null;
};

export type Dump = {
  id: string;
  userId: string;
  sourceType: DumpSourceType;
  rawText?: string;
  transcript?: string;
  mediaPath?: string;
  status: DumpStatus;
  extractedItems?: ExtractedItem[] | null;
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
    priority?: "none" | "low" | "medium" | "high";
    tags?: string[];
    source?: "manual" | "ai";
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

export type ItemPatch = Partial<Pick<Item, "title" | "content" | "task" | "finance" | "note" | "aiConfidence">>;
