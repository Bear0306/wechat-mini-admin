import { useState, useEffect } from 'react'
import { InlineSelect, InlineInput } from '../../../shared/components'
import * as userService from '../services/userService'

const PERMISSION_OPTIONS = [
  { value: 'true', label: 'Can participate' },
  { value: 'false', label: 'Banned' },
]

export default function UserManagement() {
  const [searchId, setSearchId] = useState('')
  const [user, setUser] = useState<Awaited<ReturnType<typeof userService.getUserById>> | null>(null)
  const [totalRewardsDraft, setTotalRewardsDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) setTotalRewardsDraft(String(user.totalRewardsCent))
  }, [user])

  const handleSearch = async () => {
    const id = parseInt(searchId, 10)
    if (!Number.isFinite(id)) {
      setError('Enter a valid user ID')
      setUser(null)
      return
    }
    setLoading(true)
    setError('')
    setUser(null)
    try {
      const u = await userService.getUserById(id)
      setUser(u)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'User not found')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (field: 'isPromoter' | 'canParticipate' | 'totalRewardsCent', value: boolean | number) => {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      const data = { [field]: value }
      const updated = await userService.updateUser(user.id, data)
      setUser({ ...user, ...updated })
      if (field === 'totalRewardsCent') setTotalRewardsDraft(String(updated.totalRewardsCent))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-100">User Management</h2>
      <div className="flex items-center gap-4">
        <label className="text-sm text-slate-400">Search by user ID</label>
        <input
          type="number"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="e.g. 1"
          className="w-32 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200 text-sm"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Search'}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
      )}
      {user && (
        <div className="rounded-lg border border-slate-700 bg-slate-850 p-4 space-y-4">
          <h3 className="font-medium text-slate-100">
            User #{user.id} {user.wechatNick ? `— ${user.wechatNick}` : ''}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-slate-500 mb-1">Promoter</label>
              <InlineSelect
                value={String(user.isPromoter)}
                options={[
                  { value: 'true', label: 'Yes' },
                  { value: 'false', label: 'No' },
                ]}
                onChange={(v) => handleUpdate('isPromoter', v === 'true')}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Permission</label>
              <InlineSelect
                value={String(user.canParticipate)}
                options={PERMISSION_OPTIONS}
                onChange={(v) => handleUpdate('canParticipate', v === 'true')}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Total rewards (¢)</label>
              <div className="flex gap-2">
                <InlineInput
                  type="number"
                  value={totalRewardsDraft}
                  onChange={(v) => setTotalRewardsDraft(String(v))}
                  disabled={saving}
                  min={0}
                />
                <button
                  type="button"
                  onClick={() => handleUpdate('totalRewardsCent', parseInt(totalRewardsDraft, 10) || 0)}
                  disabled={saving}
                  className="px-2 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            joinCount: {user.joinCount} · prizeMultiplier: {user.prizeMultiplier} · updated: {new Date(user.updatedAt).toLocaleString()}
          </p>
        </div>
      )}
      {!user && !loading && searchId && (
        <p className="text-slate-500 text-sm">Search for a user above</p>
      )}
    </div>
  )
}
