"use client";

import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Trash2, ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditDialog } from "@/components/edit-dialog";
import { Item } from "@/types";
import { useItemsByCategoryQuery, useDeleteItemMutation } from "@/hooks/use-items";

export default function FinancesPage() {
  const { userId } = useAuth();
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: records, isLoading } = useItemsByCategoryQuery(userId, "finance");

  const deleteMutation = useDeleteItemMutation(userId);

  if (isLoading) {
    return (
      <div className="flex flex-col p-4 md:p-8 max-w-2xl mx-auto w-full pt-8 gap-6">
        <Skeleton className="h-9 w-28" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-6 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const expenses = records?.filter((r) => r.finance?.type === "expense") || [];
  const income = records?.filter((r) => r.finance?.type === "income") || [];

  const totalExpense = expenses.reduce((acc, r) => acc + (r.finance?.amount || 0), 0);
  const totalIncome = income.reduce((acc, r) => acc + (r.finance?.amount || 0), 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  const renderTransactionList = (list: typeof expenses, emptyMessage: string) => {
    if (list.length === 0) {
      return (
        <Empty className="py-12 border-border/40">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <DollarSign />
            </EmptyMedia>
            <EmptyTitle>No cashflow records</EmptyTitle>
            <EmptyDescription>{emptyMessage}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {list.map((record) => {
          const isExpense = record.finance?.type === "expense";

          return (
            <Card key={record.id} className="border-border/50 shadow-sm hover:border-border transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "size-8 shrink-0 flex items-center justify-center rounded-full border",
                      isExpense
                        ? "text-destructive bg-destructive/10 border-destructive/20"
                        : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                    )}
                  >
                    {isExpense ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate max-w-[280px] md:max-w-[360px]">{record.title}</p>
                    {record.content && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[280px] md:max-w-[360px]">{record.content}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(record.finance?.occurredAt || record.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cn(
                      "text-sm font-bold tracking-tight",
                      isExpense ? "text-destructive" : "text-emerald-500"
                    )}
                  >
                    {isExpense ? "-" : "+"} Rp {record.finance?.amount?.toLocaleString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingItem(record);
                      setIsEditOpen(true);
                    }}
                    className="text-muted-foreground hover:text-foreground size-7 rounded-md"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate({ id: record.id, category: "finance" })}
                    className="text-muted-foreground hover:text-destructive size-7 rounded-md"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col p-4 md:p-8 max-w-2xl mx-auto w-full pt-8 gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finances</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your expenses, incomes, and net savings progress.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/60 hover:bg-destructive/5 hover:border-destructive/10 transition-colors">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
              <span className="size-2 rounded-full bg-destructive" />
              Expenses
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-destructive tracking-tight">Rp {totalExpense.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:bg-emerald-500/5 hover:border-emerald-500/10 transition-colors">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
              <span className="size-2 rounded-full bg-emerald-500" />
              Income
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-emerald-500 tracking-tight">Rp {totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Net Balance & Savings Rate Progress */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Net Cashflow</span>
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
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="size-3 text-emerald-500" />
                  Savings Rate
                </span>
                <span className={cn("font-semibold", savingsRate >= 0 ? "text-emerald-500" : "text-destructive")}>
                  {savingsRate}%
                </span>
              </div>
              <Progress value={Math.max(0, Math.min(100, savingsRate))} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs Filter */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[320px] mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          {renderTransactionList(records || [], "Dump expenses or incomes on the home input.")}
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
          setEditingItem(null);
          setIsEditOpen(false);
        }}
      />
    </div>
  );
}
