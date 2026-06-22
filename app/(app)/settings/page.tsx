"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Bot,
  Check,
  DownloadCloud,
  Eye,
  EyeOff,
  Keyboard,
  List,
  Loader2,
  Moon,
  PlugZap,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group"
import { useTheme } from "@/components/theme-provider"
import { defaultSettings, useSettings } from "@/hooks/use-settings"

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme()
  const { settings, setSettings, resetSettings } = useSettings()
  const [models, setModels] = useState<string[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isTestingModel, setIsTestingModel] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  const isDark = resolvedTheme === "dark"

  const loadModels = useCallback(
    async (showToast = false) => {
      if (settings.aiModelMode !== "models") return

      setIsLoadingModels(true)
      try {
        const response = await fetch("/api/ai/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseUrl: settings.aiBaseUrl,
            apiKey: settings.aiApiKey,
          }),
        })

        const data = (await response.json()) as {
          models?: string[]
          error?: string
        }

        if (!response.ok) {
          throw new Error(data.error || "Failed to load models")
        }

        setModels(data.models || [])
        if (showToast) {
          toast.success(`Loaded ${(data.models || []).length} models`)
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load models"
        )
      } finally {
        setIsLoadingModels(false)
      }
    },
    [settings.aiApiKey, settings.aiBaseUrl, settings.aiModelMode]
  )

  useEffect(() => {
    if (settings.aiModelMode !== "models") return

    queueMicrotask(() => {
      void loadModels(false)
    })
  }, [loadModels, settings.aiModelMode])

  async function testModelConnection() {
    setIsTestingModel(true)
    try {
      const response = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: settings.aiBaseUrl,
          apiKey: settings.aiApiKey,
          model: settings.aiModel,
        }),
      })

      const data = (await response.json()) as {
        ok?: boolean
        output?: string
        error?: string
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Model test failed")
      }

      toast.success(`Model connected${data.output ? `: ${data.output}` : ""}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Model test failed")
    } finally {
      setIsTestingModel(false)
    }
  }

  return (
    <div className="ld-page-shell">
      <div>
        <p className="ld-page-kicker">Control room</p>
        <h1 className="ld-page-title">Settings</h1>
        <p className="ld-page-subtitle">
          Tune the interface, AI endpoint, model, and suggested workflow
          preferences.
        </p>
      </div>

      <Card className="ld-glass-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4 p-4">
          <div>
            <CardDescription className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
              <Moon className="size-3.5" /> Appearance
            </CardDescription>
            <h2 className="mt-1 font-bold">Dark mode</h2>
          </div>
          <div className="flex items-center gap-3 rounded-full border bg-muted/40 px-3 py-2">
            <Sun className="size-4 text-amber-500" />
            <Switch
              checked={isDark}
              onCheckedChange={(checked) =>
                setTheme(checked ? "dark" : "light")
              }
            />
            <Moon className="size-4 text-indigo-400" />
          </div>
        </CardHeader>
      </Card>

      <Card className="ld-glass-card overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <CardDescription className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
            <Bot className="size-3.5" /> Custom AI
          </CardDescription>
          <h2 className="font-bold">OpenAI-compatible endpoint</h2>
          <p className="text-xs text-muted-foreground">
            Base URL, API key, and model are saved to your Firebase profile.
            Requests use your custom key first, then the server fallback key.
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ai-base-url">Base URL</FieldLabel>
              <Input
                id="ai-base-url"
                value={settings.aiBaseUrl}
                placeholder={defaultSettings.aiBaseUrl}
                onChange={(event) =>
                  setSettings({ aiBaseUrl: event.target.value })
                }
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="ai-api-key">API key</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="ai-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={settings.aiApiKey}
                  placeholder="sk-..."
                  autoComplete="off"
                  onChange={(event) =>
                    setSettings({ aiApiKey: event.target.value })
                  }
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    onClick={() => setShowApiKey((value) => !value)}
                    aria-label={showApiKey ? "Hide API key" : "Show API key"}
                  >
                    {showApiKey ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Saved to your user settings in Firebase. Use only gateways and
                devices you trust.
              </FieldDescription>
            </Field>

            <Field>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <FieldLabel htmlFor="ai-model">Model</FieldLabel>
                <div className="grid grid-cols-2 rounded-full border bg-muted/40 p-1 text-xs">
                  <Button
                    type="button"
                    variant={
                      settings.aiModelMode === "manual" ? "secondary" : "ghost"
                    }
                    size="sm"
                    onClick={() => setSettings({ aiModelMode: "manual" })}
                    className="h-7 gap-1.5 rounded-full px-3"
                  >
                    <Keyboard className="size-3.5" /> Manual
                  </Button>
                  <Button
                    type="button"
                    variant={
                      settings.aiModelMode === "models" ? "secondary" : "ghost"
                    }
                    size="sm"
                    onClick={() => setSettings({ aiModelMode: "models" })}
                    className="h-7 gap-1.5 rounded-full px-3"
                  >
                    <List className="size-3.5" /> /models
                  </Button>
                </div>
              </div>

              {settings.aiModelMode === "manual" ? (
                <div className="flex flex-col gap-2">
                  <Input
                    id="ai-model"
                    value={settings.aiModel}
                    placeholder={defaultSettings.aiModel}
                    onChange={(event) =>
                      setSettings({ aiModel: event.target.value })
                    }
                  />
                  <FieldDescription>
                    Optional. Leave blank to use the default model fallback.
                  </FieldDescription>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {models.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <Select
                        value={settings.aiModel}
                        onValueChange={(value) =>
                          setSettings({ aiModel: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select retrieved model" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void loadModels(true)}
                        disabled={isLoadingModels}
                        className="h-8 gap-2 rounded-full text-xs"
                      >
                        <DownloadCloud className="size-3.5" />
                        Refresh models
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void loadModels(true)}
                        disabled={isLoadingModels}
                        className="h-8 gap-2 rounded-full text-xs"
                      >
                        <DownloadCloud className="size-3.5" />
                        {isLoadingModels
                          ? "Loading models..."
                          : "Retrieve models"}
                      </Button>
                      <FieldDescription>
                        Models load automatically from the configured gateway.
                      </FieldDescription>
                    </div>
                  )}
                </div>
              )}
            </Field>

            <Field>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void testModelConnection()}
                disabled={isTestingModel}
                className="h-9 w-full gap-2 rounded-full text-xs"
              >
                {isTestingModel ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <PlugZap className="size-3.5" />
                )}
                {isTestingModel
                  ? "Testing connection..."
                  : "Test model connection"}
              </Button>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="ld-glass-card overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <CardDescription className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
            <Sparkles className="size-3.5" /> Suggested settings
          </CardDescription>
          <h2 className="font-bold">Workflow preferences</h2>
        </CardHeader>
        <CardContent className="divide-y p-0">
          <SettingRow
            icon={<Sparkles className="size-4" />}
            title="Auto-enhance drafts"
            description="Preference saved for future composer automation. Manual Enhance is available now."
            checked={settings.autoEnhance}
            onCheckedChange={(checked) => setSettings({ autoEnhance: checked })}
          />
          <SettingRow
            icon={<Settings2 className="size-4" />}
            title="Show capture hints"
            description="Keep helper copy visible around the quick capture input."
            checked={settings.showCaptureHints}
            onCheckedChange={(checked) =>
              setSettings({ showCaptureHints: checked })
            }
          />
          <SettingRow
            icon={<Check className="size-4" />}
            title="Compact lists"
            description="Preference saved for denser task, note, and finance views."
            checked={settings.compactLists}
            onCheckedChange={(checked) =>
              setSettings({ compactLists: checked })
            }
          />
          <SettingRow
            icon={<ShieldCheck className="size-4" />}
            title="Confirm destructive actions"
            description="Prefer confirmation before deletes and risky edits."
            checked={settings.confirmDestructiveActions}
            onCheckedChange={(checked) =>
              setSettings({ confirmDestructiveActions: checked })
            }
          />
        </CardContent>
      </Card>

      <Button
        type="button"
        variant="outline"
        onClick={() => {
          resetSettings()
          setModels([])
          toast.success("Settings reset")
        }}
        className="w-full gap-2 rounded-full"
      >
        <RotateCcw className="size-4" /> Reset settings
      </Button>
    </div>
  )
}

function SettingRow({
  icon,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
