"use client"
import React from 'react'
import { useAuth } from '@/context/AuthContext'

interface ProtectProps {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Component to conditionally render content based on user permissions.
 */
export default function Protect({ 
  permission, 
  permissions, 
  requireAll = false, 
  children, 
  fallback = null 
}: ProtectProps) {
  const { permissions: userPermissions, user, isLoading } = useAuth()

  if (isLoading) return null
  if (!user) return fallback as React.ReactElement

  const required = permissions || (permission ? [permission] : [])
  
  if (required.length === 0) return <>{children}</>

  const hasPermission = requireAll
    ? required.every(p => userPermissions.includes(p))
    : required.some(p => userPermissions.includes(p))

  if (!hasPermission) return fallback as React.ReactElement

  return <>{children}</>
}
