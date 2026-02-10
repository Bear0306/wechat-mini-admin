import { useState } from 'react'
import { InlineSelect } from '../../../shared/components'
import * as userService from '../services/userService'

// Editable options
const BOOL_OPTIONS = [
  { value: 'true', label: '是' },
  { value: 'false', label: '否' }
]

const AGE_GROUP_OPTIONS = [
  { value: 'MINOR_12_18', label: '12-18岁（未成年人）' },
  { value: 'ADULT', label: '成年人' },
  { value: 'SENIOR_60_65', label: '老年人（60-65岁）' },
  { value: 'SENIOR_65_PLUS', label: '老年人（65岁以上）' },
  { value: 'BLOCKED_UNDER_12', label: '禁止（12岁以下）' },
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
      setError('请输入有效的用户ID')
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
      setError(e instanceof Error ? e.message : '未找到该用户')
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
      setError(e instanceof Error ? e.message : '更新失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-100">用户管理</h2>
      {/* Filters (currently only by user id, extensible) */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-slate-400">用户ID搜索</label>
        <input
          type="number"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="如：1"
          className="w-32 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200 text-sm"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? '加载中…' : '查询'}
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
                <th className="px-3 py-2 text-slate-500 font-normal">用户ID</th>
                <td className="px-3 py-2">{user.id}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">微信昵称</th>
                <td className="px-3 py-2">{user.wechatNick}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">实名认证</th>
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
                <th className="px-3 py-2 text-slate-500 font-normal">出生日期</th>
                <td className="px-3 py-2">{user.birthDate ? new Date(user.birthDate).toLocaleDateString() : ''}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">年龄组</th>
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
                <th className="px-3 py-2 text-slate-500 font-normal">参赛资格</th>
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
                <th className="px-3 py-2 text-slate-500 font-normal">可购会员</th>
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
                <th className="px-3 py-2 text-slate-500 font-normal">累计奖励（分）</th>
                <td className="px-3 py-2">{user.totalRewardsCent}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">城市</th>
                <td className="px-3 py-2">{user.city || ''}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">参赛次数</th>
                <td className="px-3 py-2">{user.joinCount}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">奖励倍率</th>
                <td className="px-3 py-2">{user.prizeMultiplier}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-slate-500 font-normal">推荐码</th>
                <td className="px-3 py-2">{user.referralCode ?? ''}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-2">
            上次更新时间：{user.updatedAt ? new Date(user.updatedAt).toLocaleString() : ''}
          </p>
        </div>
      )}

      {!user && !loading && searchId && (
        <p className="text-slate-500 text-sm">请在上方查询用户</p>
      )}
    </div>
  )
}
