'use client'

import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { MarkdownRenderer } from '@/shared/markdown/MarkdownRenderer'
import {
  SURFACE_GLASS_CARD_COMPACT_CLASS,
  SURFACE_GLASS_FIELD_COMPACT_CLASS,
} from '@/shared/styles'
import type { SubChallengeMode, SubChallengeQuestion } from '../../types'

type SubChallengePanelProps = {
  challengeId: string
  loaded: boolean
  loading: boolean
  submitting: boolean
  mode: SubChallengeMode
  questions: SubChallengeQuestion[]
  nextQuestion: SubChallengeQuestion | null
  answers: Record<string, string>
  results: Record<string, boolean>
  completed: boolean
  flag: string | null
  message: string | null
  onAnswerChange: (orderNumber: number, value: string) => void
  onSubmit: (orderNumber?: number) => void | Promise<unknown>
  onReset: () => void | Promise<unknown>
  preserveDialogScroll?: () => () => void
}

function normalizeQuestionMarkdown(value: string) {
  const trimmed = String(value ?? '').trim()
  const wrappedInQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.charCodeAt(0) === 0x201c && trimmed.charCodeAt(trimmed.length - 1) === 0x201d) ||
    (trimmed.startsWith('\u00e2\u20ac\u0153') && trimmed.endsWith('\u00e2\u20ac\u009d'))

  return wrappedInQuotes ? trimmed.slice(1, -1).trim() : trimmed
}

const QuestionMarkdown = memo(function QuestionMarkdown({ content }: { content: string }) {
  return <MarkdownRenderer content={content} className="max-w-full break-words" />
})

type ScrollAnchorSnapshot = {
  element: HTMLElement
  selector?: string
  top: number
  scrollParent: HTMLElement | null
  scrollTop: number
  windowScroll: { x: number; y: number }
}

function getScrollParent(element: HTMLElement) {
  let parent = element.parentElement

  while (parent) {
    const style = window.getComputedStyle(parent)
    const canScroll = ['auto', 'scroll', 'overlay'].includes(style.overflowY)

    if (canScroll && parent.scrollHeight > parent.clientHeight) return parent
    parent = parent.parentElement
  }

  return null
}

function captureScrollAnchor(element: HTMLElement | null, selector?: string): ScrollAnchorSnapshot | null {
  if (!element) return null
  const scrollParent = getScrollParent(element)

  return {
    element,
    selector,
    top: element.getBoundingClientRect().top,
    scrollParent,
    scrollTop: scrollParent?.scrollTop ?? window.scrollY,
    windowScroll: { x: window.scrollX, y: window.scrollY },
  }
}

function restoreScrollAnchor(snapshot: ScrollAnchorSnapshot | null) {
  if (!snapshot) return

  const restore = () => {
    window.scrollTo({ left: snapshot.windowScroll.x, top: snapshot.windowScroll.y, behavior: 'auto' })

    const nextElement = snapshot.selector
      ? document.querySelector<HTMLElement>(snapshot.selector)
      : null
    const element = nextElement || (snapshot.element.isConnected ? snapshot.element : null)

    if (!element) {
      if (snapshot.scrollParent) {
        snapshot.scrollParent.scrollTo({ top: snapshot.scrollTop, behavior: 'auto' })
      } else {
        window.scrollTo({ left: snapshot.windowScroll.x, top: snapshot.windowScroll.y, behavior: 'auto' })
      }
      return
    }

    const delta = element.getBoundingClientRect().top - snapshot.top

    if (Math.abs(delta) < 1) return

    if (snapshot.scrollParent) {
      snapshot.scrollParent.scrollTo({
        top: snapshot.scrollParent.scrollTop + delta,
        behavior: 'auto',
      })
      return
    }

    window.scrollTo({
      left: snapshot.windowScroll.x,
      top: window.scrollY + delta,
      behavior: 'auto',
    })
  }

  restore()
  requestAnimationFrame(() => {
    restore()
    requestAnimationFrame(restore)
  })
  window.setTimeout(restore, 50)
  window.setTimeout(restore, 150)
  window.setTimeout(restore, 300)
}

type QuestionCardProps = {
  cardAnchorId: string
  question: SubChallengeQuestion
  answer: string
  result?: boolean
  submitting: boolean
  completed: boolean
  current?: boolean
  onAnswerChange: (value: string) => void
  onSubmit: () => void | Promise<unknown>
  onSubmitScrollAnchorCapture?: (snapshot: ScrollAnchorSnapshot | null) => void
  onSubmitScrollAnchorClear?: (snapshot: ScrollAnchorSnapshot | null) => void
}

