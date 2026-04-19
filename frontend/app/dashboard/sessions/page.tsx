'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function Sessions() {
  const { applications } = useAppStore()
  const [selectedAppId, setSelectedAppId] = useState('')
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (applications.length > 0 && !selectedAppId) {
      setSelectedAppId(applications[0]._id)
    }
  }, [applications])

  useEffect(() => {
    if (selectedAppId) {
      loadSessions()
    }
  }, [selectedAppId])

  const loadSessions = async () => {
    if (!selectedAppId) return
    setLoading(true)
    try {
      const response = await api.get(`/sessions/application/${selectedAppId}`)
      setSessions(response.data.sessions)
    } catch (error: any) {
      toast.error('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const terminateSession = async (id: string) => {
    try {
      await api.delete(`/sessions/${id}`)
      toast.success('Session terminated')
      loadSessions()
    } catch (error: any) {
      toast.error('Failed to terminate session')
    }
  }

  const terminateAll = async () => {
    if (!confirm('Terminate all sessions for this application?')) return

    try {
      await api.delete(`/sessions/application/${selectedAppId}/all`)
      toast.success('All sessions terminated')
      loadSessions()
    } catch (error: any) {
      toast.error('Failed to terminate sessions')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Active Sessions</h1>
        {sessions.length > 0 && (
          <button
            onClick={terminateAll}
            className="btn btn-danger flex items-center gap-2"
          >
            <XMarkIcon className="w-5 h-5" />
            Terminate All
          </button>
        )}
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>Create an application first to view sessions</p>
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
                <option key={app._id} value={app._id}>
                  {app.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session: any) => (
                <div key={session._id} className="card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-2">
                        {session.userId?.username || 'Unknown User'}
                      </h3>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>IP: {session.ip}</p>
                        <p>HWID: {session.hwid}</p>
                        <p>Last Heartbeat: {new Date(session.lastHeartbeat).toLocaleString()}</p>
                        <p>Created: {new Date(session.createdAt).toLocaleString()}</p>
                        <p>Expires: {new Date(session.expiresAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => terminateSession(session._id)}
                      className="btn btn-danger"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>No active sessions</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
