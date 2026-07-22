"use client"
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { fetchApi } from '@/lib/api'

export default function Header() {
  const router = useRouter()
  const { user } = useAuth()

  // Notification state
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    try {
      setLoadingNotifs(true)
      const data = await fetchApi('/api/v1/notifications?limit=20')
      if (data) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoadingNotifs(false)
    }
  }

  // Fetch notifications on mount and poll every 30 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleBellClick = () => {
    setShowNotifications(!showNotifications)
    if (!showNotifications) fetchNotifications()
  }

  const markAsRead = async (id: string) => {
    try {
      await fetchApi(`/api/v1/notifications/${id}`, { method: 'PATCH' })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetchApi('/api/v1/notifications/read-all', { method: 'PATCH' })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      case 'action': return '🔔'
      default: return 'ℹ️'
    }
  }

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 z-20">
      <div className="flex items-center gap-4 flex-1">
        {/* Spacer for hamburger on mobile */}
        <div className="w-10 md:hidden"></div>
        <div className="relative w-full max-w-md hidden md:block">
          <input 
            type="text" 
            placeholder="Search policies, leads..." 
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={handleBellClick}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors relative"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black text-white px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-[10px] text-gray-500">{unreadCount} unread</p>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto">
                {loadingNotifs && notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Loading...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-2xl mb-2">🔕</p>
                    <p className="text-xs text-gray-400 font-medium">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id}
                      onClick={() => !notif.isRead && markAsRead(notif.id)}
                      className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer ${
                        !notif.isRead ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <span className="text-lg mt-0.5 shrink-0">{getNotifIcon(notif.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-bold truncate ${!notif.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                              {notif.title}
                            </p>
                            {!notif.isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                          <p className="text-[10px] text-gray-400 mt-1 font-medium">{timeAgo(notif.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block"></div>
        <div className="flex items-center gap-2 md:gap-4">
          {user?.isActive === false && (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider border border-amber-200 rounded-xl animate-pulse flex items-center gap-1 shrink-0">
              ⏳ Pending Approval
            </span>
          )}
          <button className="flex items-center gap-2 p-1 pr-3 hover:bg-gray-100 rounded-full transition-colors">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white">
              {user?.fullName?.charAt(0) || '👤'}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:inline">{user?.fullName || 'User'}</span>
          </button>
          <button 
            onClick={handleLogout}
            className="text-sm font-semibold text-red-600 hover:text-red-700 px-2 md:px-3 py-1 hover:bg-red-50 rounded-lg transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
