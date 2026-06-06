"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Clock, Loader2, Play, Power, PowerOff, RefreshCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { SURFACE_GLASS_CARD_COMPACT_CLASS } from '@/shared/styles'
import { parseNxctlService, type NxctlServiceEntry } from '../lib/nxctl-services'

type ServiceAction = 'up' | 'restart' | 'extend'
type ServiceActionLoadingState = ServiceAction | null
const CHALLENGE_KEY_HEADER = 'X-NXCTL-Challenge-Key'
const EXTEND_REMINDER_SOUND = '/sounds/notif_ringtone.mp3'
const EXTEND_REMINDER_VOLUME = 0.25
const EXTEND_FINAL_REMINDER_INTERVAL_MS = 15000

interface ChallengeServicesPanelProps {
  open: boolean
  services?: string[]
}

const buildNxctlHeaders = (service: NxctlServiceEntry, json = false) => {
  const headers: Record<string, string> = {}
  if (json) headers['Content-Type'] = 'application/json'
  if (service.key) headers[CHALLENGE_KEY_HEADER] = service.key
  return headers
}

const buildNxctlStatusHeaders = (services: NxctlServiceEntry[]) => {
  const headers: Record<string, string> = {}
  const keys = Array.from(new Set(
    services
      .map((service) => service.key?.trim())
      .filter((key): key is string => Boolean(key))
  ))

  if (keys.length > 0) {
    headers[CHALLENGE_KEY_HEADER] = keys.join(',')
  }

  return headers
}

const buildNxctlStatusUrl = (services: NxctlServiceEntry[]) => {
  const params = new URLSearchParams({ action: 'status' })
  const names = Array.from(new Set(
    services
      .map((service) => service.name.trim())
      .filter(Boolean)
  ))

  if (names.length > 0) {
    params.set('filter', names.join(','))
  }

  return `/api/nxctl?${params.toString()}`
}

const getExportEndpoint = (item: any) => String(item?.endpoint || item?.url || '').trim()

const isTcpEndpoint = (item: any, fallbackType?: string) => {
  const endpoint = getExportEndpoint(item).toLowerCase()
  const type = String(item?.type || fallbackType || '').toLowerCase()
  return type === 'tcp' || endpoint.startsWith('tcp://')
}

const parseTcpEndpoint = (endpoint: string) => {
  const match = endpoint.match(/^tcp:\/\/([^/:]+):(\d+)/i)
  if (match) return { host: match[1], port: match[2] }

  const fallbackMatch = endpoint.match(/^([^/:]+):(\d+)$/i)
  return fallbackMatch ? { host: fallbackMatch[1], port: fallbackMatch[2] } : null
}

const toTcpCommand = (endpoint: string) => {
  const parsed = parseTcpEndpoint(endpoint)
  return parsed ? `nc ${parsed.host} ${parsed.port}` : endpoint
}

const toSshCommand = (endpoint: string, user?: string) => {
  const parsed = parseTcpEndpoint(endpoint)
  if (!parsed) return endpoint

  const username = user?.trim() || 'username'
  const login = `${username}@`
  return `ssh ${login}${parsed.host} -p ${parsed.port}`
}

const toSshCopyCommand = (endpoint: string, user?: string) => {
  const command = toSshCommand(endpoint, user)
  return command.startsWith('ssh ')
    ? command.replace(/^ssh\s+/, 'ssh -o StrictHostKeyChecking=no ')
    : command
}

const isHttpEndpoint = (endpoint: string) => /^https?:\/\//i.test(endpoint)

const formatDuration = (seconds: number) => {
  if (seconds <= 0) return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const sec = seconds % 60
  if (h > 0) return `${h}h ${m}m ${sec}s`
  return `${m}m ${sec}s`
}

const formatShortDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return null
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  return `${Math.ceil(seconds / 60)}m`
}

const formatExtendWaitDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return null
  return `${Math.max(1, Math.ceil(seconds / 60))}m`
}

const firstBoolean = (...values: unknown[]): boolean | null => {
  for (const value of values) {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (normalized === 'true') return true
      if (normalized === 'false') return false
    }
  }

  return null
}

const firstNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return null
}