function QuestionCard({
  cardAnchorId,
  question,
  answer,
  result,
  submitting,
  completed,
  current = false,
  onAnswerChange,
  onSubmit,
  onSubmitScrollAnchorCapture,
  onSubmitScrollAnchorClear,
}: QuestionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const scrollPositionRef = useRef({ x: 0, y: 0 })
  const submitScrollPositionRef = useRef({ x: 0, y: 0 })
  const submitScrollAnchorRef = useRef<ScrollAnchorSnapshot | null>(null)
  const questionContent = normalizeQuestionMarkdown(question.question)
  const cardAnchorSelector = `[data-sub-question-card-id="${cardAnchorId}"]`
  const cardClassName = completed
    ? `min-w-0 overflow-x-hidden space-y-2 p-2.5 opacity-90 ${SURFACE_GLASS_CARD_COMPACT_CLASS}`
    : current
      ? `min-w-0 overflow-x-hidden space-y-2 p-2.5 border-blue-500/40 shadow-lg shadow-blue-500/10 ${SURFACE_GLASS_CARD_COMPACT_CLASS}`
      : `min-w-0 overflow-x-hidden space-y-2 p-2.5 ${SURFACE_GLASS_CARD_COMPACT_CLASS}`
  const saveWindowScroll = useCallback(() => {
    scrollPositionRef.current = { x: window.scrollX, y: window.scrollY }
  }, [])
  const restoreWindowScroll = useCallback(() => {
    const scrollPosition = scrollPositionRef.current

    requestAnimationFrame(() => {
      window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: 'auto' })
    })
  }, [])
  const restoreWindowScrollAfterSubmit = useCallback((scrollPosition: { x: number; y: number }) => {
    requestAnimationFrame(() => {
      window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: 'auto' })
    })
    window.setTimeout(() => {
      window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: 'auto' })
    }, 50)
    window.setTimeout(() => {
      window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: 'auto' })
    }, 150)
  }, [])
  const saveSubmitScrollPosition = useCallback(() => {
    submitScrollPositionRef.current = { x: window.scrollX, y: window.scrollY }
  }, [])
  const prepareSubmitScrollRestore = useCallback(() => {
    saveSubmitScrollPosition()
    submitScrollAnchorRef.current = captureScrollAnchor(cardRef.current, cardAnchorSelector)
    onSubmitScrollAnchorCapture?.(submitScrollAnchorRef.current)
  }, [cardAnchorSelector, onSubmitScrollAnchorCapture, saveSubmitScrollPosition])
  const submitWithoutScrollJump = useCallback(() => {
    const scrollPosition = submitScrollPositionRef.current
    const scrollAnchor = submitScrollAnchorRef.current
    const restoreAfterLayoutChange = () => {
      if (scrollAnchor) {
        restoreScrollAnchor(scrollAnchor)
        return
      }

      restoreWindowScrollAfterSubmit(scrollPosition)
    }
    const result = onSubmit()
    const clearAnchor = () => onSubmitScrollAnchorClear?.(scrollAnchor)

    restoreAfterLayoutChange()

    if (result instanceof Promise) {
      void result.finally(() => {
        restoreAfterLayoutChange()
        clearAnchor()
      })
      return
    }

    clearAnchor()
  }, [onSubmit, onSubmitScrollAnchorClear, restoreWindowScrollAfterSubmit])

  return (
    <div ref={cardRef} data-sub-question-card-id={cardAnchorId} className={cardClassName}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex select-none items-center gap-2">
            <p className={`text-[10px] uppercase tracking-[0.18em] ${completed ? 'text-gray-500' : 'text-blue-400/80'}`}>
              Question #{question.order_number}
            </p>
            {completed && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border bg-green-900/50 text-green-400 border-green-800">
                Completed
              </span>
            )}
            {!completed && !current && (
              <span className="shrink-0 rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-300">
                Pending
              </span>
            )}
          </div>
          <div className={`mt-1 max-w-full select-text overflow-x-auto break-words text-sm font-semibold ${completed ? 'text-gray-200' : 'text-white'}`}>
            <QuestionMarkdown content={questionContent} />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={answer}
          onMouseDown={completed ? undefined : saveWindowScroll}
          onTouchStart={completed ? undefined : saveWindowScroll}
          onFocus={completed ? undefined : restoreWindowScroll}
          onChange={
            completed
              ? undefined
              : (event) => {
                saveWindowScroll()
                onAnswerChange(event.target.value)
                restoreWindowScroll()
              }
          }
          placeholder={completed ? 'Answer saved' : 'Type your answer...'}
          readOnly={completed}
          className={
            completed
              ? `${SURFACE_GLASS_FIELD_COMPACT_CLASS} flex-1 cursor-not-allowed text-gray-400`
              : current
                ? `${SURFACE_GLASS_FIELD_COMPACT_CLASS} flex-1`
                : `${SURFACE_GLASS_FIELD_COMPACT_CLASS} flex-1`
          }
          onKeyDown={(event) => {
            if (!completed && event.key === 'Enter') {
              event.preventDefault()
              prepareSubmitScrollRestore()
              submitWithoutScrollJump()
            }
          }}
        />
        {!completed && (
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault()
              prepareSubmitScrollRestore()
            }}
            onTouchStart={prepareSubmitScrollRestore}
            onClick={submitWithoutScrollJump}
            disabled={submitting || !answer?.trim()}
            className="select-none rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting ? '...' : 'Check'}
          </button>
        )}
      </div>

      {!completed && typeof result === 'boolean' && result === false && answer?.trim() && (
        <p className="select-none text-xs font-semibold text-red-300">x Incorrect</p>
      )}
    </div>
  )
}

