import {
  CheckSquare,
  DollarSign,
  FileText,
  type LucideIcon,
} from "lucide-react"
import type { ItemCategory } from "@/types"
export {
  AI_CONFIG,
  ITEM_COLLECTIONS,
  PRIORITY_WEIGHTS,
  queryKeys,
} from "@/lib/app-constants"

export interface CategoryConfig {
  icon: LucideIcon
  badgeVariant: "outline" | "secondary" | "default"
  label: string
}

export const CATEGORY_CONFIG: Record<ItemCategory, CategoryConfig> = {
  task: {
    icon: CheckSquare,
    badgeVariant: "outline",
    label: "Task",
  },
  finance: {
    icon: DollarSign,
    badgeVariant: "secondary",
    label: "Finance",
  },
  note: {
    icon: FileText,
    badgeVariant: "default",
    label: "Note",
  },
}
