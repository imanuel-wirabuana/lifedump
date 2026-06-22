import { create } from "zustand";
import { ItemCategory } from "@/types";

export type PendingItem = {
  id?: string;
  category: ItemCategory;
  title: string;
  content?: string;
  tags?: string[];
  source?: "manual" | "ai";
  aiConfidence?: number;
  needsClarification?: boolean;
  task?: {
    isCompleted: boolean;
    dueAt?: Date;
    priority?: "none" | "low" | "medium" | "high";
  };
  finance?: {
    type: "expense" | "income";
    amount: number;
    currency: "IDR";
    occurredAt?: Date;
    paymentMethod?: string;
  };
  isPinned?: boolean;
};

interface DumpStore {
  currentInputText: string;
  setCurrentInputText: (text: string) => void;
  extractedItems: PendingItem[];
  setExtractedItems: (items: PendingItem[]) => void;
  dumpStatus: "idle" | "processing" | "needs_review" | "failed";
  setDumpStatus: (status: "idle" | "processing" | "needs_review" | "failed") => void;
  currentDumpId: string | null;
  setCurrentDumpId: (id: string | null) => void;
  clearState: () => void;
}

export const useDumpStore = create<DumpStore>((set) => ({
  currentInputText: "",
  setCurrentInputText: (text) => set({ currentInputText: text }),
  extractedItems: [],
  setExtractedItems: (items) => set({ extractedItems: items }),
  dumpStatus: "idle",
  setDumpStatus: (status) => set({ dumpStatus: status }),
  currentDumpId: null,
  setCurrentDumpId: (id) => set({ currentDumpId: id }),
  clearState: () =>
    set({
      currentInputText: "",
      extractedItems: [],
      dumpStatus: "idle",
      currentDumpId: null,
    }),
}));
