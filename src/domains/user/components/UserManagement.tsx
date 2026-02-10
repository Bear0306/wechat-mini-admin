import { useState } from 'react'
import { InlineSelect } from '../../../shared/components'
import * as userService from '../services/userService'

// Editable options
const BOOL_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' }
]

const AGE_GROUP_OPTIONS = [
  { value: 'MINOR_12_18', label: '12-18 (Minor)' },
  { value: 'ADULT', label: 'Adult' },
  { value: 'SENIOR_60_65', label: 'Senior (60-65)' },
  { value: 'SENIOR_65_PLUS', label: 'Senior (65+)' },
  { value: 'BLOCKED_UNDER_12', label: 'Blocked (Under 12)' },
]

export default function UserManagement() {
  const [searchId, setSearchId] = useState('')
  const [user, setUser] = useState<Awaited<ReturnType<typeof userService.getUserById>> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [filterId, setFilterId] = useState('')

  // Handle search by user ID
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

  // Edit handler for editable fields
  const handleUpdate = async (
    field: 'realNameVerified' | 'ageGroup' | 'canParticipate' | 'canBuyMembership',
    value: string | boolean
  ) => {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      let val: any = value
      // Convert booleans from string
      if (field === 'realNameVerified' || field === 'canParticipate' || field === 'canBuyMembership') {
        val = value === 'true' || value === true
      }
      const data = { [field]: val }
      const updated = await userService.updateUser(user.id, data)
      setUser({ ...user, ...updated })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-100">User Management</h2>
      {/* Filters (currently only by user id, extensible) */}
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
        <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-850 p-4">
          <table className="min-w-full text-sm text-left">
            <tbody>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">ID</th>
                <td className="px-3 py-2">{user.id}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">Wechat Nick</th>
                <td className="px-3 py-2">{user.wechatNick}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">Real Name Verified</th>
                <td className="px-3 py-2">
                  <InlineSelect
                    value={String(user.realNameVerified)}
                    options={BOOL_OPTIONS}
                    onChange={(v) => handleUpdate('realNameVerified', v)}
                    disabled={saving}
                  />
                </td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">Birth Date</th>
                <td className="px-3 py-2">{user.birthDate ? new Date(user.birthDate).toLocaleDateString() : ''}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">Age Group</th>
                <td className="px-3 py-2">
                  <InlineSelect
                    value={user.ageGroup || ''}
                    options={AGE_GROUP_OPTIONS}
                    onChange={(v) => handleUpdate('ageGroup', v)}
                    disabled={saving}
                  />
                </td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">Can Participate</th>
                <td className="px-3 py-2">
                  <InlineSelect
                    value={String(user.canParticipate)}
                    options={BOOL_OPTIONS}
                    onChange={(v) => handleUpdate('canParticipate', v)}
                    disabled={saving}
                  />
                </td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">Can Buy Membership</th>
                <td className="px-3 py-2">
                  <InlineSelect
                    value={String(user.canBuyMembership)}
                    options={BOOL_OPTIONS}
                    onChange={(v) => handleUpdate('canBuyMembership', v)}
                    disabled={saving}
                  />
                </td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">Total Rewards (¢)</th>
                <td className="px-3 py-2">{user.totalRewardsCent}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">City</th>
                <td className="px-3 py-2">{user.city || ''}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">Join Count</th>
                <td className="px-3 py-2">{user.joinCount}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">Prize Multiplier</th>
                <td className="px-3 py-2">{user.prizeMultiplier}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">Referral Code</th>
                <td className="px-3 py-2">{user.referralCode ?? ''}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-2">
            Last updated: {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : ''}
          </p>
        </div>
      )}

      {!user && !loading && searchId && (
        <p className="text-slate-500 text-sm">Search for a user above</p>
      )}
    </div>
  )
}
