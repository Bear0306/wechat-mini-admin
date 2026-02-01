import { useState, useEffect, useCallback } from 'react'
import type { SystemConfig, DefaultRewardTier, DefaultRankLimits } from '../../../api/client'
import * as systemService from '../services/systemService'

export default function SystemConfiguration() {
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadConfig = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const c = await systemService.loadConfig()
      setConfig(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load config')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleToggle = async (key: 'membershipDisabled' | 'rewardRulesEnabled', value: boolean) => {
    if (!config) return
    setSaving(true)
    setError('')
    try {
      const updated = await systemService.updateConfig({ [key]: value })
      setConfig(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const [rankLimits, setRankLimits] = useState<DefaultRankLimits>({ topN: 10, tailCount: 5 })
  const [tiers, setTiers] = useState<DefaultRewardTier[]>([])

  useEffect(() => {
    if (config) {
      setRankLimits(config.defaultRankLimits)
      setTiers(config.defaultRewardTiers)
    }
  }, [config])

  const handleSaveRankLimits = async () => {
    setSaving(true)
    setError('')
    try {
      const updated = await systemService.updateConfig({ defaultRankLimits: rankLimits })
      setConfig(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTiers = async () => {
    setSaving(true)
    setError('')
    try {
      const updated = await systemService.updateConfig({ defaultRewardTiers: tiers })
      setConfig(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const addTier = () => {
    const last = tiers[tiers.length - 1]
    const rankStart = last ? last.rankEnd + 1 : 1
    setTiers([...tiers, { rankStart, rankEnd: rankStart, prizeValueCent: 0 }])
  }

  const updateTier = (idx: number, field: keyof DefaultRewardTier, value: number) => {
    const next = [...tiers]
    next[idx] = { ...next[idx], [field]: value }
    setTiers(next)
  }

  const removeTier = (idx: number) => setTiers(tiers.filter((_, i) => i !== idx))

  if (loading) return <p className="text-slate-500 text-sm">Loading…</p>
  if (!config) return <p className="text-slate-500 text-sm">Failed to load config</p>

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-100">System Configuration</h2>
      <p className="text-sm text-slate-500">Changes affect new events only.</p>
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="rounded-lg border border-slate-700 bg-slate-850 p-4 space-y-4">
        <h3 className="font-medium text-slate-100">Feature Toggles</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-400">Membership disabled</label>
            <button
              type="button"
              onClick={() => handleToggle('membershipDisabled', !config.membershipDisabled)}
              disabled={saving}
              className={`relative w-11 h-6 rounded-full transition-colors ${config.membershipDisabled ? 'bg-red-600' : 'bg-slate-600'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${config.membershipDisabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
            <span className="text-sm text-slate-500">{config.membershipDisabled ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-400">Reward rules enabled</label>
            <button
              type="button"
              onClick={() => handleToggle('rewardRulesEnabled', !config.rewardRulesEnabled)}
              disabled={saving}
              className={`relative w-11 h-6 rounded-full transition-colors ${config.rewardRulesEnabled ? 'bg-emerald-600' : 'bg-slate-600'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${config.rewardRulesEnabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
            <span className="text-sm text-slate-500">{config.rewardRulesEnabled ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-850 p-4 space-y-4">
        <h3 className="font-medium text-slate-100">Default Rank Limits</h3>
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-slate-500 text-sm mb-1">Top N</label>
            <input
              type="number"
              min={1}
              max={100}
              value={rankLimits.topN}
              onChange={(e) =>
                setRankLimits((r) => ({ ...r, topN: parseInt(e.target.value, 10) || 10 }))
              }
              disabled={saving}
              className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-slate-500 text-sm mb-1">Tail count</label>
            <input
              type="number"
              min={0}
              max={20}
              value={rankLimits.tailCount}
              onChange={(e) =>
                setRankLimits((r) => ({ ...r, tailCount: parseInt(e.target.value, 10) || 5 }))
              }
              disabled={saving}
              className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveRankLimits}
            disabled={saving}
            className="mt-4 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-850 p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-slate-100">Default Reward Tiers</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addTier}
              disabled={saving}
              className="px-2 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-50"
            >
              Add tier
            </button>
            <button
              type="button"
              onClick={handleSaveTiers}
              disabled={saving}
              className="px-2 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {tiers.map((t, idx) => (
            <div key={idx} className="flex gap-4 items-center">
              <input
                type="number"
                min={1}
                value={t.rankStart}
                onChange={(e) => updateTier(idx, 'rankStart', parseInt(e.target.value, 10) || 1)}
                disabled={saving}
                className="w-20 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200 text-sm"
              />
              <span className="text-slate-500">–</span>
              <input
                type="number"
                min={1}
                value={t.rankEnd}
                onChange={(e) => updateTier(idx, 'rankEnd', parseInt(e.target.value, 10) || 1)}
                disabled={saving}
                className="w-20 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200 text-sm"
              />
              <input
                type="number"
                min={0}
                value={t.prizeValueCent}
                onChange={(e) => updateTier(idx, 'prizeValueCent', parseInt(e.target.value, 10) || 0)}
                disabled={saving}
                placeholder="¢"
                className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200 text-sm"
              />
              <span className="text-slate-500 text-sm">¢</span>
              <button
                type="button"
                onClick={() => removeTier(idx)}
                disabled={saving}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
          {tiers.length === 0 && (
            <p className="text-slate-500 text-sm">No default tiers. Add one above.</p>
          )}
        </div>
      </div>
    </div>
  )
}
