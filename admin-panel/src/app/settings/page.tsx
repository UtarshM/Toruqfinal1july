"use client"
import AdminLayout from '@/components/layout/AdminLayout'
import { useState, useEffect } from 'react'
import { fetchApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { 
  User, 
  Shield, 
  Palette, 
  Bell, 
  Globe, 
  Save,
  Building2,
  Mail,
  Smartphone,
  Loader2,
  CheckCircle2
} from 'lucide-react'

export default function SettingsPage() {
  const { user: authUser, updateUser, refreshProfile: refreshAuthProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    personalMobile: ''
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const data = await fetchApi('/api/v1/auth/me')
      setUser(data)
      setFormData({
        fullName: data.fullName || data.name || '',
        email: data.email || '',
        personalMobile: data.personalMobile || ''
      })
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!formData.fullName.trim()) {
      setErrorMessage('Full name cannot be empty')
      return
    }

    setSaving(true)
    setSaveSuccess(false)
    setErrorMessage('')

    try {
      const trimmedName = formData.fullName.trim()
      const trimmedMobile = formData.personalMobile.trim()

      // 1. Try PATCH /api/v1/auth/me
      await fetchApi('/api/v1/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: trimmedName,
          personalMobile: trimmedMobile
        })
      }).catch(async () => {
        // Fallback to /api/v1/users/${user?.id || 'me'}
        const targetId = user?.id || 'me'
        return await fetchApi(`/api/v1/users/${targetId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            fullName: trimmedName,
            personalMobile: trimmedMobile
          })
        })
      })

      // 2. Synchronize local AuthContext and localStorage immediately
      updateUser({
        fullName: trimmedName,
        name: trimmedName,
        personalMobile: trimmedMobile
      })

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
      await fetchProfile()
      await refreshAuthProfile()
    } catch (error: any) {
      console.error('Save profile error:', error)
      setErrorMessage(error?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const roleName = (user?.role?.name || (typeof user?.role === 'string' ? user.role : authUser?.role?.name || '')).toUpperCase()
  const isAdmin = roleName.includes('ADMIN') || roleName.includes('SUPER')

  const ALL_TABS = [
    { id: 'profile', name: 'Profile', icon: User, adminOnly: false },
    { id: 'security', name: 'Security', icon: Shield, adminOnly: false },
    { id: 'notifications', name: 'Notifications', icon: Bell, adminOnly: false },
    { id: 'branding', name: 'Branding', icon: Palette, adminOnly: true },
    { id: 'system', name: 'System', icon: Globe, adminOnly: true },
  ]

  const TABS = ALL_TABS.filter(t => !t.adminOnly || isAdmin)

  if (loading) return <AdminLayout><div className="p-20 text-center"><Loader2 className="animate-spin mx-auto mb-2" /> Loading Settings...</div></AdminLayout>

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account and application preferences.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Tabs Sidebar */}
          <div className="w-full lg:w-64 space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                    : 'text-gray-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                <tab.icon size={18} />
                {tab.name}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {activeTab === 'profile' && (
              <div className="p-8 space-y-8">
                {saveSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                    <span>Your profile name and details have been successfully updated!</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm font-semibold">
                    {errorMessage}
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-blue-600 flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-blue-200 uppercase">
                    {formData.fullName?.charAt(0) || '👤'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{formData.fullName || 'User Profile'}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Role: <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg uppercase">{user?.role?.name || user?.role || 'Staff'}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Manage your display name and contact preferences.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <User size={18} />
                      </div>
                      <input 
                        type="text" 
                        value={formData.fullName}
                        placeholder="Enter your full name"
                        onChange={e => setFormData({...formData, fullName: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400">This name will appear on all reports, quotes, and activity logs.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Smartphone size={18} />
                      </div>
                      <input 
                        type="tel" 
                        value={formData.personalMobile}
                        placeholder="Mobile number"
                        onChange={e => setFormData({...formData, personalMobile: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Mail size={18} />
                      </div>
                      <input 
                        type="email" 
                        value={formData.email}
                        disabled
                        className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400">Primary login email (managed by administrator)</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Designated Role</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Building2 size={18} />
                      </div>
                      <input 
                        type="text" 
                        value={user?.role?.name || user?.role || 'Staff'}
                        disabled
                        className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">All registered users can update their profile name anytime.</span>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="p-8 space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">White-Labeling</h3>
                  <p className="text-sm text-gray-500 mt-1">Customize the platform appearance for your partners.</p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-gray-700">Primary Brand Color</label>
                      <div className="flex gap-4">
                        <input 
                          type="color" 
                          defaultValue="#2563eb"
                          className="w-12 h-12 rounded-lg cursor-pointer"
                        />
                        <input 
                          type="text" 
                          defaultValue="#2563eb"
                          className="flex-1 px-4 py-3 bg-gray-50 border-none rounded-xl text-sm outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-gray-700">Secondary Accent</label>
                      <div className="flex gap-4">
                        <input 
                          type="color" 
                          defaultValue="#4f46e5"
                          className="w-12 h-12 rounded-lg cursor-pointer"
                        />
                        <input 
                          type="text" 
                          defaultValue="#4f46e5"
                          className="flex-1 px-4 py-3 bg-gray-50 border-none rounded-xl text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-bold text-gray-700">Brand Logo</label>
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                        <Palette size={24} />
                      </div>
                      <p className="text-sm font-bold text-gray-900">Click to upload logo</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, SVG or JPG up to 2MB</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button onClick={() => alert('Branding applied!')} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                    <Save size={18} />
                    Apply Branding
                  </button>
                </div>
              </div>
            )}

            {activeTab !== 'profile' && activeTab !== 'branding' && (
              <div className="p-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-4">
                  <Globe size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-xs">
                  This section is currently under development and will be available in the next update.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
