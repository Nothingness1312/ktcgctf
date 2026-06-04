import React from 'react'
import { Label, Input, Textarea, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import { MarkdownRenderer } from '@/shared/markdown/MarkdownRenderer'
import { Flag as FlagIcon, Loader2, X as XIcon, Zap, Type } from 'lucide-react'
import { ChallengeFormData } from '../../types'
import { cn } from '@/shared/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { parseNxctlService, serializeNxctlService, type NxctlServiceOptions } from '@/features/challenges/lib/nxctl-services'
import {
  ADMIN_INPUT_CLASS,
  ADMIN_MUTED_INPUT_CLASS,
  ADMIN_TEXTAREA_CLASS,
} from '@/features/admin/ui/form-field-styles'

interface ContentSectionProps {
  formData: ChallengeFormData
  onChange: (data: ChallengeFormData) => void
  showPreview: boolean
  setShowPreview: (v: boolean) => void
  flagLoading: boolean
  handleViewFlag: () => void
  editing: boolean
}

type NxctlServiceQuickPick = {
  id: string
  name: string
  key: string
  source: 'platform' | 'live' | 'both'
  enabled: boolean | null
  keyAvailable: boolean | null
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
  }

  return ''
}

function firstBoolean(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['true', '1', 'yes', 'enabled'].includes(normalized)) return true
      if (['false', '0', 'no', 'disabled'].includes(normalized)) return false
    }
  }

  return null
}

function getRuntimeName(item: any) {
  return firstString(item?.name, item?.challenge?.name)
}

function getPlatformName(item: Record<string, unknown>) {
  return firstString(
    item.service,
    item.service_name,
    item.challenge,
    item.challenge_name,
    item.name
  )
}

function mergeQuickPick(
  picks: Map<string, NxctlServiceQuickPick>,
  pick: Omit<NxctlServiceQuickPick, 'id'>
) {
  const id = `${pick.name.toLowerCase()}:${pick.key.toLowerCase()}`
  const current = picks.get(id)
  if (!current) {
    picks.set(id, { ...pick, id })
    return
  }

  picks.set(id, {
    ...current,
    ...pick,
    key: current.key || pick.key,
    source: current.source === pick.source ? current.source : 'both',
    enabled: current.enabled ?? pick.enabled,
    keyAvailable: current.keyAvailable ?? pick.keyAvailable,
  })
}

