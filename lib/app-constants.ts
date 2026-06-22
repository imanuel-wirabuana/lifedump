import type { ItemCategory, TaskData } from "@/types"

export const queryKeys = {
  dumps: (userId: string | null | undefined) => ["dumps", userId] as const,
  dump: (
    dumpId: string | null | undefined,
    userId: string | null | undefined
  ) => ["dump", dumpId, userId] as const,
  items: (userId: string | null | undefined) => ["items", userId] as const,
  itemsByCategory: (userId: string | null | undefined, category: string) =>
    ["items", userId, category] as const,
} as const

export const ITEM_COLLECTIONS: Record<ItemCategory, string> = {
  task: "tasks",
  finance: "finances",
  note: "notes",
}

export const PRIORITY_WEIGHTS: Record<
  NonNullable<TaskData["priority"]>,
  number
> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
}

export const AI_CONFIG = {
  baseUrl: "https://api.kilo.ai/api/gateway",
  model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  timezone: "Asia/Jakarta",
} as const
