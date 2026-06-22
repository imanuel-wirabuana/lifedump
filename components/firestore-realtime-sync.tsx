"use client"

import { useEffect, useRef, type MutableRefObject } from "react"
import { useAuth } from "@clerk/nextjs"
import { useQueryClient } from "@tanstack/react-query"
import { collection, doc, onSnapshot, query } from "firebase/firestore"
import { queryKeys } from "@/lib/app-constants"
import { db } from "@/services/firebase"
import { mapDocToDump, mapDocToItem } from "@/services/queries"
import type { Item, ItemCategory } from "@/types"
import { normalizeSettings, SETTINGS_KEY } from "@/hooks/use-settings"

type ItemRef = MutableRefObject<Item[] | null>
type DatedRecord = { createdAt?: Date }

function sortByCreatedAtDesc<T extends DatedRecord>(items: T[]) {
  return items.sort((a, b) => {
    const timeA = a.createdAt?.getTime() || 0
    const timeB = b.createdAt?.getTime() || 0
    return timeB - timeA
  })
}

export function FirestoreRealtimeSync() {
  const { userId } = useAuth()
  const queryClient = useQueryClient()

  const tasksRef = useRef<Item[] | null>(null)
  const financesRef = useRef<Item[] | null>(null)
  const notesRef = useRef<Item[] | null>(null)

  useEffect(() => {
    if (!userId) {
      tasksRef.current = null
      financesRef.current = null
      notesRef.current = null
      return
    }

    const updateMergedItems = () => {
      if (
        tasksRef.current === null ||
        financesRef.current === null ||
        notesRef.current === null
      ) {
        return
      }

      const merged = sortByCreatedAtDesc([
        ...tasksRef.current,
        ...financesRef.current,
        ...notesRef.current,
      ])
      queryClient.setQueryData(queryKeys.items(userId), merged)
    }

    const createItemListener = (
      collectionName: string,
      category: ItemCategory,
      itemRef: ItemRef
    ) => {
      const itemQuery = query(collection(db, "users", userId, collectionName))

      return onSnapshot(
        itemQuery,
        (snapshot) => {
          const items = snapshot.docs.map((docSnap) =>
            mapDocToItem(docSnap.id, docSnap.data(), category)
          )
          const sortedItems = sortByCreatedAtDesc(items)

          itemRef.current = sortedItems
          queryClient.setQueryData(
            queryKeys.itemsByCategory(userId, category),
            sortedItems
          )
          updateMergedItems()
        },
        (error) => {
          console.error(`Error in ${collectionName} listener:`, error)
        }
      )
    }

    const dumpsQuery = query(collection(db, "users", userId, "dumps"))
    const unsubscribeDumps = onSnapshot(
      dumpsQuery,
      (snapshot) => {
        const dumps = snapshot.docs.map((docSnap) =>
          mapDocToDump(docSnap.id, docSnap.data())
        )
        const sortedDumps = sortByCreatedAtDesc(dumps)

        queryClient.setQueryData(queryKeys.dumps(userId), sortedDumps)
        sortedDumps.forEach((dump) => {
          queryClient.setQueryData(queryKeys.dump(dump.id, userId), dump)
        })
      },
      (error) => {
        console.error("Error in dumps listener:", error)
      }
    )

    const unsubscribeTasks = createItemListener("tasks", "task", tasksRef)
    const unsubscribeFinances = createItemListener(
      "finances",
      "finance",
      financesRef
    )
    const unsubscribeNotes = createItemListener("notes", "note", notesRef)
    const unsubscribeSettings = onSnapshot(
      doc(db, "users", userId, "settings", "app"),
      (snapshot) => {
        if (!snapshot.exists()) return
        window.localStorage.setItem(
          SETTINGS_KEY,
          JSON.stringify(normalizeSettings(snapshot.data()))
        )
      },
      (error) => {
        console.error("Error in settings listener:", error)
      }
    )

    return () => {
      unsubscribeDumps()
      unsubscribeTasks()
      unsubscribeFinances()
      unsubscribeNotes()
      unsubscribeSettings()
    }
  }, [userId, queryClient])

  return null
}
