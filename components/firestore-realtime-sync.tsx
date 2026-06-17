"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useQueryClient } from "@tanstack/react-query";
import { mapDocToItem, mapDocToDump } from "@/services/queries";
import { Item, Dump } from "@/types";

export function FirestoreRealtimeSync() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const tasksRef = useRef<Item[] | null>(null);
  const financesRef = useRef<Item[] | null>(null);
  const notesRef = useRef<Item[] | null>(null);

  useEffect(() => {
    if (!userId) {
      tasksRef.current = null;
      financesRef.current = null;
      notesRef.current = null;
      return;
    }

    const updateMergedItems = () => {
      if (
        tasksRef.current === null ||
        financesRef.current === null ||
        notesRef.current === null
      ) {
        return;
      }
      const merged = [
        ...tasksRef.current,
        ...financesRef.current,
        ...notesRef.current,
      ].sort((a, b) => {
        const timeA = a.createdAt?.getTime() || 0;
        const timeB = b.createdAt?.getTime() || 0;
        return timeB - timeA;
      });
      queryClient.setQueryData(["items", userId], merged);
    };

    // 1. Dumps listener
    const dumpsQuery = query(collection(db, "users", userId, "dumps"));
    const unsubscribeDumps = onSnapshot(dumpsQuery, (snapshot) => {
      const dumps = snapshot.docs.map((docSnap) =>
        mapDocToDump(docSnap.id, docSnap.data())
      );
      const sortedDumps = dumps.sort((a, b) => {
        const timeA = a.createdAt?.getTime() || 0;
        const timeB = b.createdAt?.getTime() || 0;
        return timeB - timeA;
      });
      queryClient.setQueryData(["dumps", userId], sortedDumps);
      sortedDumps.forEach((dump) => {
        queryClient.setQueryData(["dump", dump.id, userId], dump);
      });
    }, (error) => {
      console.error("Error in dumps listener:", error);
    });

    // 2. Tasks listener
    const tasksQuery = query(collection(db, "users", userId, "tasks"));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasks = snapshot.docs.map((docSnap) =>
        mapDocToItem(docSnap.id, docSnap.data(), "task")
      );
      const sortedTasks = tasks.sort((a, b) => {
        const timeA = a.createdAt?.getTime() || 0;
        const timeB = b.createdAt?.getTime() || 0;
        return timeB - timeA;
      });
      tasksRef.current = sortedTasks;
      queryClient.setQueryData(["items", userId, "task"], sortedTasks);
      updateMergedItems();
    }, (error) => {
      console.error("Error in tasks listener:", error);
    });

    // 3. Finances listener
    const financesQuery = query(collection(db, "users", userId, "finances"));
    const unsubscribeFinances = onSnapshot(financesQuery, (snapshot) => {
      const finances = snapshot.docs.map((docSnap) =>
        mapDocToItem(docSnap.id, docSnap.data(), "finance")
      );
      const sortedFinances = finances.sort((a, b) => {
        const timeA = a.createdAt?.getTime() || 0;
        const timeB = b.createdAt?.getTime() || 0;
        return timeB - timeA;
      });
      financesRef.current = sortedFinances;
      queryClient.setQueryData(["items", userId, "finance"], sortedFinances);
      updateMergedItems();
    }, (error) => {
      console.error("Error in finances listener:", error);
    });

    // 4. Notes listener
    const notesQuery = query(collection(db, "users", userId, "notes"));
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const notes = snapshot.docs.map((docSnap) =>
        mapDocToItem(docSnap.id, docSnap.data(), "note")
      );
      const sortedNotes = notes.sort((a, b) => {
        const timeA = a.createdAt?.getTime() || 0;
        const timeB = b.createdAt?.getTime() || 0;
        return timeB - timeA;
      });
      notesRef.current = sortedNotes;
      queryClient.setQueryData(["items", userId, "note"], sortedNotes);
      updateMergedItems();
    }, (error) => {
      console.error("Error in notes listener:", error);
    });

    return () => {
      unsubscribeDumps();
      unsubscribeTasks();
      unsubscribeFinances();
      unsubscribeNotes();
    };
  }, [userId, queryClient]);

  return null;
}
