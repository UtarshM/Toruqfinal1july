"use client"
import React, { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import {
  UserPlus, Shield, Mail, Edit3, Trash2,
  CheckCircle2, Circle, XCircle, X, Search, RefreshCw,
  User, BookOpen, AlertCircle, Clock, Check, UserMinus, ShieldAlert,
  Key, Eye, EyeOff, Phone, Calendar, GraduationCap, Building2,
  Briefcase, FileText, ChevronRight, Lock, ExternalLink, Copy, Sparkles,
  Download, FileDown, FileCheck, Image as ImageIcon,
  RotateCcw, AlertTriangle, MessageSquare, Send
} from 'lucide-react'
import { formatDateDMY } from '@/lib/date-format'
import { getFriendlyDocName, getGoogleDriveEmbedUrl, getDocTypeInfo, resolveDocUrl } from '@/lib/document-utils'

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

  const roleName = (currentUser?.role?.name || (typeof currentUser?.role === 'string' ? currentUser.role : '')).toUpperCase()
  const isHr = roleName.includes('HR') || roleName === 'HR MANAGER'
  const isAdmin = roleName.includes('ADMIN') || roleName.includes('SUPER') || isHr
  const isManager = (roleName === 'MANAGER' || roleName.includes('MANAGER')) && !isHr

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  
  // Profile Modal State
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [isCompilingPdf, setIsCompilingPdf] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<any>(null)

  // Revert / Request Clarification Modal State
  const [revertUser, setRevertUser] = useState<any>(null)
  const [revertText, setRevertText] = useState('')
  const [revertPauseAccess, setRevertPauseAccess] = useState(false)
  const [revertLoading, setRevertLoading] = useState(false)
  const [revertError, setRevertError] = useState('')

  // Password Modal State
  const [passwordUser, setPasswordUser] = useState<any>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Forms
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    fullName: '', email: '', password: '', roleId: '', managerId: '',
    highestQualification: '', dateOfBirth: '', joiningDate: '',
    personalMobile: '', homeMobile: ''
  })
  const [createError, setCreateError] = useState('')

  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    personalMobile: '',
    homeMobile: '',
    highestQualification: '',
    dateOfBirth: '',
    joiningDate: '',
    onboardingRemark: '',
    roleId: '',
    managerId: '',
    isActive: true,
    extraPermissionIds: [] as string[]
  })
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

      // Preserve valid selections
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
      if (selectedUserProfile?.id === user.id) {
        setSelectedUserProfile(null)
      }
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
      const cleanEmail = createForm.email.trim().toLowerCase()
      const cleanFullName = createForm.fullName.trim() || cleanEmail.split('@')[0]
      const res = await apiFetch('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify({
          ...createForm,
          fullName: cleanFullName,
          email: cleanEmail,
          password: createForm.password.trim() || undefined,
          isActive: true
        })
      })
      const data = await res.json()
      if (!res.ok) setCreateError(data.error || 'Failed to create user')
      else {
        setShowCreateModal(false)
        setCreateForm({ fullName: '', email: '', password: '', roleId: '', managerId: '', highestQualification: '', dateOfBirth: '', joiningDate: '', personalMobile: '', homeMobile: '' })
        setNotification({
          type: 'success',
          message: `User account (${cleanEmail}) created successfully! They can log in immediately with Email & OTP (dispatched to torqueotp@yahoo.com).`
        })
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

  // Open Full Profile Modal
  const handleOpenProfile = async (user: any) => {
    setSelectedUserProfile(user)
    setProfileLoading(true)
    try {
      const res = await apiFetch(`/api/v1/users/${user.id}`)
      if (res.ok) {
        const fullData = await res.json()
        setSelectedUserProfile(fullData)
      }
    } catch (err) {
      console.error('Failed to fetch full user profile:', err)
    } finally {
      setProfileLoading(false)
    }
  }

  // Open Password Modal
  const handleOpenPasswordModal = (user: any) => {
    setPasswordUser(user)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
    setShowNewPassword(false)
  }

  // Quick Random Password Generator
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let rand = ''
    for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length))
    const generated = `Torque@${new Date().getFullYear()}${rand}`
    setNewPassword(generated)
    setConfirmPassword(generated)
    setShowNewPassword(true)
  }

  // Copy credentials to send to user
  const handleCopyCredentials = (u: any, pwd?: string) => {
    const p = pwd || newPassword || '••••••••'
    const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://app.torqueadvisors.com/login'
    const text = `🔐 Torque Auto Advisors Employee Login\n━━━━━━━━━━━━━━━━━━━━━━━━━\n👤 Name: ${u.fullName}\n📧 Email: ${u.email}\n🔑 Password: ${p}\n🌐 Login URL: ${loginUrl}\n━━━━━━━━━━━━━━━━━━━━━━━━━\nPlease log in and update your account details.`
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text)
    }
    setNotification({
      type: 'success',
      message: `Login credentials for ${u.fullName} copied to clipboard! You can now send them to the employee via WhatsApp or Email.`
    })
  }

  // Download All KYC Documents as 1 Merged PDF
  const handleDownloadAllPdf = async (userId: string, userName: string) => {
    setIsCompilingPdf(true)
    try {
      const res = await fetch(`/api/v1/users/${userId}/compile-pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to compile single PDF')
      }
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      const safeName = (userName || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_')
      link.setAttribute('download', `${safeName}_Complete_KYC_Dossier.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      setNotification({
        type: 'success',
        message: `All KYC documents for ${userName} compiled into a single PDF and downloaded!`
      })
    } catch (err: any) {
      console.error('PDF download error:', err)
      setNotification({
        type: 'error',
        message: err.message || 'Failed to download compiled PDF'
      })
    } finally {
      setIsCompilingPdf(false)
    }
  }

  // Download Individual Document
  const handleDownloadSingleDoc = (userId: string, userName: string, doc: any) => {
    if (doc.id) {
      const downloadUrl = `/api/v1/users/${userId}/documents/${doc.id}?download=true`
      window.open(downloadUrl, '_blank')
      return
    }
    const rawUrl = resolveDocUrl(doc)
    if (rawUrl) window.open(rawUrl, '_blank')
  }

  // Open Document in Preview Modal
  const handleOpenDoc = (doc: any) => {
    setPreviewDoc(doc)
  }

  // Open Revert Modal
  const handleOpenRevertModal = (u: any) => {
    setRevertUser(u)
    setRevertText(u.onboardingRemark || '')
    setRevertPauseAccess(u.isActive === false)
    setRevertError('')
  }

  // Submit Revert Request
  const handleSubmitRevert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!revertUser) return
    if (!revertText.trim()) {
      setRevertError('Please enter the reason or documents required for reversion.')
      return
    }

    setRevertLoading(true)
    setRevertError('')
    try {
      const res = await apiFetch(`/api/v1/users/${revertUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          onboardingRemark: revertText.trim(),
          ...(revertPauseAccess ? { isActive: false } : {})
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit revert request')

      // Update local states
      if (selectedUserProfile?.id === revertUser.id) {
        setSelectedUserProfile((prev: any) => ({
          ...prev,
          onboardingRemark: revertText.trim(),
          ...(revertPauseAccess ? { isActive: false } : {})
        }))
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === revertUser.id
            ? { ...u, onboardingRemark: revertText.trim(), ...(revertPauseAccess ? { isActive: false } : {}) }
            : u
        )
      )

      setNotification({
        type: 'success',
        message: `Profile for ${revertUser.fullName} has been reverted with requested changes.`
      })
      setRevertUser(null)
    } catch (err: any) {
      setRevertError(err.message || 'Failed to revert profile.')
    } finally {
      setRevertLoading(false)
    }
  }

  // Clear Revert / Approve
  const handleClearRevert = async (u: any) => {
    try {
      const res = await apiFetch(`/api/v1/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          onboardingRemark: null,
          isActive: true
        })
      })
      if (!res.ok) throw new Error('Failed to approve profile')

      if (selectedUserProfile?.id === u.id) {
        setSelectedUserProfile((prev: any) => ({
          ...prev,
          onboardingRemark: null,
          isActive: true
        }))
      }
      setUsers((prev) =>
        prev.map((usr) => (usr.id === u.id ? { ...usr, onboardingRemark: null, isActive: true } : usr))
      )
      setNotification({
        type: 'success',
        message: `Reversion cleared. ${u.fullName} is now active and approved!`
      })
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to approve profile' })
    }
  }

  // Copy WhatsApp Revert Message
  const handleCopyRevertWhatsApp = (u: any, text: string) => {
    const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/onboarding/form` : 'https://app.torqueadvisors.com/onboarding/form'
    const msg = `⚠️ Torque Auto Advisors - Document / Profile Reversion\n━━━━━━━━━━━━━━━━━━━━━━━━━\nHello ${u.fullName},\n\nYour profile and KYC submission have been reviewed by our Administration team.\n\n📌 Action Required:\n👉 ${text}\n\n🔗 Please update and re-upload here:\n${portalUrl}\n━━━━━━━━━━━━━━━━━━━━━━━━━\nThank you.`
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(msg)
    }
    setNotification({
      type: 'success',
      message: 'Reversion notice copied to clipboard! You can send it directly via WhatsApp/Email.'
    })
  }

  // Send WhatsApp Revert Message
  const handleSendRevertWhatsApp = (u: any, text: string) => {
    const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/onboarding/form` : 'https://app.torqueadvisors.com/onboarding/form'
    const msg = `⚠️ Torque Auto Advisors - Document / Profile Reversion\n━━━━━━━━━━━━━━━━━━━━━━━━━\nHello ${u.fullName},\n\nYour profile and KYC submission have been reviewed by our Administration team.\n\n📌 Action Required:\n👉 ${text}\n\n🔗 Please update and re-upload here:\n${portalUrl}\n━━━━━━━━━━━━━━━━━━━━━━━━━\nThank you.`
    const phone = (u.personalMobile || '').replace(/\D/g, '')
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  // Submit Password Change
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordUser) return

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordLoading(true)
    setPasswordError('')

    try {
      const res = await apiFetch(`/api/v1/users/${passwordUser.id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.')
      }

      const targetUserCopy = passwordUser
      const savedPasswordCopy = newPassword
      handleCopyCredentials(targetUserCopy, savedPasswordCopy)

      setPasswordUser(null)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleEditSave = async () => {
    if (!editUser) return
    setSaving(true)
    const targetId = editUser.id
    const formUpdates = { ...editForm }
    try {
      const res = await apiFetch(`/api/v1/users/${targetId}`, {
        method: 'PATCH',
        body: JSON.stringify(formUpdates)
      })
      if (res.ok) {
        const updated = await res.json()
        setEditUser(null)
        // Optimistically update local state immediately without blocking full re-fetch
        setUsers(prev => prev.map(u => u.id === targetId ? { ...u, ...updated, ...formUpdates } : u))
        if (selectedUserProfile?.id === targetId) {
          setSelectedUserProfile((prev: any) => prev ? { ...prev, ...updated, ...formUpdates } : null)
        }
        setNotification({ type: 'success', message: 'User details updated successfully!' })
      } else {
        const errData = await res.json().catch(() => ({}))
        setNotification({ type: 'error', message: errData.error || 'Failed to update user' })
      }
    } catch (err: any) {
      console.error(err)
      setNotification({ type: 'error', message: err?.message || 'Failed to update user' })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (user: any) => {
    setEditUser(user)
    setEditForm({
      fullName: user.fullName || '',
      email: user.email || '',
      personalMobile: user.personalMobile || '',
      homeMobile: user.homeMobile || '',
      highestQualification: user.highestQualification || '',
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
      joiningDate: user.joiningDate ? new Date(user.joiningDate).toISOString().split('T')[0] : '',
      onboardingRemark: user.onboardingRemark || '',
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

          {/* Bulk Action Controls */}
          {isAdmin && selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-2xl animate-in fade-in">
              <span className="text-xs font-bold text-blue-900 mr-2">
                {selectedIds.size} Selected
              </span>
              <button
                onClick={() => handleBulkAction('activate')}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <CheckCircle2 size={13} /> Activate
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <UserMinus size={13} /> Deactivate
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Trash2 size={13} /> Delete Permanent
              </button>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center">
              <RefreshCw className="animate-spin text-blue-600 mx-auto mb-3" size={24} />
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Loading user database...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <User className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="text-sm font-bold text-gray-700">No users found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search criteria or role filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider text-gray-400">
                    {isAdmin && (
                      <th className="w-10 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filtered.length && filtered.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-6 py-4">Employee / User</th>
                    <th className="px-4 py-4">Role</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {filtered.map(u => (
                    <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${selectedIds.has(u.id) ? 'bg-blue-50/30' : ''}`}>
                      {isAdmin && (
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(u.id)}
                            onChange={() => toggleSelectUser(u.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleOpenProfile(u)}
                            className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm hover:scale-105 transition-transform cursor-pointer"
                            title="Click to view full profile"
                          >
                            {u.fullName?.charAt(0)?.toUpperCase() || '?'}
                          </button>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenProfile(u)}
                              className="text-xs font-extrabold text-gray-900 hover:text-blue-600 transition-colors text-left cursor-pointer flex items-center gap-1 group"
                            >
                              <span>{u.fullName}</span>
                              <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                            </button>
                            <p className="text-[11px] text-gray-400 font-medium">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-gray-200">
                          {u.role?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-200">
                              <CheckCircle2 size={12} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-[11px] font-bold border border-rose-200">
                              <Clock size={12} /> Inactive / Pending
                            </span>
                          )}
                          {u.onboardingRemark && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md text-[10px] font-black border border-amber-300 tracking-wider cursor-pointer hover:bg-amber-100 transition-colors"
                              title={`Admin Reversion Note: ${u.onboardingRemark}`}
                              onClick={() => handleOpenProfile(u)}
                            >
                              <AlertTriangle size={10} /> REVERTED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {!u.isActive && isAdmin && (
                            <button onClick={() => handleApprove(u.id)} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 shadow-sm cursor-pointer">
                              <Check size={13} /> Approve
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenProfile(u)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                            title="View Full Profile"
                          >
                            <User size={15}/>
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenRevertModal(u)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Revert Profile / Ask Documents"
                            >
                              <RotateCcw size={15}/>
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenPasswordModal(u)}
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer"
                              title="Change Password"
                            >
                              <Key size={15}/>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            title="Edit User"
                          >
                            <Edit3 size={15}/>
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleSingleDelete(u)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Delete User (DB & Supabase Auth)"
                            >
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

      {/* ── User Profile Modal ── */}
      {selectedUserProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-extrabold text-2xl border border-white/30 shadow-inner">
                  {selectedUserProfile.fullName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{selectedUserProfile.fullName}</h2>
                    <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-black rounded-lg uppercase tracking-wider">
                      {selectedUserProfile.role?.name || 'User'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-100 mt-0.5">{selectedUserProfile.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserProfile(null)}
                className="p-2 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {profileLoading ? (
                <div className="p-12 text-center">
                  <RefreshCw className="animate-spin text-blue-600 mx-auto mb-2" size={24} />
                  <p className="text-gray-500 font-semibold">Loading profile information...</p>
                </div>
              ) : (
                <>
                  {/* Status & Highlights */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status</span>
                      {selectedUserProfile.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                          <CheckCircle2 size={13} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                          <Clock size={13} /> Inactive
                        </span>
                      )}
                    </div>

                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Allotted Leads</span>
                      <span className="text-base font-extrabold text-gray-900">
                        {selectedUserProfile._count?.assignedLeads ?? 0}
                      </span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Quotes Made</span>
                      <span className="text-base font-extrabold text-gray-900">
                        {selectedUserProfile._count?.createdQuotes ?? 0}
                      </span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Claims Handled</span>
                      <span className="text-base font-extrabold text-gray-900">
                        {selectedUserProfile._count?.claims ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Reversion / Revision Active Alert Banner */}
                  {selectedUserProfile.onboardingRemark && (
                    <div className="p-4 bg-amber-50/95 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
                          <AlertTriangle size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md border border-amber-300">
                              Profile Reverted / Action Required
                            </span>
                            <span className="text-xs text-amber-600 font-semibold">
                              Employee has been asked to update details
                            </span>
                          </div>
                          <p className="text-sm font-bold text-amber-950 mt-1.5">
                            &quot;{selectedUserProfile.onboardingRemark}&quot;
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleOpenRevertModal(selectedUserProfile)}
                          className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          Edit Request
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearRevert(selectedUserProfile)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          <Check size={13} /> Approve & Clear
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Personal & Contact Details */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Phone size={14} className="text-blue-600" />
                      Contact & Personal Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Personal Mobile</span>
                        <p className="font-semibold text-gray-800 mt-0.5">{selectedUserProfile.personalMobile || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Home / Emergency Phone</span>
                        <p className="font-semibold text-gray-800 mt-0.5">{selectedUserProfile.homeMobile || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Date of Birth</span>
                        <p className="font-semibold text-gray-800 mt-0.5">
                          {selectedUserProfile.dateOfBirth ? formatDateDMY(selectedUserProfile.dateOfBirth) : 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Highest Qualification</span>
                        <p className="font-semibold text-gray-800 mt-0.5">{selectedUserProfile.highestQualification || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Employment Details */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Briefcase size={14} className="text-blue-600" />
                      Employment & Hierarchy
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Date of Joining</span>
                        <p className="font-semibold text-gray-800 mt-0.5">
                          {selectedUserProfile.joiningDate ? formatDateDMY(selectedUserProfile.joiningDate) : 'Not recorded'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Reporting Manager</span>
                        <p className="font-semibold text-gray-800 mt-0.5">
                          {selectedUserProfile.manager?.fullName ? `${selectedUserProfile.manager.fullName} (${selectedUserProfile.manager.email})` : 'Direct / No Manager'}
                        </p>
                      </div>
                      {selectedUserProfile.onboardingRemark && (
                        <div className="sm:col-span-2">
                          <span className="text-[10px] text-gray-400 uppercase font-bold block">Onboarding Remark</span>
                          <p className="font-medium text-gray-700 mt-0.5 italic">{selectedUserProfile.onboardingRemark}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Documents Attached */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-gray-100">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        KYC & Attached Documents ({selectedUserProfile.documents?.length || 0})
                      </h3>
                      {selectedUserProfile.documents && selectedUserProfile.documents.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleDownloadAllPdf(selectedUserProfile.id, selectedUserProfile.fullName)}
                          disabled={isCompilingPdf}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                          title="Compile all documents into a single consolidated PDF dossier"
                        >
                          {isCompilingPdf ? (
                            <>
                              <RefreshCw size={13} className="animate-spin" /> Compiling 1 PDF...
                            </>
                          ) : (
                            <>
                              <FileDown size={13} /> Download All as 1 Merged PDF
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {selectedUserProfile.documents && selectedUserProfile.documents.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2.5">
                        {selectedUserProfile.documents.map((doc: any, docIdx: number) => {
                          const friendlyName = doc.name || getFriendlyDocName(doc.fileName)
                          const rawUrl = resolveDocUrl(doc)
                          const typeInfo = getDocTypeInfo(doc.fileName, rawUrl)

                          return (
                            <div
                              key={doc.id || docIdx}
                              className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 border border-gray-200/80 hover:border-blue-200 rounded-2xl shadow-xs transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-xl ${typeInfo.bg} ${typeInfo.border} border flex items-center justify-center shrink-0`}>
                                  {typeInfo.type === 'image' ? (
                                    <ImageIcon size={18} className={typeInfo.color} />
                                  ) : (
                                    <FileText size={18} className={typeInfo.color} />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                                    {friendlyName}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md tracking-wider">
                                      {doc.fileName || 'DOCUMENT'}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${typeInfo.bg} ${typeInfo.color}`}>
                                      {typeInfo.label}
                                    </span>
                                    {doc.createdAt && (
                                      <span className="text-[11px] text-gray-400 font-medium">
                                        Uploaded: {formatDateDMY(doc.createdAt)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 ml-3">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDoc(doc)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                                  title="View document"
                                >
                                  <Eye size={13} /> View / Open
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadSingleDoc(selectedUserProfile.id, selectedUserProfile.fullName, doc)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                                  title="Download individual document"
                                >
                                  <Download size={13} /> Download
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic text-xs py-4 text-center bg-gray-50 rounded-xl">
                        No KYC documents uploaded for this profile yet.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedUserProfile
                      handleOpenPasswordModal(target)
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs"
                  >
                    <Key size={14} /> Change Password
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenRevertModal(selectedUserProfile)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs"
                    title="Revert profile and request missing documents or clarifications"
                  >
                    <RotateCcw size={14} /> Revert / Ask Documents
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCopyCredentials(selectedUserProfile)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs"
                  title="Copy employee login details to clipboard"
                >
                  <Copy size={14} /> Copy Login Details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedUserProfile
                    setSelectedUserProfile(null)
                    openEdit(target)
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs"
                >
                  <Edit3 size={14} /> Edit Profile
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserProfile(null)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── KYC Document In-App Preview Modal ── */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-100 truncate">
                    {previewDoc.name || getFriendlyDocName(previewDoc.fileName)}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                      {previewDoc.fileName || 'DOCUMENT'}
                    </span>
                    {selectedUserProfile?.fullName && (
                      <span className="text-[11px] text-slate-400 truncate">
                        Employee: {selectedUserProfile.fullName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedUserProfile) {
                      handleDownloadSingleDoc(selectedUserProfile.id, selectedUserProfile.fullName, previewDoc)
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
                  title="Download File"
                >
                  <Download size={13} /> Download
                </button>
                {resolveDocUrl(previewDoc) && (
                  <a
                    href={resolveDocUrl(previewDoc)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                    title="Open in new window"
                  >
                    <ExternalLink size={13} /> Open in New Tab
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer ml-1"
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 overflow-hidden relative">
              {(() => {
                const rawUrl = resolveDocUrl(previewDoc)
                const embedUrl = getGoogleDriveEmbedUrl(rawUrl)
                const typeInfo = getDocTypeInfo(previewDoc.fileName, rawUrl)

                if (embedUrl) {
                  return (
                    <iframe
                      src={embedUrl}
                      className="w-full h-full border-none rounded-xl bg-white"
                      title="Google Drive Document Preview"
                      allow="autoplay"
                    />
                  )
                }

                if (typeInfo.type === 'image' && rawUrl) {
                  return (
                    <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                      <img
                        src={rawUrl}
                        alt={previewDoc.fileName || 'Preview'}
                        className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-slate-800"
                      />
                    </div>
                  )
                }

                if (rawUrl) {
                  return (
                    <iframe
                      src={rawUrl}
                      className="w-full h-full border-none rounded-xl bg-white"
                      title="Document Preview"
                    />
                  )
                }

                return (
                  <div className="text-center p-8 text-slate-400">
                    <FileText size={40} className="mx-auto text-slate-600 mb-2" />
                    <p className="font-bold text-sm text-slate-300">Preview not available directly</p>
                    <p className="text-xs text-slate-500 mt-1">Please use the Download button or Open in New Tab.</p>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ── */}
      {passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Change User Password</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Admin Security Override</p>
                </div>
              </div>
              <button
                onClick={() => setPasswordUser(null)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {passwordUser.fullName?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900 truncate">{passwordUser.fullName}</p>
                <p className="text-[11px] text-gray-500 truncate">{passwordUser.email}</p>
              </div>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-gray-700">New Password *</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={12} /> Auto-Generate Secure
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password (min. 6 chars)"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-gray-700">Confirm New Password *</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Re-type new password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <p className="text-[11px] text-gray-400 leading-relaxed">
                This password will be updated immediately in Supabase Auth. The user can log in with this new password right away.
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPasswordUser(null)}
                  className="px-4 py-2.5 text-gray-500 font-bold text-xs hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {passwordLoading ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Revert / Request Changes Modal ── */}
      {revertUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Revert Profile & Request Documents</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Target: <span className="font-bold text-gray-700">{revertUser.fullName}</span> ({revertUser.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevertUser(null)}
                className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {revertError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{revertError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRevert} className="space-y-4">
              {/* Quick Preset Chips */}
              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">
                  Quick Document Requirements (Click to Add):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Clear Aadhaar Card (Front & Back)',
                    'Valid PAN Card photo',
                    'Bank Passbook / Cancelled Cheque',
                    'Degree / Qualification Marksheet',
                    'School / College Leaving Certificate',
                    'Passport size photograph',
                    'Updated residential address proof'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setRevertText((prev) => {
                          const trimmed = prev.trim()
                          if (!trimmed) return preset
                          if (trimmed.includes(preset)) return trimmed
                          return `${trimmed}, ${preset}`
                        })
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200 transition-all cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requirement Remarks Textarea */}
              <div>
                <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block mb-1">
                  Specify Required Documents & Clarifications:
                </label>
                <textarea
                  required
                  rows={4}
                  value={revertText}
                  onChange={(e) => setRevertText(e.target.value)}
                  placeholder="e.g. Your Aadhaar card scan is blurry. Please re-upload clear front and back photos of your Aadhaar card and your highest degree marksheet..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:border-rose-500 outline-none transition-all resize-none shadow-xs"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  This note will be shown to the employee upon login at <span className="font-semibold text-gray-600">/onboarding/form</span> and sent to their notification center.
                </p>
              </div>

              {/* Pause Portal Access Checkbox */}
              <label className="flex items-center gap-2 p-3 bg-amber-50/70 border border-amber-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={revertPauseAccess}
                  onChange={(e) => setRevertPauseAccess(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300"
                />
                <span className="text-xs font-bold text-amber-900">
                  Temporarily pause active system access until employee submits requested items
                </span>
              </label>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyRevertWhatsApp(revertUser, revertText)}
                    disabled={!revertText.trim()}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    title="Copy formatted WhatsApp message"
                  >
                    <Copy size={13} /> Copy WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendRevertWhatsApp(revertUser, revertText)}
                    disabled={!revertText.trim()}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    title="Send directly via WhatsApp"
                  >
                    <Send size={13} /> WhatsApp
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRevertUser(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={revertLoading || !revertText.trim()}
                    className="flex items-center justify-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    {revertLoading ? <RefreshCw size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                    Submit Revert
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create User Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 animate-in zoom-in duration-200">
             <div className="flex items-center justify-between mb-6">
                <div>
                   <h2 className="text-xl font-bold text-gray-900 tracking-tight">Add New Employee Account</h2>
                   <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1.5">
                     <Mail size={14} className="shrink-0" />
                     Staff OTP Active: Users log in with Work Email & 6-digit OTP sent to <span className="underline font-bold">torqueotp@yahoo.com</span>
                   </p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X size={20}/></button>
             </div>
             
             <form onSubmit={handleCreateUser} className="space-y-5 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Account Credentials</label>
                      <input type="email" placeholder="Work Email Address *" required value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                      <input type="text" placeholder="Full Name (optional - defaults to email)" value={createForm.fullName} onChange={e => setCreateForm({...createForm, fullName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                      <input type="text" placeholder="Password (Optional - auto-generated for OTP login)" value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                      <input type="text" placeholder="Personal Mobile" value={createForm.personalMobile} onChange={e => setCreateForm({...createForm, personalMobile: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Role & Reporting</label>
                      <select 
                        disabled={isManager}
                        value={isManager ? (roles.find(r => r.name === 'EXECUTIVE')?.id || '') : createForm.roleId} 
                        onChange={e => setCreateForm({...createForm, roleId: e.target.value})} 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-semibold outline-none"
                      >
                         {isManager ? (
                           <option value="">EXECUTIVE</option>
                         ) : (
                           <>
                             <option value="">Select Role (Default: Sales Executive)</option>
                             {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                           </>
                         )}
                      </select>
                      
                      {!isManager && (
                        <select value={createForm.managerId} onChange={e => setCreateForm({...createForm, managerId: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-semibold outline-none">
                           <option value="">No Manager (Direct Report)</option>
                           {users.filter(u => u.role?.name?.toUpperCase() === 'MANAGER').map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                        </select>
                      )}

                      <input type="text" placeholder="Highest Qualification" value={createForm.highestQualification} onChange={e => setCreateForm({...createForm, highestQualification: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="date" placeholder="Date of Joining" value={createForm.joiningDate} onChange={e => setCreateForm({...createForm, joiningDate: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                   </div>
                </div>

                {createError && <p className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 flex items-center gap-2"><AlertCircle size={14}/> {createError}</p>}
                
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                   <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all cursor-pointer">Dismiss</button>
                   <button type="submit" disabled={creating} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer">
                      {creating ? 'Processing...' : 'Complete Registration'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                 <div>
                    <h2 className="text-xl font-bold text-gray-900">Edit User Account</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{editUser.email}</p>
                 </div>
                 <button onClick={() => setEditUser(null)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600"><X size={18}/></button>
              </div>

              <div className="space-y-4 text-xs">
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Full Name</label>
                       <input
                          type="text"
                          value={editForm.fullName}
                          onChange={e => setEditForm({...editForm, fullName: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Email</label>
                       <input
                          type="email"
                          value={editForm.email}
                          onChange={e => setEditForm({...editForm, email: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Personal Mobile</label>
                       <input
                          type="text"
                          value={editForm.personalMobile}
                          onChange={e => setEditForm({...editForm, personalMobile: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Home / Emergency Mobile</label>
                       <input
                          type="text"
                          value={editForm.homeMobile}
                          onChange={e => setEditForm({...editForm, homeMobile: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Highest Qualification</label>
                       <input
                          type="text"
                          value={editForm.highestQualification}
                          onChange={e => setEditForm({...editForm, highestQualification: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Date of Joining</label>
                       <input
                          type="date"
                          value={editForm.joiningDate}
                          onChange={e => setEditForm({...editForm, joiningDate: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Role</label>
                       <select
                          value={editForm.roleId}
                          onChange={e => setEditForm({...editForm, roleId: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold"
                       >
                          <option value="">Unassigned</option>
                          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Reporting Manager</label>
                       <select
                          value={editForm.managerId}
                          onChange={e => setEditForm({...editForm, managerId: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold"
                       >
                          <option value="">No Manager (Direct)</option>
                          {users.filter(u => u.role?.name?.toUpperCase() === 'MANAGER' && u.id !== editUser.id).map(m => (
                             <option key={m.id} value={m.id}>{m.fullName}</option>
                          ))}
                       </select>
                    </div>
                 </div>

                 <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Account Status</label>
                    <div className="flex gap-3">
                       <button
                          type="button"
                          onClick={() => setEditForm({...editForm, isActive: true})}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                             editForm.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-100 text-gray-400'
                          }`}
                       >
                          Active
                       </button>
                       <button
                          type="button"
                          onClick={() => setEditForm({...editForm, isActive: false})}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                             !editForm.isActive ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-gray-50 border-gray-100 text-gray-400'
                          }`}
                       >
                          Inactive / Suspended
                       </button>
                    </div>
                 </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                 <button type="button" onClick={() => setEditUser(null)} className="flex-1 py-2.5 font-bold text-xs text-gray-400 hover:bg-gray-100 rounded-xl transition-all cursor-pointer">
                    Cancel
                 </button>
                 <button
                    type="button"
                    onClick={handleEditSave}
                    disabled={saving}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                 >
                    {saving ? 'Saving...' : 'Apply Changes'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </AdminLayout>
  )
}
