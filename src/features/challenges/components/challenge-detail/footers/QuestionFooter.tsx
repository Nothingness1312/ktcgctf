import React, { useState } from 'react'
import { Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { DialogFooterLayout } from './DialogFooterLayout'
import ConfirmDialog from '@/shared/components/ConfirmDialog'

export interface QuestionFooterProps {
  subChallengeCompleted: boolean
  subChallengeFlag: string | null
  onReset: () => void | Promise<unknown>
  preserveDialogScroll?: () => () => void
}

export const QuestionFooter: React.FC<QuestionFooterProps> = ({
  subChallengeCompleted,
  subChallengeFlag,
  onReset,
  preserveDialogScroll,
}) => {
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const resetScrollPositionRef = React.useRef({ x: 0, y: 0 })
  const resetScrollRestoreRef = React.useRef<(() => void) | null>(null)

  const saveResetScrollPosition = React.useCallback(() => {
    resetScrollPositionRef.current = { x: window.scrollX, y: window.scrollY }
  }, [])

  const restoreResetScrollPosition = React.useCallback(() => {
    const restoreDialogScroll = preserveDialogScroll?.()

    if (restoreDialogScroll) {
      restoreDialogScroll()
      return
    }

    const scrollPosition = resetScrollPositionRef.current
    const restore = () => window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: 'auto' })

    restore()
    requestAnimationFrame(() => {
      restore()
      requestAnimationFrame(restore)
    })
    window.setTimeout(restore, 50)
    window.setTimeout(restore, 150)
  }, [preserveDialogScroll])

  const openResetConfirmWithoutScrollJump = React.useCallback(() => {
    saveResetScrollPosition()
    resetScrollRestoreRef.current = preserveDialogScroll?.() || null

    setResetConfirmOpen(true)

    if (resetScrollRestoreRef.current) {
      resetScrollRestoreRef.current()
      return
    }

    restoreResetScrollPosition()
  }, [preserveDialogScroll, restoreResetScrollPosition, saveResetScrollPosition])

  const handleResetConfirm = React.useCallback(async () => {
    saveResetScrollPosition()
    const restoreDialogScroll = resetScrollRestoreRef.current || preserveDialogScroll?.() || null
    const restoreAfterReset = restoreDialogScroll || restoreResetScrollPosition

    try {
      await onReset()
    } finally {
      restoreAfterReset()
    }
  }, [onReset, preserveDialogScroll, restoreResetScrollPosition, saveResetScrollPosition])

  return (
    <>
      <DialogFooterLayout className="bg-gray-50/50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex-1 flex items-center min-w-0">
            {subChallengeCompleted ? (
              subChallengeFlag ? (
                <div className="flex-1 flex items-center h-[38px] bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800/50 shadow-[0_2px_10px_rgba(34,197,94,0.1)] overflow-hidden">
                  <div className="flex-1 px-4 font-mono text-xs sm:text-sm text-green-700 dark:text-green-300 truncate select-all font-bold tracking-wide">
                    {subChallengeFlag}
                  </div>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(subChallengeFlag)
                      toast.success('Flag copied!', { icon: '📋' })
                    }}
                    className="flex h-full shrink-0 select-none items-center justify-center bg-green-500 px-4 text-white shadow-md transition-all hover:bg-green-600 active:scale-95"
                    title="Copy Flag"
                  >
                    <Copy size={16} className="sm:hidden" />
                    <span className="hidden sm:inline text-xs font-black uppercase tracking-widest">Copy</span>
                  </button>
                </div>
              ) : (
                <div className="flex h-[38px] select-none items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 text-xs font-bold uppercase tracking-widest text-green-600 dark:border-green-800/50 dark:bg-green-900/20 dark:text-green-400">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="truncate">All Questions Solved</span>
                </div>
              )
            ) : (
              <div className="flex h-[38px] select-none items-center rounded-xl border border-gray-200 bg-gray-200/50 px-4 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-500">
                <span className="truncate">Questions Not Solved</span>
              </div>
            )}
          </div>

          <button
            onMouseDown={(event) => {
              event.preventDefault()
              saveResetScrollPosition()
              resetScrollRestoreRef.current = preserveDialogScroll?.() || null
            }}
            onTouchStart={saveResetScrollPosition}
            onClick={openResetConfirmWithoutScrollJump}
            className="flex h-[38px] shrink-0 select-none items-center justify-center rounded-xl px-4 text-[11px] font-bold uppercase tracking-widest text-red-500/80 underline decoration-red-500/30 underline-offset-4 transition-all hover:bg-red-50 hover:text-red-500 hover:decoration-red-500 active:scale-95 dark:hover:bg-red-500/10"
          >
            Reset
          </button>
        </div>
      </DialogFooterLayout>

      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset Progress"
        description="Are you sure you want to reset your progress? This will clear all your answers for this challenge."
        variant="destructive"
        confirmLabel="Reset"
        onConfirm={handleResetConfirm}
        onRestoreWindowScroll={restoreResetScrollPosition}
      />
    </>
  )
}
