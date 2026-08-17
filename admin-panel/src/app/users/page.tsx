"use client"
import React, { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import {
  UserPlus, Shield, Mail, Edit3, Trash2,
  CheckCircle2, Circle, XCircle, X, Search, RefreshCw,
  User, BookOpen, AlertCircle, Clock, Check, UserMinus, ShieldAlert
} from 'lucide-react'

export default function UsersPage() {
  const { user: currentUser, token, isLoading: authLoading } = useAuth()
  const apiFetch = useApi()
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [allPermissions, setAllPermissions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'inactive'>('all')

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isInitialLoadRef = React.useRef(true)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const isAdmin = currentUser?.role?.name?.toUpperCase() === 'ADMIN' || 
    currentUser?.role?.name?.toUpperCase() === 'SUPER ADMIN' || 
    currentUser?.role?.name?.toUpperCase() === 'HR MANAGER'
  const isManager = currentUser?.role?.name?.toUpperCase() === 'MANAGER'

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  
  // Forms
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    fullName: '', email: '', password: '', roleId: '', managerId: '',
    highestQualification: '', dateOfBirth: '', joiningDate: '',
    personalMobile: '', homeMobile: ''
  })
  const [createError, setCreateError] = useState('')

  const [editForm, setEditForm] = useState({ roleId: '', managerId: '', isActive: true, extraPermissionIds: [] as string[] })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async (isSilent = false) => {
    if (isInitialLoadRef.current && !isSilent) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }

    try {
      const [usersRes, rolesRes, permsRes] = await Promise.all([
        apiFetch('/api/v1/users'),
        apiFetch('/api/v1/roles'),
        apiFetch('/api/v1/permissions')
      ])
      const usersData = await usersRes.json()
      const rolesData = await rolesRes.json()
      const permsData = await permsRes.json()
      const newUsers = Array.isArray(usersData) ? usersData : []

      setUsers(newUsers)
      setRoles(Array.isArray(rolesData) ? rolesData : [])
      setAllPermissions(Array.isArray(permsData) ? permsData : [])
      isInitialLoadRef.current = false

      // Preserve valid selections (only remove IDs of users that were actually deleted)
      setSelectedIds(prev => {
        const valid = new Set<string>()
        const newUserIds = new Set(newUsers.map((u: any) => u.id))
        prev.forEach(id => {
          if (newUserIds.has(id)) valid.add(id)
        })
        return valid
      })
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [apiFetch])

  useEffect(() => {
    if (!authLoading && token && isInitialLoadRef.current) {
      fetchData()
    }
  }, [authLoading, token, fetchData])

  // Filtered users list
  const filtered = users.filter(u => {
    const matchesSearch = u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.role?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    if (filter === 'pending') return matchesSearch && !u.isActive
    if (filter === 'active') return matchesSearch && u.isActive
    if (filter === 'inactive') return matchesSearch && !u.isActive
    return matchesSearch
  })

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(u => u.id)))
    }
  }

  const toggleSelectUser = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  // Bulk Actions handler
  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedIds.size === 0) return

    if (action === 'delete') {
      const confirmDelete = window.confirm(
        `Are you sure you want to PERMANENTLY DELETE ${selectedIds.size} selected user(s)?\n\nThis will remove them completely from both the Database AND Supabase Auth!`
      )
      if (!confirmDelete) return
    }

    setBulkActionLoading(true)
    setNotification(null)

    try {
      const res = await apiFetch('/api/v1/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action,
          userIds: Array.from(selectedIds)
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Bulk action failed.')
      }

      setNotification({ type: 'success', message: data.message })
      fetchData(true)
    } catch (err: any) {
      console.error('Bulk action error:', err)
      setNotification({ type: 'error', message: err.message || 'Bulk action failed.' })
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Single User Permanent Delete handler
  const handleSingleDelete = async (user: any) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to PERMANENTLY DELETE user "${user.fullName}" (${user.email})?\n\nThis will delete them from both the database AND Supabase Auth!`
    )
    if (!confirmDelete) return

    try {
      const res = await apiFetch(`/api/v1/users/${user.id}?permanent=true`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete user.')
      }
      setNotification({ type: 'success', message: `User "${user.fullName}" deleted permanently.` })
      fetchData(true)
    } catch (err: any) {
      console.error('Delete user error:', err)
      setNotification({ type: 'error', message: err.message || 'Failed to delete user.' })
    }
  }

  // Sync Supabase Auth handler
  const handleSyncSupabase = async () => {
    setSyncLoading(true)
    setNotification(null)

    try {
      const res = await apiFetch('/api/v1/users/bulk', {
        method: 'POST',
        body: JSON.stringify({ action: 'sync_supabase' })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Supabase sync failed.')
      }

      setNotification({ type: 'success', message: data.message })
      fetchData(true)
    } catch (err: any) {
      console.error('Sync error:', err)
      setNotification({ type: 'error', message: err.message || 'Supabase sync failed.' })
    } finally {
      setSyncLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      const res = await apiFetch('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify(createForm)
      })
      const data = await res.json()
      if (!res.ok) setCreateError(data.error || 'Failed to create user')
      else {
        setShowCreateModal(false)
        setCreateForm({ fullName: '', email: '', password: '', roleId: '', managerId: '', highestQualification: '', dateOfBirth: '', joiningDate: '', personalMobile: '', homeMobile: '' })
        fetchData(true)
      }
    } catch {
      setCreateError('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const res = await apiFetch(`/api/v1/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: true })
      })
      if (res.ok) fetchData(true)
    } catch (err) {
      console.error(err)
    }
  }

  const handleEditSave = async () => {
    if (!editUser) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/v1/users/${editUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        setEditUser(null)
        fetchData(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (user: any) => {
    setEditUser(user)
    setEditForm({
      roleId: user.role?.id || '',
      managerId: user.managerId || '',
      isActive: user.isActive,
      extraPermissionIds: user.permissions?.map((p: any) => p.id) || []
    })
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500 mt-1">{users.length} registered accounts</p>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-xl">
               <button onClick={() => setFilter('all')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>All ({users.length})</button>
               <button onClick={() => setFilter('active')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'active' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>Active ({users.filter(u => u.isActive).length})</button>
               <button onClick={() => setFilter('inactive')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'inactive' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500'}`}>Inactive / Retired ({users.filter(u => !u.isActive).length})</button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync with Supabase Auth Button */}
            {isAdmin && (
              <button
                onClick={handleSyncSupabase}
                disabled={syncLoading}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                title="Sync and remove database users that no longer exist in Supabase Auth"
              >
                <RefreshCw size={14} className={syncLoading ? 'animate-spin' : ''} />
                {syncLoading ? 'Syncing...' : 'Sync Supabase Auth'}
              </button>
            )}

            <button onClick={() => fetchData(true)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all" title="Reload list">
              <RefreshCw size={18} className={(isLoading || isRefreshing) ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-all font-semibold text-xs cursor-pointer"
            >
              <UserPlus size={16} /> Add New User
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className={`px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-sm font-semibold border ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-rose-600" />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Search & Bulk Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-80 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-2.5 flex items-center gap-3">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              className="flex-1 bg-transparent border-none outline-none text-xs font-semibold text-gray-800"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Bulk Action Controls Bar */}
          {selectedIds.size > 0 && isAdmin && (
            <div className="w-full sm:w-auto bg-slate-900 text-white px-4 py-2 rounded-2xl flex items-center justify-between sm:justify-end gap-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
              <span className="text-xs font-bold text-slate-300">
                {selectedIds.size} Selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Deactivate / Retire
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  disabled={bulkActionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <User size={40} className="mb-3 text-gray-200" />
              <p className="font-semibold text-sm">No accounts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {isAdmin && (
                      <th className="px-4 py-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filtered.length && filtered.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-6 py-4">Employee</th>
                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-4 py-4">Role</th>
                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-4 py-4">Status</th>
                    <th className="text-right text-xs font-bold text-gray-400 uppercase tracking-widest px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(user => (
                    <tr key={user.id} className={`hover:bg-gray-50/50 transition-colors ${selectedIds.has(user.id) ? 'bg-blue-50/30' : ''}`}>
                      {isAdmin && (
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(user.id)}
                            onChange={() => toggleSelectUser(user.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                            {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-gray-900">{user.fullName}</p>
                            <p className="text-[11px] text-gray-400 font-medium">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-gray-200">
                          {user.role?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-200">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-[11px] font-bold border border-rose-200">
                            <Clock size={12} /> Inactive / Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {!user.isActive && isAdmin && (
                            <button onClick={() => handleApprove(user.id)} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 shadow-sm cursor-pointer">
                              <Check size={13} /> Approve
                            </button>
                          )}
                          <button onClick={() => openEdit(user)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer" title="Edit User">
                            <Edit3 size={15}/>
                          </button>
                          {isAdmin && (
                            <button onClick={() => handleSingleDelete(user)} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer" title="Delete User (DB & Supabase Auth)">
                              <Trash2 size={15}/>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Create User Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-10 animate-in zoom-in duration-200">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h2 className="text-2xl font-black text-gray-900 tracking-tight">Add New Employee Account</h2>
                   {isManager && <p className="text-sm text-amber-600 font-medium mt-1 italic">Note: Accounts created by Managers require Admin Approval.</p>}
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all"><X size={24}/></button>
             </div>
             
             <form onSubmit={handleCreateUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Account Credentials</label>
                      <input type="text" placeholder="Full Name" required value={createForm.fullName} onChange={e => setCreateForm({...createForm, fullName: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none transition-all" />
                      <input type="email" placeholder="Work Email" required value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none transition-all" />
                      <input type="password" placeholder="Temporary Password" required value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none transition-all" />
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Role Assignment</label>
                      <select 
                        disabled={isManager}
                        value={isManager ? (roles.find(r => r.name === 'EXECUTIVE')?.id || '') : createForm.roleId} 
                        onChange={e => setCreateForm({...createForm, roleId: e.target.value})} 
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none"
                      >
                         {isManager ? (
                           <option value="">EXECUTIVE</option>
                         ) : (
                           <>
                             <option value="">Select Role</option>
                             {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                           </>
                         )}
                      </select>
                      
                      {!isManager && (
                        <select value={createForm.managerId} onChange={e => setCreateForm({...createForm, managerId: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none">
                           <option value="">No Manager (Direct)</option>
                           {users.filter(u => u.role?.name?.toUpperCase() === 'MANAGER').map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                        </select>
                      )}
                      
                      <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl">
                         <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                           {isManager 
                             ? "As a Manager, you are adding an Executive to your team. They will be active once approved by the Super Admin."
                             : "Admins can create active accounts and assign reporting managers immediately."
                           }
                         </p>
                      </div>
                   </div>
                </div>

                {createError && <p className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 flex items-center gap-2"><AlertCircle size={14}/> {createError}</p>}
                
                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 text-gray-400 font-black tracking-widest uppercase text-[10px] hover:bg-gray-50 rounded-2xl transition-all cursor-pointer">Dismiss</button>
                   <button type="submit" disabled={creating} className="flex-1 py-4 bg-gray-900 text-white font-black tracking-widest uppercase text-[10px] rounded-2xl shadow-2xl shadow-gray-200 hover:bg-black transition-all cursor-pointer">
                      {creating ? 'Processing...' : 'Complete Registration'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10">
              <h2 className="text-xl font-black text-gray-900 mb-6">Modify Account Access</h2>
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Account Status</label>
                    <div className="flex gap-3">
                       <button onClick={() => setEditForm({...editForm, isActive: true})} className={`flex-1 py-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${editForm.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>Active</button>
                       <button onClick={() => setEditForm({...editForm, isActive: false})} className={`flex-1 py-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${!editForm.isActive ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>Inactive / Retired</button>
                    </div>
                 </div>
                 
                 <div className="flex gap-3 pt-2">
                    <button onClick={() => setEditUser(null)} className="flex-1 py-3 font-bold text-xs text-gray-400 cursor-pointer">Cancel</button>
                    <button onClick={handleEditSave} disabled={saving} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] tracking-widest uppercase cursor-pointer">Apply Changes</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </AdminLayout>
  )
}
