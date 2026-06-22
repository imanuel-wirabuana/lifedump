"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore"
import { AI_CONFIG } from "@/lib/app-constants"
import { db } from "@/services/firebase"

export type AppSettings = {
  aiBaseUrl: string
  aiApiKey: string
  aiModel: string
  aiModelMode: "manual" | "models"
  autoEnhance: boolean
  showCaptureHints: boolean
  compactLists: boolean
  confirmDestructiveActions: boolean
}

export type AiRequestSettings = Pick<
  AppSettings,
  "aiBaseUrl" | "aiApiKey" | "aiModel"
>

export const SETTINGS_KEY = "lifedump-settings"

export const defaultSettings: AppSettings = {
  aiBaseUrl: AI_CONFIG.baseUrl,
  aiApiKey: "",
  aiModel: AI_CONFIG.model,
  aiModelMode: "models",
  autoEnhance: false,
  showCaptureHints: true,
  compactLists: false,
  confirmDestructiveActions: true,
}

export function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return defaultSettings

  const record = value as Partial<AppSettings>

  return {
    aiBaseUrl:
      typeof record.aiBaseUrl === "string" && record.aiBaseUrl.trim()
        ? record.aiBaseUrl.trim()
        : defaultSettings.aiBaseUrl,
    aiApiKey:
      typeof record.aiApiKey === "string"
        ? record.aiApiKey
        : defaultSettings.aiApiKey,
    aiModel:
      typeof record.aiModel === "string" && record.aiModel.trim()
        ? record.aiModel.trim()
        : defaultSettings.aiModel,
    aiModelMode:
      record.aiModelMode === "manual" || record.aiModelMode === "models"
        ? record.aiModelMode
        : defaultSettings.aiModelMode,
    autoEnhance:
      typeof record.autoEnhance === "boolean"
        ? record.autoEnhance
        : defaultSettings.autoEnhance,
    showCaptureHints:
      typeof record.showCaptureHints === "boolean"
        ? record.showCaptureHints
        : defaultSettings.showCaptureHints,
    compactLists:
      typeof record.compactLists === "boolean"
        ? record.compactLists
        : defaultSettings.compactLists,
    confirmDestructiveActions:
      typeof record.confirmDestructiveActions === "boolean"
        ? record.confirmDestructiveActions
        : defaultSettings.confirmDestructiveActions,
  }
}

function readSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings

  try {
    return normalizeSettings(
      JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "null")
    )
  } catch {
    return defaultSettings
  }
}

export function getAiRequestSettings(): AiRequestSettings {
  const { aiBaseUrl, aiApiKey, aiModel } = readSettings()
  return { aiBaseUrl, aiApiKey, aiModel }
}

export function useSettings() {
  const { userId } = useAuth()
  const [settings, setSettingsState] =
    React.useState<AppSettings>(defaultSettings)

  React.useEffect(() => {
    if (!userId) {
      queueMicrotask(() => {
        setSettingsState(defaultSettings)
      })
      return
    }

    queueMicrotask(() => {
      setSettingsState(readSettings())
    })

    const settingsRef = doc(db, "users", userId, "settings", "app")
    return onSnapshot(
      settingsRef,
      (snapshot) => {
        const next = normalizeSettings(
          snapshot.exists() ? snapshot.data() : null
        )
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
        setSettingsState(next)
      },
      (error) => {
        console.error("Settings listener error:", error)
      }
    )
  }, [userId])

  const setSettings = React.useCallback(
    (next: Partial<AppSettings>) => {
      setSettingsState((current) => {
        const updated = normalizeSettings({ ...current, ...next })
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
        window.dispatchEvent(
          new CustomEvent("lifedump-settings-change", { detail: updated })
        )
        if (userId) {
          void setDoc(
            doc(db, "users", userId, "settings", "app"),
            { ...updated, updatedAt: serverTimestamp() },
            { merge: true }
          )
        }
        return updated
      })
    },
    [userId]
  )

  const resetSettings = React.useCallback(() => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings))
    window.dispatchEvent(
      new CustomEvent("lifedump-settings-change", { detail: defaultSettings })
    )
    if (userId) {
      void setDoc(
        doc(db, "users", userId, "settings", "app"),
        { ...defaultSettings, updatedAt: serverTimestamp() },
        { merge: true }
      )
    }
    setSettingsState(defaultSettings)
  }, [userId])

  return { settings, setSettings, resetSettings }
}
