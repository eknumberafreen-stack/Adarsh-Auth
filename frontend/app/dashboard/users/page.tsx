'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { ShieldExclamationIcon, ShieldCheckIcon, ArrowPathIcon, TrashIcon, PlusIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function Users() {
  const { applications } = useAppStore()
  const [selectedAppId, setSelectedAppId] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', email: '', subscription: 'default', expiryDate: '', hwidAffected: true })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (applications.length > 0 && !selectedAppId) {
      setSelectedAppId(applications[0]._id)
    }
  }, [applications])

  useEffect(() => {
    if (selectedAppId) {
      loadUsers()
    }
  }, [selectedAppId])

  const loadUsers = async () => {
    if (!selectedAppId) return
    setLoading(true)
    try {
      const response = await api.get(`/users/application/${selectedAppId}`)
      setUsers(response.data.users)
    } catch (error: any) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const createUser = async () => {
    if (!newUser.username || !newUser.password) {
      toast.error('Username and password are required')
      return
    }
    setCreating(true)
    try {
      await api.post('/users/create', {
        applicationId: selectedAppId,
        username: newUser.username,
        password: newUser.password,
        email: newUser.email || null,
        subscription: newUser.subscription || 'default',
        expiryDate: newUser.expiryDate || null,
        hwidAffected: newUser.hwidAffected
      })
      toast.success('User created successfully!')
      setShowCreateModal(false)
      setNewUser({ username: '', password: '', email: '', subscription: 'default', expiryDate: '', hwidAffected: true })
      loadUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const banUser = async (id: string) => {
    try {
      await api.post(`/users/${id}/ban`)
      toast.success('User banned')
      loadUsers()
    } catch (error: any) {
      toast.error('Failed to ban user')
    }
  }

  const unbanUser = async (id: string) => {
    try {
      await api.post(`/users/${id}/unban`)
      toast.success('User unbanned')
      loadUsers()
    } catch (error: any) {
      toast.error('Failed to unban user')
    }
  }

  const resetHwid = async (id: string) => {
    if (!confirm('Reset HWID for this user?')) return
    try {
      await api.post(`/users/${id}/reset-hwid`)
      toast.success('HWID reset successfully')
      loadUsers()
    } catch (error: any) {
      toast.error('Failed to reset HWID')
    }
  }

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      await api.delete(`/users/${id}`)
      toast.success('User deleted')
      loadUsers()
    } catch (error: any) {
      toast.error('Failed to delete user')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Users</h1>
        {selectedAppId && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Create User
          </button>
        )}
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>Create an application first to manage users</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Select Application</label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="input max-w-md"
            >
              {applications.map((app: any) => (
                <option key={app._id} value={app._id}>{app.name}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user: any) => (
                <div key={user._id} className="card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">{user.username}</h3>
                        {user.banned && (
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">Banned</span>
                        )}
                        {user.expiryDate && new Date(user.expiryDate) < new Date() && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">Expired</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>HWID: {user.hwid || 'Not set'}</p>
                        <p>Last Login: {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</p>
                        <p>Last IP: {user.lastIp || 'N/A'}</p>
                        {user.expiryDate && <p>Expires: {new Date(user.expiryDate).toLocaleString()}</p>}
                        <p>Created: {new Date(user.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {user.banned ? (
                        <button onClick={() => unbanUser(user._id)} className="btn btn-secondary" title="Unban">
                          <ShieldCheckIcon className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => banUser(user._id)} className="btn btn-secondary" title="Ban">
                          <ShieldExclamationIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => resetHwid(user._id)} className="btn btn-secondary" title="Reset HWID">
                        <ArrowPathIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteUser(user._id)} className="btn btn-danger" title="Delete">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>No users yet. Create your first user!</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Create User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Username <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="input"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="input pr-10"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="input"
                  placeholder="Enter email (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subscription <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={newUser.subscription}
                  onChange={(e) => setNewUser({ ...newUser, subscription: e.target.value })}
                  className="input"
                  placeholder="default"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Expiration <span className="text-red-400">*</span></label>
                <input
                  type="datetime-local"
                  value={newUser.expiryDate}
                  onChange={(e) => setNewUser({ ...newUser, expiryDate: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hwidAffected"
                  checked={newUser.hwidAffected}
                  onChange={(e) => setNewUser({ ...newUser, hwidAffected: e.target.checked })}
                  className="w-4 h-4 accent-primary-600"
                />
                <label htmlFor="hwidAffected" className="text-sm font-medium">HWID Affected</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowCreateModal(false); setNewUser({ username: '', password: '', email: '', subscription: 'default', expiryDate: '', hwidAffected: true }) }} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button onClick={createUser} disabled={creating} className="btn btn-primary flex-1">
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
