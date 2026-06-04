"use client"

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ShieldCheck, Users } from 'lucide-react'
import { AdminContentLoading, AdminPageShell, AdminStickyToolbar, AdminTabs } from '../../ui'
import { useAdminUsersData } from '../hooks/useAdminUsersData'
import UserRolesTab from './UserRolesTab'
import UsersTableCard from './UsersTableCard'

type AdminUsersTab = 'users' | 'roles'

const USER_TABS = [
  { value: 'users' as const, label: 'Users', icon: Users },
  { value: 'roles' as const, label: 'Roles', icon: ShieldCheck },
]

export default function AdminUsersPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<AdminUsersTab>(
    searchParams.get('tab') === 'roles' ? 'roles' : 'users',
  )
  const { user, authLoading, accessReady, isAllowed, isLoading, users } = useAdminUsersData()

  useEffect(() => {
    if (searchParams.get('tab') === 'roles') setActiveTab('roles')
  }, [searchParams])

  if (authLoading || !accessReady) return <AdminContentLoading variant="users" />
  if (!user || !isAllowed) return null

  if (isLoading) {
    return (
      <AdminPageShell>
        <AdminContentLoading variant="users" />
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell>
      <AdminStickyToolbar
        tabs={
            <AdminTabs
              items={USER_TABS}
              value={activeTab}
              onChange={setActiveTab}
            />
        }
      />

      <div className="space-y-0 mt-2">
        {activeTab === 'users' ? (
          <UsersTableCard users={users} />
        ) : (
          <UserRolesTab />
        )}
      </div>
    </AdminPageShell>
  )
}