const stringifyNxctlDetail = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return String(value)

  const detail = value as Record<string, unknown>
  const code = typeof detail.error === 'string' ? detail.error : ''
  const message = typeof detail.message === 'string' ? detail.message : ''

  if (code === 'challenge_not_found_or_not_authorized') {
    return 'Challenge not found, disabled, or missing/invalid challenge key.'
  }

  if (code === 'challenge_not_found') {
    return 'Challenge not found in NXCTL.'
  }

  if (code === 'invalid_or_missing_api_token') {
    return 'NXCTL API token is missing or invalid.'
  }

  if (code === 'invalid_or_missing_admin_secret') {
    return 'NXCTL admin secret is missing or invalid.'
  }

  if (code === 'api_admin_secret_not_configured') {
    return 'NXCTL admin secret is not configured.'
  }

  if (code === 'restart_disabled') {
    return 'Restart is disabled for this challenge.'
  }

  if (message) return message
  if (code) return code

  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

const getNxctlErrorMessage = (data: any) => {
  return (
    stringifyNxctlDetail(data?.detail) ||
    stringifyNxctlDetail(data?.error) ||
    stringifyNxctlDetail(data?.message) ||
    'Unknown error'
  )
}

const getNxctlStatusName = (item: any) => String(item?.name || item?.challenge?.name || '').trim()

const getServiceDisplayName = (name: string) => {
  const normalized = name.trim().replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  return parts.at(-1) || name
}

const getRestartState = (details: any) => {
  const restart = details?.runtime?.restart || details?.restart || null
  const enabled = firstBoolean(
    restart?.enabled,
    details?.runtime?.can_restart,
    details?.challenge?.can_restart,
    details?.can_restart
  )
  const cooldownSeconds = firstNumber(
    restart?.cooldown_remaining_seconds,
    details?.runtime?.restart_cooldown,
    details?.restart_cooldown
  )

  return {
    enabled: enabled ?? true,
    cooldownSeconds: Math.max(0, Math.floor(cooldownSeconds ?? 0)),
    restart,
  }
}

const getExtendState = (details: any, remainingSec: number | null, timeSinceFetch: number) => {
  const extend = details?.runtime?.extend || details?.extend || null
  const thresholdSeconds = Math.max(0, Math.floor(firstNumber(extend?.threshold_seconds) ?? 300))
  const rawCooldownSeconds = firstNumber(
    extend?.cooldown_remaining_seconds,
    details?.runtime?.extend_cooldown,
    details?.extend_cooldown
  ) ?? 0
  const cooldownSeconds = Math.max(0, Math.floor(rawCooldownSeconds - timeSinceFetch))
  const isWindowOpen = remainingSec !== null && remainingSec <= thresholdSeconds
  const waitSeconds = remainingSec !== null && remainingSec > thresholdSeconds
    ? remainingSec - thresholdSeconds
    : 0
  const backendCanExtend = firstBoolean(extend?.can_extend) === true

  return {
    canExtend: backendCanExtend || (remainingSec !== null && isWindowOpen && cooldownSeconds === 0),
    cooldownSeconds,
    thresholdSeconds,
    waitSeconds,
  }
}

const normalizeNxctlStatusDetail = (item: any) => {
  const restart = item?.runtime?.restart || item?.restart || null
  const restartEnabled = firstBoolean(
    restart?.enabled,
    item?.runtime?.can_restart,
    item?.challenge?.can_restart,
    item?.can_restart
  )
  const restartCooldown = firstNumber(
    restart?.cooldown_remaining_seconds,
    item?.runtime?.restart_cooldown,
    item?.restart_cooldown
  )

  return {
    challenge: {
      name: getNxctlStatusName(item),
      type: item?.type || item?.challenge?.type || null,
      port: item?.port ?? item?.challenge?.port ?? null,
      ports: Array.isArray(item?.ports) ? item.ports : Array.isArray(item?.challenge?.ports) ? item.challenge.ports : [],
      can_restart: restartEnabled,
    },
    runtime: {
      status: item?.runtime?.status || item?.status || 'unknown',
      container_id: item?.runtime?.container_id || item?.container_id || null,
      remaining_seconds: item?.runtime?.remaining_seconds ?? item?.remaining_seconds ?? null,
      can_restart: restartEnabled,
      restart_cooldown: restartCooldown ?? 0,
      restart,
      extend_cooldown: item?.runtime?.extend_cooldown ?? item?.extend_cooldown ?? 0,
      extend: item?.runtime?.extend || item?.extend || null,
    },
    exports: Array.isArray(item?.exports) ? item.exports : [],
  }
}

const isNxctlNotFoundError = (status: number, data: any): boolean => {
  const getCode = (val: any): string | null => {
    if (!val) return null
    if (typeof val === 'string') return val
    if (typeof val === 'object') {
      if (typeof val.error === 'string') return val.error
      if (typeof val.code === 'string') return val.code
    }
    return null
  }

  const code = getCode(data?.detail) || getCode(data?.error) || getCode(data)
  if (code === 'challenge_not_found_or_not_authorized') return false
  return status === 404 || code === 'challenge_not_found'
}

