'use client'

import { useAuthStore } from '@/lib/store'

export default function Settings() {
  const { user } = useAuthStore()

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="card max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Account Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              className="input"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">User ID</label>
            <input
              type="text"
              value={user?.id || ''}
              className="input font-mono text-sm"
              readOnly
            />
          </div>
        </div>
      </div>

      <div className="card max-w-2xl mt-6">
        <h2 className="text-xl font-bold mb-4">API Documentation</h2>
        <div className="text-sm text-gray-400 space-y-2">
          <p>Base URL: <code className="bg-dark-bg px-2 py-1 rounded">http://localhost:5000/api</code></p>
          <p>All client API requests require HMAC SHA256 signature verification</p>
          <p>Check the C# client example for implementation details</p>
        </div>
      </div>
    </div>
  )
}
