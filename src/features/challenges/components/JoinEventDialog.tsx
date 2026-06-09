"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog"
import { Button, Input } from "@/shared/ui"
import { DIALOG_GLASS_CONTENT_MD_CLASS } from "@/shared/styles"
import { Event } from "@/shared/types"
import { joinEvent } from "@/features/events/services/event.service"
import toast from "react-hot-toast"

type JoinEventDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event | null
  joinMode: 'open' | 'key' | 'request'
  membershipData: any
  onSuccess: () => void
}

export default function JoinEventDialog({
  open,
  onOpenChange,
  event,
  joinMode,
  membershipData,
  onSuccess,
}: JoinEventDialogProps) {
  const [loading, setLoading] = useState(false)
  const [joinKey, setJoinKey] = useState("")
  const [joinNote, setJoinNote] = useState("")

  const handleJoin = async () => {
    if (!event) return

    if (joinMode === 'key' && !joinKey.trim()) {
      toast.error('Join key is required')
      return
    }

    setLoading(true)
    try {
      const result = await joinEvent(
        event.id,
        joinMode === 'key' ? joinKey.trim() : null,
        joinMode === 'request' ? joinNote.trim() : null
      )
      if (result?.success) {
        toast.success(result.message || 'Join request submitted')
        onSuccess()
      } else {
        toast.error(result?.message || 'Failed to join event')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to join event')
    } finally {
      setLoading(false)
    }
  }

  const isPending = membershipData?.request_status === 'pending'
  const isRejected = membershipData?.request_status === 'rejected'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_GLASS_CONTENT_MD_CLASS}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Join Event
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleJoin() }}>
          <div className="space-y-5 my-4">
            <div className="p-4 bg-blue-500/[0.03] border border-blue-500/10 rounded-xl">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                {event?.name || 'Unknown Event'}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                You need to join this event to access its challenges. Follow the requirements below to proceed.
              </p>
            </div>

            {joinMode === 'key' && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Event Access Key
                </label>
                <Input
                  value={joinKey}
                  onChange={(e) => setJoinKey(e.target.value)}
                  placeholder="Enter access key..."
                  autoFocus
                />
              </div>
            )}

            {joinMode === 'request' && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Join Request Note
                </label>
                <textarea
                  value={joinNote}
                  onChange={(e) => setJoinNote(e.target.value)}
                  placeholder="Tell us why you'd like to join..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200/80 bg-white px-4 py-2.5 text-sm text-gray-900 caret-blue-500 shadow-sm outline-none transition-all placeholder:text-gray-500 hover:border-blue-500/40 focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/30 resize-none dark:border-gray-700/80 dark:bg-[#111622]/80 dark:text-gray-100"
                  autoFocus
                />
              </div>
            )}

            {isPending ? (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-xl flex items-center justify-center">
                Your request is currently pending admin approval.
              </div>
            ) : isRejected ? (
              <div className="p-3 bg-red-500/5 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl flex items-center justify-center">
                Your previous request was declined. You can try again.
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all"
            >
              {loading ? "Processing..." : joinMode === 'request' ? 'Submit Request' : joinMode === 'key' ? 'Verify & Join' : 'Join Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
