"use client"

import { useAuth } from "@clerk/nextjs"
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMemo, useState } from "react"
import { Progress } from "@/components/ui/progress"
import {
  DollarSign,
  Plus,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EditDialog } from "@/components/edit-dialog"
import { AddItemDialog } from "@/components/add-item-dialog"
import { Item, ItemCategory } from "@/types"
import { ItemCard, ItemCardSkeleton } from "@/components/item-card"
import {
  useItemsByCategoryQuery,
  useDeleteItemMutation,
} from "@/hooks/use-items"

export default function FinancesPage() {
  const { userId } = useAuth()
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [addCategory, setAddCategory] = useState<ItemCategory | null>(null)

  const { data: records, isLoading } = useItemsByCategoryQuery(
    userId,
    "finance"
  )

  const deleteMutation = useDeleteItemMutation(userId)

  const { expenses, income, totalExpense, totalIncome } = useMemo(() => {
    const expenses: Item[] = []
    const income: Item[] = []
    let totalExpense = 0
    let totalIncome = 0

    for (const record of records || []) {
      const amount = record.finance?.amount || 0

      if (record.finance?.type === "income") {
        income.push(record)
        totalIncome += amount
      } else {
        expenses.push(record)
        totalExpense += amount
      }
    }

    return { expenses, income, totalExpense, totalIncome }
  }, [records])

  const netSavings = totalIncome - totalExpense
  const savingsRate =
    totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0

  if (isLoading) {
    return (
      <div className="ld-page-shell">
        <Skeleton className="h-9 w-28" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-2 p-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  const renderTransactionList = (
    list: typeof expenses,
    emptyMessage: string
  ) => {
    if (list.length === 0) {
      return (
        <Empty className="border-border/40 py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <DollarSign />
            </EmptyMedia>
            <EmptyTitle>No cashflow records</EmptyTitle>
            <EmptyDescription>{emptyMessage}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )
    }

    return (
      <div className="flex flex-col gap-3">
        {list.map((record) => {
          const isExpense = record.finance?.type === "expense"

          return (
            <ItemCard
              key={record.id}
              item={record}
              showTimestamp
              leading={
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border",
                    isExpense
                      ? "border-destructive/20 bg-destructive/10 text-destructive"
                      : "border-primary/20 bg-primary/10 text-primary"
                  )}
                >
                  {isExpense ? (
                    <ArrowDownLeft className="size-4" />
                  ) : (
                    <ArrowUpRight className="size-4" />
                  )}
                </div>
              }
              actions={
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingItem(record)
                      setIsEditOpen(true)
                    }}
                    className="size-7 rounded-md text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      deleteMutation.mutate({
                        id: record.id,
                        category: "finance",
                      })
                    }
                    className="size-7 rounded-md text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              }
              footer={
                <span
                  className={cn(
                    "text-sm font-bold tracking-tight",
                    isExpense ? "text-destructive" : "text-foreground"
                  )}
                >
                  {isExpense ? "-" : "+"} Rp{" "}
                  {record.finance?.amount?.toLocaleString()}
                </span>
              }
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="ld-page-shell">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="ld-page-kicker">Cashflow</p>
          <h1 className="ld-page-title">Finances</h1>
          <p className="ld-page-subtitle">
            Track your expenses, incomes, and net savings progress.
          </p>
        </div>
        <Button
          onClick={() => setAddCategory("finance")}
          className="h-9 gap-1.5 rounded-full px-4 text-xs font-bold shadow-sm"
        >
          <Plus className="size-4" /> Add Transaction
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="ld-glass-card transition-colors hover:border-destructive/10 hover:bg-destructive/5">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
              <span className="size-2 rounded-full bg-destructive" />
              Expenses
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold tracking-tight text-destructive">
              Rp {totalExpense.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="ld-glass-card transition-colors hover:border-emerald-500/10 hover:bg-emerald-500/5">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
              <span className="size-2 rounded-full bg-emerald-500" />
              Income
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold tracking-tight text-emerald-500">
              Rp {totalIncome.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Net Balance & Savings Rate Progress */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Net Cashflow
              </span>
            </div>
            <span
              className={cn(
                "text-base font-bold tracking-tight",
                netSavings >= 0 ? "text-emerald-500" : "text-destructive"
              )}
            >
              {netSavings >= 0 ? "+" : ""}Rp {netSavings.toLocaleString()}
            </span>
          </div>

          {totalIncome > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="size-3 text-emerald-500" />
                  Savings Rate
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    savingsRate >= 0 ? "text-emerald-500" : "text-destructive"
                  )}
                >
                  {savingsRate}%
                </span>
              </div>
              <Progress
                value={Math.max(0, Math.min(100, savingsRate))}
                className="h-1.5"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs Filter */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4 grid w-full max-w-[320px] grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          {renderTransactionList(
            records || [],
            "Dump expenses or incomes on the home input."
          )}
        </TabsContent>

        <TabsContent value="expenses" className="mt-0">
          {renderTransactionList(expenses, "No expense records found.")}
        </TabsContent>

        <TabsContent value="income" className="mt-0">
          {renderTransactionList(income, "No income records found.")}
        </TabsContent>
      </Tabs>

      <EditDialog
        item={editingItem}
        isOpen={isEditOpen}
        onClose={() => {
          setEditingItem(null)
          setIsEditOpen(false)
        }}
      />
      <AddItemDialog
        category={addCategory}
        isOpen={addCategory !== null}
        onClose={() => setAddCategory(null)}
      />
    </div>
  )
}
