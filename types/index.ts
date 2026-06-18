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
  paymentMethod?: string | null;
  isPinned?: boolean;
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

export type ItemSource = "manual" | "ai";

export type Item = {
  id: string;
  userId: string;
  dumpId?: string;
  category: ItemCategory;
  title: string;
  content: string;
  tags?: string[];
  source: ItemSource;
  task?: {
    dueAt?: Date;
    isCompleted: boolean;
    priority?: "none" | "low" | "medium" | "high";
  };
  finance?: {
    type: "expense" | "income";
    amount: number;
    currency: "IDR";
    occurredAt: Date;
    paymentMethod?: string;
  };
  note?: {
    noteType: "journal" | "general";
  };
  isPinned?: boolean;
  aiConfidence?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ItemPatch = Partial<Pick<Item, "title" | "content" | "tags" | "source" | "task" | "finance" | "note" | "isPinned" | "aiConfidence">>;