export const ContentSection: React.FC<ContentSectionProps> = ({
  formData,
  onChange,
  showPreview,
  setShowPreview,
  flagLoading,
  handleViewFlag,
  editing
}) => {
  const [quickPickOptions, setQuickPickOptions] = React.useState<NxctlServiceQuickPick[]>([])
  const [quickPickLoading, setQuickPickLoading] = React.useState(false)
  const [quickPickValue, setQuickPickValue] = React.useState<string | undefined>()

  const updateService = (index: number, patch: Partial<{ name: string; key: string; options: NxctlServiceOptions }>) => {
    const current = parseNxctlService(formData.services[index] || '')
    const next = [...formData.services]
    next[index] = serializeNxctlService({ ...current, ...patch })
    onChange({ ...formData, services: next })
  }

  React.useEffect(() => {
    let mounted = true

    const loadQuickPicks = async () => {
      setQuickPickLoading(true)

      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) return

        const headers = { Authorization: `Bearer ${accessToken}` }
        const [platformRes, liveRes] = await Promise.all([
          fetch('/api/nxctl?action=admin-challenges', { headers }),
          fetch('/api/nxctl?action=live-services', { headers }),
        ])
        const [platformData, liveData] = await Promise.all([
          platformRes.ok ? platformRes.json() : Promise.resolve([]),
          liveRes.ok ? liveRes.json() : Promise.resolve([]),
        ])
        const picks = new Map<string, NxctlServiceQuickPick>()

        if (Array.isArray(platformData)) {
          platformData.forEach((item) => {
            const record = item && typeof item === 'object' ? item as Record<string, unknown> : {}
            const name = getPlatformName(record)
            if (!name) return

            mergeQuickPick(picks, {
              name,
              key: firstString(record.key, record.challenge_key, record.access_key),
              source: 'platform',
              enabled: firstBoolean(record.enabled, record.is_enabled, record.active, record.is_active),
              keyAvailable: firstBoolean(record.key_available, record.keyAvailable),
            })
          })
        }

        if (Array.isArray(liveData)) {
          liveData.forEach((item) => {
            const name = getRuntimeName(item)
            if (!name) return

            mergeQuickPick(picks, {
              name,
              key: '',
              source: 'live',
              enabled: null,
              keyAvailable: null,
            })
          })
        }

        if (!mounted) return
        setQuickPickOptions(Array.from(picks.values()).sort((a, b) => a.name.localeCompare(b.name)))
      } catch (error) {
        if (mounted) setQuickPickOptions([])
      } finally {
        if (mounted) setQuickPickLoading(false)
      }
    }

    void loadQuickPicks()

    return () => {
      mounted = false
    }
  }, [])

  const applyQuickPick = (id: string) => {
    const pick = quickPickOptions.find((item) => item.id === id)
    if (!pick) return

    const serialized = serializeNxctlService({ name: pick.name, key: pick.key })
    const alreadyExists = formData.services.some((rawService) => {
      const service = parseNxctlService(rawService)
      return service.name === pick.name && service.key === pick.key
    })

    if (!alreadyExists) {
      onChange({ ...formData, services: [...formData.services, serialized] })
    }

    setQuickPickValue(undefined)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="md:col-span-2">
        <div className="flex items-center justify-between">
          <Label>Deskripsi</Label>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>{showPreview ? 'Edit' : 'Preview'}</Button>
        </div>
        {showPreview ? (
          <div className="border rounded p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <MarkdownRenderer content={formData.description || '*No description provided*'} />
          </div>
        ) : (
          <Textarea required rows={5} value={formData.description} onChange={e => onChange({ ...formData, description: e.target.value })} className={ADMIN_TEXTAREA_CLASS} />
        )}
      </div>
      <div className="md:col-span-2">
        <Label>Flag</Label>
        <div className="flex gap-2 pointer-events-auto items-center">
          <Input
            required={!editing}
            value={formData.flag}
            onChange={e => onChange({ ...formData, flag: e.target.value })}
            placeholder={editing ? 'Leave blank to keep current' : 'ctf{...}'}
            className={ADMIN_INPUT_CLASS}
          />
          <div className="flex items-center gap-1 border-l pl-2 dark:border-gray-700">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange({ ...formData, flag_placeholder: !formData.flag_placeholder })}
              className={cn(
                "h-8 px-2 flex items-center gap-1.5 transition-all rounded-md",
                formData.flag_placeholder
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                  : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 border border-transparent"
              )}
              title={formData.flag_placeholder ? "Using Flag Placeholder" : "Using Static Flag"}
            >
              {formData.flag_placeholder ? <Zap size={14} className="fill-current" /> : <Type size={14} />}
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                {formData.flag_placeholder ? "Placeholder" : "Static"}
              </span>
            </Button>
            <Button
              aria-label="Show flag"
              title="Show flag"
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleViewFlag()}
              disabled={flagLoading || (!editing && !formData.flag)}
              className="flex-none pointer-events-auto text-gray-800 dark:text-gray-200 h-8 w-8"
            >
              {flagLoading ? <Loader2 size={18} className="animate-spin" /> : <FlagIcon size={18} />}
            </Button>
          </div>
        </div>
      </div>
      <div className="md:col-span-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Label>NXCTL Services</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={quickPickValue}
              onValueChange={(value) => {
                setQuickPickValue(value)
                applyQuickPick(value)
              }}
              disabled={quickPickLoading || quickPickOptions.length === 0}
            >
              <SelectTrigger className="h-8 min-w-[230px] rounded-lg text-xs">
                <SelectValue placeholder={quickPickLoading ? 'Loading NXCTL services...' : 'Quick add from NXCTL'} />
              </SelectTrigger>
              <SelectContent>
                {quickPickOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}{option.key ? ` - ${option.key}` : ''} ({option.source})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...formData, services: [...formData.services, ''] })}>+ Add Service</Button>
          </div>
        </div>
        {formData.services.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No CTFC services added</p>}
        <div className="space-y-2 mt-2">
          {formData.services.map((rawService, idx) => {
            const service = parseNxctlService(rawService)
            const isSshService = service.options.type === 'ssh'

            return (
              <div key={idx} className="rounded-xl border border-gray-200/70 bg-gray-50/40 p-2 dark:border-gray-800/80 dark:bg-gray-900/20">
                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_auto]">
                  <Input
                    value={service.name}
                    onChange={e => updateService(idx, { name: e.target.value })}
                    placeholder="service-name"
                    className={ADMIN_MUTED_INPUT_CLASS}
                  />
                  <Input
                    value={service.key}
                    onChange={e => updateService(idx, { key: e.target.value })}
                    placeholder="challenge key (optional)"
                    type="password"
                    className={ADMIN_MUTED_INPUT_CLASS}
                  />
                  <Select
                    value={isSshService ? 'ssh' : 'default'}
                    onValueChange={(value) => updateService(idx, {
                      options: value === 'ssh'
                        ? { ...service.options, type: 'ssh' }
                        : {},
                    })}
                  >
                    <SelectTrigger className={ADMIN_MUTED_INPUT_CLASS}>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="ssh">SSH</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Remove service"
                    title="Remove service"
                    onClick={() => onChange({ ...formData, services: formData.services.filter((_, i) => i !== idx) })}
                  >
                    <XIcon size={14} />
                  </Button>
                </div>
                {isSshService && (
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      value={service.options.user || ''}
                      onChange={e => updateService(idx, { options: { ...service.options, type: 'ssh', user: e.target.value } })}
                      placeholder="ssh user"
                      className={ADMIN_MUTED_INPUT_CLASS}
                    />
                    <Input
                      value={service.options.pass || ''}
                      onChange={e => updateService(idx, { options: { ...service.options, type: 'ssh', pass: e.target.value } })}
                      placeholder="ssh password (optional)"
                      type="password"
                      className={ADMIN_MUTED_INPUT_CLASS}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
