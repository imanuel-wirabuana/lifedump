import { create } from "zustand";
import { Item } from "@/lib/types";

export type PendingItem = Omit<Item, "id" | "userId" | "dumpId" | "createdAt" | "updatedAt"> & {
  id?: string;
  needsClarification?: boolean;
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
  clearState: () => set({
    currentInputText: "",
    extractedItems: [],
    dumpStatus: "idle",
    currentDumpId: null,
  })
}));
