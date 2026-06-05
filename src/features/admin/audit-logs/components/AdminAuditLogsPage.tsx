"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, KeyRound } from 'lucide-react'
import { useAuth } from '@/shared/contexts'
import { AuthService } from '@/features/auth'
import { AdminContentLoading, AdminPageShell, AdminTabs } from '../../ui'
import AuthAuditLogList from './AuthAuditLogList'
import AuditLogList from './AuditLogList'

type AuditLogTab = 'admin' | 'auth'

export default function AdminAuditLogsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [accessReady, setAccessReady] = useState(false)
  const [isAllowed, setIsAllowed] = useState(false)
  const [activeTab, setActiveTab] = useState<AuditLogTab>('admin')

  useEffect(() => {
    let mounted = true
    const checkAccess = async () => {
      if (authLoading) return
      if (!user) {
        setAccessReady(true)
        router.push('/challenges')
        return
      }

      const adminCheck = await AuthService.isGlobalAdmin()
      if (!mounted) return
      setIsAllowed(adminCheck)
      setAccessReady(true)
      if (!adminCheck) {
        router.push('/challenges')
      }
    }
    checkAccess()
    return () => { mounted = false }
  }, [authLoading, user, router])

  if (authLoading || !accessReady) return <AdminContentLoading variant="challenges" />
  if (!user || !isAllowed) return null

  const tabsElement = (
    <AdminTabs<AuditLogTab>
      stretch
      className="w-full sm:w-fit"
      value={activeTab}
      onChange={setActiveTab}
      items={[
        { value: 'admin', label: 'Admin Logs', icon: ClipboardList },
        { value: 'auth', label: 'Auth Logs', icon: KeyRound },
      ]}
    />
  )

  return (
    <AdminPageShell>
      {activeTab === 'admin'
        ? <AuditLogList tabs={tabsElement} />
        : <AuthAuditLogList tabs={tabsElement} />
      }
    </AdminPageShell>
  )
}
