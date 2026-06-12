'use client'

import React from 'react'
import type { ChallengeWithSolve } from '@/shared/types'
import { SURFACE_GLASS_CARD_COMPACT_CLASS } from '@/shared/styles'
import { formatSmartFlag } from '../../lib/flag-formatting'
import type { KeyedBooleanMap, KeyedFlagFeedbackMap, KeyedStringMap } from '../../types'

type ChallengeFlagFormProps = {
  challenge: ChallengeWithSolve
  flagInputs: KeyedStringMap
  placeholders: KeyedStringMap
  submitting: KeyedBooleanMap
  flagFeedback: KeyedFlagFeedbackMap
  handleFlagInputChange: (challengeId: string, value: string) => void
  handleFlagSubmit: (challengeId: string) => void | Promise<unknown>
  preserveDialogScroll?: () => () => void
}

export default function ChallengeFlagForm({
  challenge,
  flagInputs,
  placeholders,
  submitting,
  flagFeedback,
  handleFlagInputChange,
  handleFlagSubmit,
  preserveDialogScroll,
}: ChallengeFlagFormProps) {
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const submitScrollPositionRef = React.useRef({ x: 0, y: 0 })
  const submitScrollRestoreRef = React.useRef<(() => void) | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const restoreWindowScroll = React.useCallback((scrollPosition: { x: number; y: number }) => {
    requestAnimationFrame(() => {
      window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: 'auto' })
    })
  }, [])
  const restoreWindowScrollAfterSubmit = React.useCallback((scrollPosition: { x: number; y: number }) => {
    restoreWindowScroll(scrollPosition)
    window.setTimeout(() => restoreWindowScroll(scrollPosition), 50)
    window.setTimeout(() => restoreWindowScroll(scrollPosition), 150)
  }, [restoreWindowScroll])
  const saveSubmitScrollPosition = React.useCallback(() => {
    submitScrollPositionRef.current = { x: window.scrollX, y: window.scrollY }
  }, [])
  const prepareSubmitScrollRestore = React.useCallback(() => {
    saveSubmitScrollPosition()
    submitScrollRestoreRef.current = preserveDialogScroll?.() || null
  }, [preserveDialogScroll, saveSubmitScrollPosition])
  const submitFlagWithoutScrollJump = React.useCallback(() => {
    const scrollPosition = submitScrollPositionRef.current
    const restoreDialogScroll = submitScrollRestoreRef.current || preserveDialogScroll?.() || null
    const restoreAfterSubmit = restoreDialogScroll || (() => restoreWindowScrollAfterSubmit(scrollPosition))
    const result = handleFlagSubmit(challenge.id)

    restoreAfterSubmit()

    if (result instanceof Promise) {
      void result.finally(restoreAfterSubmit)
    }
  }, [challenge.id, handleFlagSubmit, preserveDialogScroll, restoreWindowScrollAfterSubmit])

  React.useEffect(() => {
    const scrollPosition = { x: window.scrollX, y: window.scrollY }

    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true })
      window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: 'auto' })
    })
  }, [challenge.id])

  return (
    <div className="flex flex-col relative w-full">
      {flagFeedback[challenge.id] && (
        <div
          className={`absolute bottom-[calc(100%+12px)] left-0 right-0 p-2.5 rounded-lg text-xs font-black uppercase tracking-widest text-center shadow-lg transition-all z-20 animate-in fade-in slide-in-from-bottom-2
            ${flagFeedback[challenge.id]?.success
              ? 'bg-green-500 text-white dark:bg-green-600'
              : 'bg-red-500 text-white dark:bg-red-600'}
          `}
        >
          {flagFeedback[challenge.id]?.message}
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          submitFlagWithoutScrollJump()
        }}
      >
        <div className={`relative flex-1 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/40 ${SURFACE_GLASS_CARD_COMPACT_CLASS}`}>
          {challenge.flag_placeholder && placeholders[challenge.id] && (
            <div
              ref={overlayRef}
              className="pointer-events-none absolute inset-0 flex select-none items-center overflow-hidden whitespace-pre pl-4 pr-6 font-mono text-sm text-gray-400 opacity-50 dark:text-gray-600"
            >
              <span className="invisible">{flagInputs[challenge.id] || ''}</span>
              <span>{placeholders[challenge.id].slice((flagInputs[challenge.id] || '').length)}</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            onScroll={(event) => {
              if (overlayRef.current) overlayRef.current.scrollLeft = event.currentTarget.scrollLeft
            }}
            value={flagInputs[challenge.id] || ''}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                prepareSubmitScrollRestore()
              }

              if (event.key === 'Backspace') {
                setIsDeleting(true)
              } else {
                setIsDeleting(false)
              }
            }}
            onChange={(event) => {
              const scrollPosition = { x: window.scrollX, y: window.scrollY }
              const value = event.target.value
              const mask = placeholders[challenge.id]

              if (challenge.flag_placeholder && mask && !isDeleting) {
                handleFlagInputChange(challenge.id, formatSmartFlag(value, mask))
              } else {
                handleFlagInputChange(challenge.id, value)
              }

              restoreWindowScroll(scrollPosition)
            }}
            placeholder={challenge.flag_placeholder && placeholders[challenge.id] ? '' : 'Enter flag here...'}
            className="w-full h-[38px] pl-4 pr-6 bg-transparent text-gray-900 dark:text-white focus:outline-none relative z-10 font-mono text-sm"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          disabled={
            submitting[challenge.id] ||
            !flagInputs[challenge.id]?.trim() ||
            (challenge.flag_placeholder && placeholders[challenge.id] ? (flagInputs[challenge.id] || '').length !== placeholders[challenge.id].length : false)
          }
          onMouseDown={(event) => {
            event.preventDefault()
            prepareSubmitScrollRestore()
          }}
          onTouchStart={prepareSubmitScrollRestore}
          className="flex h-[38px] shrink-0 select-none items-center justify-center rounded-xl bg-blue-600 px-6 text-[13px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 active:scale-95 disabled:opacity-30"
        >
          {submitting[challenge.id] ? '...' : 'Submit'}
        </button>
      </form>
    </div>
  )
}