const ChallengeServicesPanel: React.FC<ChallengeServicesPanelProps> = ({
  open,
  services = [],
}) => {
  const serviceActionButtonClass =
    'inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-gray-200/80 bg-white/50 px-2.5 text-[11px] font-medium text-gray-600 shadow-sm backdrop-blur-md transition-all hover:border-blue-500/40 hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700/80 dark:bg-[#111622]/60 dark:text-gray-300 dark:hover:bg-[#151b2a]'
  const serviceActionButtonIconClass = 'shrink-0'
  const rawServicesKey = services.join('\u0000')
  const parsedServices = useMemo(
    () => (rawServicesKey ? rawServicesKey.split('\u0000') : [])
      .map(parseNxctlService)
      .filter((service) => service.name.trim() !== ''),
    [rawServicesKey]
  )
  const serviceListKey = useMemo(
    () => parsedServices.map((service) => `${service.name}:${service.key || ''}`).join('\u0000'),
    [parsedServices]
  )

  const [serviceDetails, setServiceDetails] = useState<Record<string, any>>({})
  const [serviceDetailsFetchTime, setServiceDetailsFetchTime] = useState<Record<string, number>>({})
  const [serviceActionLoading, setServiceActionLoading] = useState<Record<string, ServiceActionLoadingState>>({})
  const [serviceDetailsLoading, setServiceDetailsLoading] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    parsedServices.forEach((service) => {
      initial[service.name] = true
    })
    return initial
  })
  const [serviceDetailsError, setServiceDetailsError] = useState<Record<string, string | null>>({})
  const [hiddenServices, setHiddenServices] = useState<Record<string, boolean>>({})
  const [nowTick, setNowTick] = useState<number>(() => Date.now())
  const inspectRunRef = React.useRef(0)
  const expiryReminderRef = React.useRef<Record<string, boolean>>({})
  const extendSoundReminderRef = React.useRef<Record<string, { initial: boolean; initialPending?: boolean; finalPending?: boolean; finalNextAt?: number }>>({})
  const extendReminderAudioRef = React.useRef<HTMLAudioElement | null>(null)
  const extendReminderRunRef = React.useRef(0)

  const stopExtendReminderSound = React.useCallback(() => {
    const audio = extendReminderAudioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    extendReminderAudioRef.current = null
  }, [])

  const playExtendReminderSound = React.useCallback(async () => {
    if (!open || document.visibilityState !== 'visible') return false

    const currentAudio = extendReminderAudioRef.current
    if (currentAudio && !currentAudio.paused && currentAudio.currentTime > 0) return true

    const audio = new Audio(EXTEND_REMINDER_SOUND)
    audio.volume = EXTEND_REMINDER_VOLUME
    extendReminderAudioRef.current = audio
    audio.addEventListener('ended', () => {
      if (extendReminderAudioRef.current === audio) {
        extendReminderAudioRef.current = null
      }
    }, { once: true })
    try {
      await audio.play()
      return true
    } catch {
      if (extendReminderAudioRef.current === audio) {
        extendReminderAudioRef.current = null
      }
      return false
    }
  }, [open])

  useEffect(() => {
    return () => stopExtendReminderSound()
  }, [stopExtendReminderSound])

  const visibleServices = useMemo(
    () => parsedServices.filter((service) => !hiddenServices[service.name]),
    [parsedServices, hiddenServices]
  )

  useEffect(() => {
    const activeNames = new Set(parsedServices.map((service) => service.name))

    setServiceDetails((prev) => {
      const next: Record<string, any> = {}
      Object.entries(prev).forEach(([name, details]) => {
        if (activeNames.has(name)) next[name] = details
      })
      return next
    })
    setServiceDetailsFetchTime((prev) => {
      const next: Record<string, number> = {}
      Object.entries(prev).forEach(([name, fetchTime]) => {
        if (activeNames.has(name)) next[name] = fetchTime
      })
      return next
    })
    setServiceDetailsLoading(() => {
      const next: Record<string, boolean> = {}
      parsedServices.forEach((service) => {
        next[service.name] = true
      })
      return next
    })
    setServiceDetailsError(() => {
      const next: Record<string, string | null> = {}
      parsedServices.forEach((service) => {
        next[service.name] = null
      })
      return next
    })
    setServiceActionLoading(() => {
      const next: Record<string, ServiceActionLoadingState> = {}
      parsedServices.forEach((service) => {
        next[service.name] = null
      })
      return next
    })
    setHiddenServices(() => {
      const next: Record<string, boolean> = {}
      parsedServices.forEach((service) => {
        next[service.name] = false
      })
      return next
    })
    expiryReminderRef.current = {}
  }, [serviceListKey, parsedServices])

  useEffect(() => {
    if (!open || parsedServices.length === 0) return

    const runId = inspectRunRef.current + 1
    inspectRunRef.current = runId
    const isCurrentRun = () => inspectRunRef.current === runId

    const loadStatus = async () => {
      const serviceNames = new Set(parsedServices.map((service) => service.name))
      setServiceDetailsLoading((prev) => {
        const next = { ...prev }
        parsedServices.forEach((service) => {
          next[service.name] = true
        })
        return next
      })
      setServiceDetailsError((prev) => {
        const next = { ...prev }
        parsedServices.forEach((service) => {
          next[service.name] = null
        })
        return next
      })

      try {
        const res = await fetch(buildNxctlStatusUrl(parsedServices), {
          headers: buildNxctlStatusHeaders(parsedServices),
        })
        const data = await res.json()
        if (!isCurrentRun()) return

        if (!res.ok || !Array.isArray(data)) {
          const message = getNxctlErrorMessage(data)
          setServiceDetailsError((prev) => {
            const next = { ...prev }
            parsedServices.forEach((service) => {
              next[service.name] = message
            })
            return next
          })
          return
        }

        const statusByName = new Map<string, any>()
        data.forEach((item: any) => {
          const name = getNxctlStatusName(item)
          if (name) statusByName.set(name, normalizeNxctlStatusDetail(item))
        })

        const fetchedAt = Date.now()
        setServiceDetails((prev) => {
          const next = { ...prev }
          parsedServices.forEach((service) => {
            const detail = statusByName.get(service.name)
            if (detail) {
              next[service.name] = detail
            } else {
              delete next[service.name]
            }
          })
          return next
        })
        setServiceDetailsFetchTime((prev) => {
          const next = { ...prev }
          parsedServices.forEach((service) => {
            if (statusByName.has(service.name)) {
              next[service.name] = fetchedAt
            } else {
              delete next[service.name]
            }
          })
          return next
        })
        setServiceDetailsError((prev) => {
          const next = { ...prev }
          parsedServices.forEach((service) => {
            next[service.name] = statusByName.has(service.name)
              ? null
              : 'Service is not visible from NXCTL status. Check the service name or challenge key.'
          })
          return next
        })
        setHiddenServices((prev) => {
          const next = { ...prev }
          parsedServices.forEach((service) => {
            if (serviceNames.has(service.name)) next[service.name] = false
          })
          return next
        })
      } catch (error: any) {
        if (!isCurrentRun()) return
        console.error('Failed to fetch service status', error)
        setServiceDetailsError((prev) => {
          const next = { ...prev }
          parsedServices.forEach((service) => {
            next[service.name] = error.message || 'Failed to fetch service status'
          })
          return next
        })
      } finally {
        if (isCurrentRun()) {
          setServiceDetailsLoading((prev) => {
            const next = { ...prev }
            parsedServices.forEach((service) => {
              next[service.name] = false
            })
            return next
          })
        }
      }
    }

    loadStatus()

    return () => {
      inspectRunRef.current += 1
    }
  }, [open, parsedServices])

  // global ticking state to re-render countdowns every second while panel is open
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [open])

  useEffect(() => {
    if (!open) {
      extendReminderRunRef.current += 1
      expiryReminderRef.current = {}
      Object.entries(extendSoundReminderRef.current).forEach(([name, state]) => {
        extendSoundReminderRef.current[name] = {
          ...state,
          initialPending: false,
          finalPending: false,
        }
      })
      stopExtendReminderSound()
      return
    }

    visibleServices.forEach((service) => {
      const details = serviceDetails[service.name]
      const isRunning = details?.runtime?.status === 'running'
      const remainingSecFromApi = details?.runtime?.remaining_seconds ?? null
      const fetchTime = serviceDetailsFetchTime[service.name] ?? nowTick
      const timeSinceFetch = Math.max(0, (nowTick - fetchTime) / 1000)
      const remainingSec = remainingSecFromApi !== null ? Math.max(0, remainingSecFromApi - timeSinceFetch) : null
      const thresholdSec = Number(details?.runtime?.extend?.threshold_seconds || 300)
      const extendState = getExtendState(details, remainingSec, timeSinceFetch)

      if (!isRunning || remainingSec === null || remainingSec <= 0 || !extendState.canExtend) {
        expiryReminderRef.current[service.name] = false
        return
      }

      if (remainingSec > thresholdSec) {
        expiryReminderRef.current[service.name] = false
        delete extendSoundReminderRef.current[service.name]
        return
      }

      const soundState = extendSoundReminderRef.current[service.name] ?? { initial: false, final: false }
      const shouldPlayInitialReminder = !soundState.initial
      const shouldPlayFinalReminder = remainingSec <= 60 && !soundState.final

      if (shouldPlayInitialReminder || shouldPlayFinalReminder) {
        const reminderKind = shouldPlayFinalReminder ? 'final' : 'initial'
        const pendingKey = reminderKind === 'final' ? 'finalPending' : 'initialPending'
        if (!soundState[pendingKey]) {
          extendSoundReminderRef.current[service.name] = {
            ...soundState,
            [pendingKey]: true,
          }

          void playExtendReminderSound().then((played) => {
            const latest = extendSoundReminderRef.current[service.name] ?? { initial: false, final: false }
            extendSoundReminderRef.current[service.name] = {
              ...latest,
              initial: played && reminderKind === 'final' ? true : latest.initial,
              [reminderKind]: played ? true : latest[reminderKind],
              [pendingKey]: false,
            }
          })
        }
      }

      if (expiryReminderRef.current[service.name]) return

      expiryReminderRef.current[service.name] = true
      toast(
        `${getServiceDisplayName(service.name)} expires in ${formatDuration(Math.floor(remainingSec))}. Extend it if needed.`,
        {
          icon: '!',
          duration: 7000,
          id: `nxctl-expiry-${service.name}`,
        }
      )
    })
  }, [open, visibleServices, serviceDetails, serviceDetailsFetchTime, nowTick, playExtendReminderSound, stopExtendReminderSound])

  const inspectService = async (service: NxctlServiceEntry) => {
    setServiceDetailsLoading((prev) => ({ ...prev, [service.name]: true }))
    setServiceDetailsError((prev) => ({ ...prev, [service.name]: null }))
    try {
      const resInspect = await fetch(`/api/nxctl?action=inspect&name=${encodeURIComponent(service.name)}`, {
        headers: buildNxctlHeaders(service),
      })
      const dataInspect = await resInspect.json()
      if (resInspect.ok) {
        setServiceDetails((prev) => ({ ...prev, [service.name]: dataInspect }))
        setServiceDetailsFetchTime((prev) => ({ ...prev, [service.name]: Date.now() }))
        setServiceDetailsError((prev) => ({ ...prev, [service.name]: null }))
      } else {
        if (isNxctlNotFoundError(resInspect.status, dataInspect)) {
          setHiddenServices((prev) => ({ ...prev, [service.name]: true }))
        } else {
          setServiceDetailsError((prev) => ({ ...prev, [service.name]: getNxctlErrorMessage(dataInspect) }))
        }
      }
    } catch (error: any) {
      console.error(`Failed to refresh service details for ${service.name}`, error)
      setServiceDetailsError((prev) => ({ ...prev, [service.name]: error.message || 'Failed to inspect service status' }))
    } finally {
      setServiceDetailsLoading((prev) => ({ ...prev, [service.name]: false }))
    }
  }

  const handleServiceAction = async (service: NxctlServiceEntry, action: ServiceAction) => {
    if (action === 'restart') {
      const details = serviceDetails[service.name]
      const restartState = getRestartState(details)
      const isRunning = details?.runtime?.status === 'running'

      if (!restartState.enabled) {
        toast.error('Restart is disabled for this challenge.')
        return
      }

      if (!isRunning) {
        toast.error('Cannot restart: service is not running.')
        return
      }

      if (restartState.cooldownSeconds > 0) {
        toast.error(`Restart cooldown active. Wait ${formatDuration(restartState.cooldownSeconds)}.`)
        return
      }
    }

    setServiceActionLoading((prev) => ({ ...prev, [service.name]: action }))
    const serviceDisplayName = getServiceDisplayName(service.name)
    const toastId = toast.loading(`${action}ing ${serviceDisplayName}...`)

    try {
      const res = await fetch('/api/nxctl', {
        method: 'POST',
        headers: buildNxctlHeaders(service, true),
        body: JSON.stringify({ action, name: service.name }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(`Successfully ${action}ed ${serviceDisplayName}`, { id: toastId })
        await new Promise((resolve) => setTimeout(resolve, 500))
        await inspectService(service)
      } else {
        toast.error(`Failed to ${action} ${serviceDisplayName}: ${getNxctlErrorMessage(data)}`, { id: toastId })
      }
    } catch (error) {
      console.error(`Failed to ${action} ${service.name}`, error)
      toast.error(`Error ${action}ing ${serviceDisplayName}`, { id: toastId })
    } finally {
      setServiceActionLoading((prev) => ({ ...prev, [service.name]: null }))
    }
  }

  if (visibleServices.length === 0) return null

  return (
    <div>
      <p className="select-none text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5 opacity-80">
        <span className="h-4 w-4">🌐</span> <span>NXCTL Services</span>
      </p>
      <div className="grid grid-cols-1 gap-1.5">
        {visibleServices.map((service, idx) => {
          const serviceDisplayName = getServiceDisplayName(service.name)
          const details = serviceDetails[service.name]
          const isRunning = details?.runtime?.status === 'running'
          const serviceType = details?.challenge?.type
          const hasPublishedPort = Boolean(details?.challenge?.port) || (Array.isArray(details?.challenge?.ports) && details.challenge.ports.length > 0)
          const endpoints = Array.isArray(details?.exports)
            ? details.exports
              .map((item: any, exportIdx: number) => {
                const endpoint = getExportEndpoint(item)
                if (!endpoint) return null

                const isTcp = isTcpEndpoint(item, serviceType)
                const endpointType = String(item?.type || '').toLowerCase()
                const isReturnedTcp =
                  endpointType === 'tcp' ||
                  endpoint.toLowerCase().startsWith('tcp://') ||
                  (!isHttpEndpoint(endpoint) && parseTcpEndpoint(endpoint) !== null)
                const isSsh = isReturnedTcp && service.options.type === 'ssh'
                const command = isSsh ? toSshCommand(endpoint, service.options.user) : isTcp ? toTcpCommand(endpoint) : endpoint
                const copyCommand = isSsh ? toSshCopyCommand(endpoint, service.options.user) : command
                const password = isSsh ? service.options.pass || '' : ''

                return {
                  key: `${endpoint}-${exportIdx}`,
                  endpoint,
                  provider: item?.provider ? String(item.provider) : '',
                  port: item?.port ? String(item.port) : '',
                  status: item?.status ? String(item.status) : '',
                  type: item?.type ? String(item.type) : String(serviceType || ''),
                  isTcp,
                  isSsh,
                  command,
                  password,
                  copyText: copyCommand,
                  copyMessage: isSsh ? 'Copied SSH command' : 'Copied endpoint',
                }
              })
              .filter(Boolean)
            : []

          // Use remaining_seconds directly from API and keep countdown local between refreshes.
          const remainingSecFromApi = details?.runtime?.remaining_seconds ?? null
          const fetchTime = serviceDetailsFetchTime[service.name] ?? nowTick
          const timeSinceFetch = Math.max(0, (nowTick - fetchTime) / 1000)
          const remainingSec = remainingSecFromApi !== null ? Math.max(0, remainingSecFromApi - timeSinceFetch) : null

          const extendState = getExtendState(details, remainingSec, timeSinceFetch)
          const thresholdSec = extendState.thresholdSeconds
          const canExtend = extendState.canExtend
          const restartState = getRestartState(details)
          const restartEnabled = restartState.enabled
          const restartCooldownSec = restartState.cooldownSeconds
          const restartCooldownLabel = formatShortDuration(restartCooldownSec)
          const restartDisabledLabel = !restartEnabled ? 'Off' : null
          const extendCooldownLabel = extendState.cooldownSeconds > 0
            ? formatShortDuration(extendState.cooldownSeconds)
            : null
          const extendDelayLabel = !canExtend
            ? extendCooldownLabel || formatExtendWaitDuration(extendState.waitSeconds)
            : null
          const extendButtonAlertClass = canExtend && isRunning && remainingSec !== null
            ? remainingSec <= 60
              ? 'border-red-500/40 bg-red-500/15 text-red-200 shadow-red-500/10 hover:border-red-400/70 hover:bg-red-500/25 dark:border-red-400/40 dark:bg-red-500/15 dark:text-red-200 dark:hover:bg-red-500/25'
              : 'border-amber-500/40 bg-amber-500/15 text-amber-200 shadow-amber-500/10 hover:border-amber-400/70 hover:bg-amber-500/25 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25'
            : ''

          const formatSecs = (s: number) => {
            if (s <= 0) return '0s'
            const h = Math.floor(s / 3600)
            const m = Math.floor((s % 3600) / 60)
            const sec = s % 60
            if (h > 0) return `${h}h ${m}m ${sec}s`
            return `${m}m ${sec}s`
          }

          const timerClass = (() => {
            if (remainingSec === null) return 'border-gray-700/60 bg-gray-900/40 text-gray-500'
            if (remainingSec <= 60) return 'border-red-500/30 bg-red-500/10 text-red-300'
            if (remainingSec <= thresholdSec) return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'
            return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300'
          })()
          const isLoading = serviceDetailsLoading[service.name] ?? (!details && open)
          const errorMessage = serviceDetailsError[service.name]
          const actionLoading = serviceActionLoading[service.name] ?? null
          const isActionLoading = actionLoading !== null
          const isContainerOnly = isRunning && !hasPublishedPort && endpoints.length === 0
          const statusLabel = !details
            ? 'Unknown'
            : isRunning
              ? isContainerOnly
                ? 'Container only'
                : 'Running'
              : 'Not running'
          const statusClass = !details
            ? 'border-gray-700/60 bg-gray-900/40 text-gray-500'
            : isRunning
              ? isContainerOnly
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
              : 'border-gray-600/40 bg-gray-800/30 text-gray-400'

          return (
            <div key={`${service.name}-${idx}`} className={`group flex min-h-[74px] flex-col gap-1.5 px-3 py-2.5 transition-colors duration-200 ${SURFACE_GLASS_CARD_COMPACT_CLASS} hover:border-blue-500/40`}>
              {/* Header: name + action buttons + timer */}
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 min-h-9">
                <div className="min-w-0 color-primary font-medium truncate">
                    {serviceDisplayName}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className={serviceActionButtonClass}
                    onClick={() => handleServiceAction(service, 'up')}
                    title={(() => {
                      if (isLoading) return 'Checking status...'
                      if (errorMessage) return `Error: ${errorMessage}`
                      if (isActionLoading) return 'Please wait...'
                      if (isRunning) return 'Service is already running'
                      return 'Start Service'
                    })()}
                    disabled={
                      isLoading ||
                      !!errorMessage ||
                      isActionLoading ||
                      isRunning
                    }
                  >
                    {actionLoading === 'up' ? <Loader2 size={12} className={`${serviceActionButtonIconClass} animate-spin`} /> : <Play size={12} className={serviceActionButtonIconClass} />}
                    <span>Start</span>
                  </button>
                  <button
                    type="button"
                    className={serviceActionButtonClass}
                    onClick={() => handleServiceAction(service, 'restart')}
                    title={(() => {
                      if (isLoading) return 'Checking status...'
                      if (errorMessage) return `Error: ${errorMessage}`
                      if (isActionLoading) return 'Please wait...'
                      if (!restartEnabled) return 'Restart is disabled for this challenge'
                      if (!isRunning) return 'Cannot restart: service is not running'
                      if (restartCooldownSec && restartCooldownSec > 0) return `Restart cooldown: ${formatSecs(restartCooldownSec)}`
                      return 'Restart Service'
                    })()}
                    disabled={
                      isLoading ||
                      !!errorMessage ||
                      isActionLoading ||
                      !restartEnabled ||
                      !isRunning ||
                      !!(restartCooldownSec && restartCooldownSec > 0)
                    }
                  >
                    {actionLoading === 'restart' ? <Loader2 size={12} className={`${serviceActionButtonIconClass} animate-spin`} /> : <RefreshCcw size={12} className={serviceActionButtonIconClass} />}
                    <span>Restart</span>
                    {restartCooldownLabel && (
                      <span className="rounded bg-yellow-500/10 px-1 text-[9px] font-bold text-yellow-300">
                        {restartCooldownLabel}
                      </span>
                    )}
                    {restartDisabledLabel && (
                      <span className="rounded bg-red-500/10 px-1 text-[9px] font-bold text-red-300">
                        {restartDisabledLabel}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className={`${serviceActionButtonClass} ${extendButtonAlertClass}`}
                    onClick={() => handleServiceAction(service, 'extend')}
                    title={(() => {
                      if (isLoading) return 'Checking status...'
                      if (errorMessage) return `Error: ${errorMessage}`
                      if (isActionLoading) return 'Please wait...'
                      if (!isRunning) return 'Cannot extend: service is not running'
                      if (remainingSec === null) return 'No expiration available to extend'
                      if (!canExtend) {
                        if (extendCooldownLabel) return `Extend cooldown: ${formatSecs(extendState.cooldownSeconds)}`
                        if (extendDelayLabel) return `Can extend in about ${extendDelayLabel}`
                        return `Can extend when remaining <= ${formatSecs(thresholdSec)}`
                      }
                      return `Extend service time`
                    })()}
                    disabled={
                      isLoading ||
                      !!errorMessage ||
                      isActionLoading ||
                      !isRunning ||
                      remainingSec === null ||
                      !canExtend
                    }
                  >
                    {actionLoading === 'extend' ? <Loader2 size={12} className={`${serviceActionButtonIconClass} animate-spin`} /> : <Clock size={12} className={serviceActionButtonIconClass} />}
                    <span>Extend</span>
                    {extendDelayLabel && (
                      <span className="rounded bg-cyan-500/10 px-1 text-[9px] font-bold text-cyan-300">
                        {extendDelayLabel}
                      </span>
                    )}
                  </button>
                </div>

                {isRunning && remainingSec !== null ? (
                  <span
                    className={`inline-flex h-7 min-w-[100px] select-none items-center justify-between gap-1 rounded-md border px-2 text-[10px] font-semibold tabular-nums ${timerClass}`}
                    title="Time remaining"
                  >
                    <Clock size={11} className="shrink-0 opacity-80" />
                    {formatSecs(Math.floor(remainingSec))}
                  </span>
                ) : (
                  <span
                    className={`inline-flex h-7 min-w-[100px] select-none items-center justify-between gap-1 rounded-md border px-2 text-[10px] font-semibold tabular-nums ${statusClass}`}
                    title="Runtime status"
                  >
                    {isRunning ? <Power size={11} className="shrink-0 opacity-80" /> : <Clock size={11} className="shrink-0 opacity-80" />}
                    {statusLabel}
                  </span>
                )}
              </div>

              {/* Per-service loading */}
              {isLoading && !details && (
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 select-none">
                  <Loader2 size={10} className="animate-spin text-blue-500" />
                  <span>Checking...</span>
                </div>
              )}

              {/* Per-service error */}
              {errorMessage && (
                <div className="flex items-center gap-1.5 text-[11px] select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                  <span className="text-red-400 truncate flex-1">{errorMessage}</span>
                  <button
                    type="button"
                    className="text-[11px] text-blue-500 hover:text-blue-400 hover:underline font-medium flex items-center gap-0.5 shrink-0 disabled:opacity-50"
                    onClick={() => inspectService(service)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 size={9} className="animate-spin" />
                    ) : (
                      <RefreshCcw size={9} />
                    )}
                    Retry
                  </button>
                </div>
              )}

              {/* Endpoints (only when running) */}
              {details && isRunning && (
                endpoints.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {endpoints.map((endpoint: any) => (
                      <div key={endpoint.key} className="flex min-w-0 flex-col gap-1">
                        {endpoint.isTcp || !isHttpEndpoint(endpoint.endpoint) ? (
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className={`grid items-center gap-2 min-w-0 ${endpoint.isSsh && endpoint.password ? 'grid-cols-[minmax(0,1fr)_minmax(70px,120px)_auto]' : 'grid-cols-[minmax(0,1fr)_auto]'}`}>
                              <code className={`min-w-0 truncate rounded border px-2 py-1 font-mono text-[11px] ${endpoint.isSsh ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'}`}>
                                {endpoint.command}
                              </code>
                              {endpoint.isSsh && endpoint.password && (
                                <code
                                  className="min-w-0 truncate rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 font-mono text-[11px] text-amber-300"
                                  title={`Password: ${endpoint.password}`}
                                >
                                  <span className="select-none pr-1 text-[9px] font-bold uppercase tracking-wider text-amber-500/70">pw</span>
                                  {endpoint.password}
                                </code>
                              )}
                              <button
                                className={`select-none shrink-0 rounded px-2 py-1 text-[10px] font-bold transition ${endpoint.isSsh ? 'border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20' : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'}`}
                                onClick={() => {
                                  navigator.clipboard.writeText(endpoint.copyText)
                                  toast.success(endpoint.copyMessage)
                                }}
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <a href={endpoint.endpoint} target="_blank" rel="noreferrer" className="col-span-2 block w-full truncate rounded border border-blue-500/15 bg-blue-500/5 px-2 py-1 text-[11px] font-medium text-blue-400 transition hover:text-blue-300 hover:underline">
                            {endpoint.endpoint}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  isContainerOnly ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 select-none">
                      <Power size={11} className="shrink-0 opacity-70" />
                      Running without published endpoint
                    </span>
                  ) : (
                    <span className="text-[11px] text-yellow-500">Waiting for endpoint allocation...</span>
                  )
                )
              )}

              {/* Stopped state - minimal */}
              {details && !isRunning && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 select-none">
                  <PowerOff size={11} className="shrink-0 opacity-70" />
                  Stopped
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ChallengeServicesPanel