export default function SubChallengePanel({
  challengeId,
  loaded,
  loading,
  submitting,
  mode,
  questions,
  nextQuestion,
  answers,
  results,
  completed,
  flag,
  message,
  onAnswerChange,
  onSubmit,
  onReset,
}: SubChallengePanelProps) {
  const [copiedFlag, setCopiedFlag] = useState<Record<string, boolean>>({})
  const pendingScrollAnchorRef = useRef<ScrollAnchorSnapshot | null>(null)
  const pendingScrollAnchorClearTimerRef = useRef<number | null>(null)
  const submitAllButtonRef = useRef<HTMLButtonElement>(null)
  const submitAllScrollPositionRef = useRef({ x: 0, y: 0 })
  const submitAllScrollAnchorRef = useRef<ScrollAnchorSnapshot | null>(null)
  const subChallengeFlagCopyKey = `${challengeId}-sub-flag`
  const hasQuestions =
    mode === 'non_sequential'
      ? questions.length > 0
      : mode === 'sequential'
        ? !!nextQuestion || completed
        : false
  const isShowingEmptyQuestionMessage = !loading && loaded && !hasQuestions
  const capturePendingScrollAnchor = useCallback((snapshot: ScrollAnchorSnapshot | null) => {
    if (pendingScrollAnchorClearTimerRef.current) {
      window.clearTimeout(pendingScrollAnchorClearTimerRef.current)
      pendingScrollAnchorClearTimerRef.current = null
    }

    pendingScrollAnchorRef.current = snapshot
    restoreScrollAnchor(snapshot)
  }, [])
  const clearPendingScrollAnchor = useCallback((snapshot: ScrollAnchorSnapshot | null) => {
    if (!snapshot) return

    if (pendingScrollAnchorClearTimerRef.current) {
      window.clearTimeout(pendingScrollAnchorClearTimerRef.current)
    }

    pendingScrollAnchorClearTimerRef.current = window.setTimeout(() => {
      if (pendingScrollAnchorRef.current === snapshot) {
        pendingScrollAnchorRef.current = null
      }
      pendingScrollAnchorClearTimerRef.current = null
    }, 500)
  }, [])
  const saveSubmitAllScrollPosition = useCallback(() => {
    submitAllScrollPositionRef.current = { x: window.scrollX, y: window.scrollY }
  }, [])
  const prepareSubmitAllScrollRestore = useCallback(() => {
    saveSubmitAllScrollPosition()
    submitAllScrollAnchorRef.current = captureScrollAnchor(submitAllButtonRef.current)
    capturePendingScrollAnchor(submitAllScrollAnchorRef.current)
  }, [capturePendingScrollAnchor, saveSubmitAllScrollPosition])
  const submitAllWithoutScrollJump = useCallback(() => {
    const scrollPosition = submitAllScrollPositionRef.current
    const scrollAnchor = submitAllScrollAnchorRef.current
    const restoreAfterLayoutChange = () => {
      if (scrollAnchor) {
        restoreScrollAnchor(scrollAnchor)
        return
      }

      requestAnimationFrame(() => {
        window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: 'auto' })
      })
      window.setTimeout(() => {
        window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: 'auto' })
      }, 50)
      window.setTimeout(() => {
        window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: 'auto' })
      }, 150)
    }
    const result = onSubmit()
    const clearAnchor = () => clearPendingScrollAnchor(scrollAnchor)

    restoreAfterLayoutChange()

    if (result instanceof Promise) {
      void result.finally(() => {
        restoreAfterLayoutChange()
        clearAnchor()
      })
      return
    }

    clearAnchor()
  }, [clearPendingScrollAnchor, onSubmit])

  useLayoutEffect(() => {
    restoreScrollAnchor(pendingScrollAnchorRef.current)
  }, [completed, flag, message, nextQuestion, questions, results, submitting])

  useLayoutEffect(() => {
    return () => {
      if (pendingScrollAnchorClearTimerRef.current) {
        window.clearTimeout(pendingScrollAnchorClearTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-3 min-w-0 overflow-x-hidden">
      {loading && !hasQuestions && (
        <div className="select-none text-sm text-gray-300">Loading questions...</div>
      )}

      {isShowingEmptyQuestionMessage && (
        <div className="select-none text-sm text-gray-300">
          {message || 'No sub-question configured for this challenge.'}
        </div>
      )}

      {!loading && mode !== 'none' && (
        <div className="space-y-2.5">
          {mode === 'non_sequential' ? (
            questions.map((question) => {
              const orderKey = String(question.order_number)
              const isCompleted = results[orderKey] === true

              return (
                <QuestionCard
                  key={question.order_number}
                  cardAnchorId={`${challengeId}-${question.order_number}`}
                  question={question}
                  answer={answers[orderKey] || ''}
                  result={results[orderKey]}
                  submitting={submitting}
                  completed={isCompleted}
                  onAnswerChange={(value) => onAnswerChange(question.order_number, value)}
                  onSubmit={() => onSubmit(question.order_number)}
                  onSubmitScrollAnchorCapture={capturePendingScrollAnchor}
                  onSubmitScrollAnchorClear={clearPendingScrollAnchor}
                />
              )
            })
          ) : (
            <>
              {questions.filter((question) => results[String(question.order_number)] === true).map((question) => (
                <QuestionCard
                  key={question.order_number}
                  cardAnchorId={`${challengeId}-${question.order_number}`}
                  question={question}
                  answer={answers[String(question.order_number)] || ''}
                  result={results[String(question.order_number)]}
                  submitting={submitting}
                  completed
                  onAnswerChange={() => { }}
                  onSubmit={() => { }}
                  onSubmitScrollAnchorCapture={capturePendingScrollAnchor}
                  onSubmitScrollAnchorClear={clearPendingScrollAnchor}
                />
              ))}

              {!completed && nextQuestion && (
                <QuestionCard
                  cardAnchorId={`${challengeId}-${nextQuestion.order_number}`}
                  question={nextQuestion}
                  answer={answers[String(nextQuestion.order_number)] || ''}
                  result={results[String(nextQuestion.order_number)]}
                  submitting={submitting}
                  completed={false}
                  current
                  onAnswerChange={(value) => onAnswerChange(nextQuestion.order_number, value)}
                  onSubmit={() => onSubmit(nextQuestion.order_number)}
                  onSubmitScrollAnchorCapture={capturePendingScrollAnchor}
                  onSubmitScrollAnchorClear={clearPendingScrollAnchor}
                />
              )}
            </>
          )}
        </div>
      )}

      {hasQuestions && !completed && mode === 'non_sequential' && (
        <button
          ref={submitAllButtonRef}
          type="button"
          disabled={submitting || !Object.values(answers).some((value) => value?.trim())}
          onMouseDown={(event) => {
            event.preventDefault()
            prepareSubmitAllScrollRestore()
          }}
          onTouchStart={prepareSubmitAllScrollRestore}
          onClick={submitAllWithoutScrollJump}
          className="select-none rounded-xl border border-blue-500/30 bg-blue-600/90 px-5 py-2 font-bold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-500 disabled:opacity-50"
        >
          {submitting ? '...' : 'Submit All Answers'}
        </button>
      )}

      {message && !isShowingEmptyQuestionMessage && (
        <div className="select-none rounded-xl border border-blue-500/20 bg-blue-500/10 p-2 text-sm font-semibold text-gray-100">
          {message}
        </div>
      )}

      {completed && !flag && (
        <div className="select-none p-2 rounded text-sm font-semibold bg-green-600 text-white">
          All questions correct.
        </div>
      )}
    </div>
  )
}
