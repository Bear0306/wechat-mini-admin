import { useState, useEffect, useCallback } from 'react'
import {
  type Contest,
  type ContestWithRules,
  type ContestCreate,
  type ContestUpdate,
  type ContestPrizeRule,
  type PrizeRuleCreate,
  type Region,
  type RegionLevel,
  type ContestFreq,
  type ContestAudience,
  type ContestStatus,
} from '../../../api/client'
import * as eventService from '../services/eventService'

const SCOPES: RegionLevel[] = ['NONE', 'CITY', 'PROVINCE', 'DISTRICT']
const FREQS: ContestFreq[] = ['DAILY', 'WEEKLY', 'MONTHLY']
const AUDIENCES: ContestAudience[] = ['ADULTS', 'YOUTH']
const STATUSES: ContestStatus[] = ['SCHEDULED', 'ONGOING', 'FINALIZING', 'FINALIZED', 'CANCELED']

const defaultContestForm: ContestCreate = {
  title: '',
  scope: 'NONE',
  regionCode: "",
  frequency: 'DAILY',
  audience: 'ADULTS',
  status: 'SCHEDULED',
  startAt: '',
  endAt: '',
}

function validateDateRange(freq: ContestFreq, startAt: string, endAt: string): string | null {
  if (!startAt || !endAt) return 'Start and end dates required'
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()
  if (end <= start) return 'End must be after start'
  const dayMs = 24 * 60 * 60 * 1000
  if (freq === 'DAILY' && end - start > 2 * dayMs) return 'Daily contest should span ≤2 days'
  if (freq === 'WEEKLY' && (end - start < 6 * dayMs || end - start > 8 * dayMs)) return 'Weekly contest should span ~7 days'
  if (freq === 'MONTHLY' && (end - start < 28 * dayMs || end - start > 32 * dayMs)) return 'Monthly contest should span ~30 days'
  return null
}

export default function EventManagement() {
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<ContestWithRules | null>(null)
  const [form, setForm] = useState<ContestCreate>(defaultContestForm)
  const [rules, setRules] = useState<ContestPrizeRule[]>([])
  const [ruleForm, setRuleForm] = useState<Partial<PrizeRuleCreate>>({ rankStart: 1, rankEnd: 1, prizeValueCent: 0 })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [regions, setRegions] = useState<Region[]>([])

  const loadRegions = useCallback(async (level: RegionLevel) => {
    try {
      const list = await eventService.loadRegionsByLevel(level)
      setRegions(list)
    } catch {
      setRegions([])
    }
  }, [])

  const loadContests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await eventService.loadContests()
      setContests(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contests')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSelected = useCallback(async (id: number) => {
    try {
      const c = await eventService.loadContest(id)
      setSelected(c)
      setRules(c.contestPrizeRule ?? [])
      setForm({
        title: c.title,
        scope: c.scope,
        regionCode: c.regionCode ?? "",
        frequency: c.frequency,
        audience: c.audience,
        status: c.status,
        startAt: c.startAt.slice(0, 16),
        endAt: c.endAt.slice(0, 16),
      })
      setRuleForm({ contestId: id, rankStart: 1, rankEnd: 1, prizeValueCent: 0 })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contest')
    }
  }, [])

  useEffect(() => {
    loadContests()
  }, [loadContests])

  useEffect(() => {
    if (editing || (!selected && !loading)) {
      loadRegions(form.scope)
    }
  }, [form.scope, editing, selected, loading, loadRegions])

  const handleCreate = () => {
    setSelected(null)
    setForm(defaultContestForm)
    setRules([])
    setEditing(true)
  }

  const handleSelect = (c: Contest) => {
    setEditing(false)
    loadSelected(c.id)
  }

  const handleSaveContest = async () => {
    const dateErr = validateDateRange(form.frequency, form.startAt, form.endAt)
    if (dateErr) {
      setError(dateErr)
      return
    }
    setSaving(true)
    setError('')
    try {
      if (selected) {
        const update: ContestUpdate = { ...form }
        await eventService.updateContest(selected.id, update)
        await loadSelected(selected.id)
      } else {
        const created = await eventService.createContest(form)
        await loadContests()
        await loadSelected(created.id)
      }
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteContest = async () => {
    if (!selected || !confirm('Delete this contest?')) return
    setSaving(true)
    setError('')
    try {
      await eventService.deleteContest(selected.id)
      setSelected(null)
      setRules([])
      await loadContests()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const handleAddRule = async () => {
    if (!selected || ruleForm.rankStart == null || ruleForm.rankEnd == null || ruleForm.prizeValueCent == null) return
    setSaving(true)
    setError('')
    try {
      await eventService.createPrizeRule({
        contestId: selected.id,
        rankStart: ruleForm.rankStart,
        rankEnd: ruleForm.rankEnd,
        prizeValueCent: ruleForm.prizeValueCent,
      })
      await loadSelected(selected.id)
      setRuleForm({ contestId: selected.id, rankStart: 1, rankEnd: 1, prizeValueCent: 0})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Add rule failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRule = async (id: number) => {
    if (!confirm('Delete this prize rule?')) return
    setSaving(true)
    setError('')
    try {
      await eventService.deletePrizeRule(id)
      if (selected) await loadSelected(selected.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Event Management</h2>
        <button
          type="button"
          onClick={handleCreate}
          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
        >
          New Contest
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-slate-700 bg-slate-850 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-700 text-sm font-medium text-slate-300">Contests</div>
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <p className="p-3 text-slate-500 text-sm">Loading…</p>
              ) : contests.length === 0 ? (
                <p className="p-3 text-slate-500 text-sm">No contests</p>
              ) : (
                <ul className="divide-y divide-slate-700">
                  {contests.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(c)}
                        className={`w-full text-left px-3 py-2 text-sm block truncate ${
                          selected?.id === c.id ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:bg-slate-700/50'
                        }`}
                      >
                        {c.title} ({c.frequency} / {c.status})
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          {selected && !editing && (
            <>
              <div className="rounded-lg border border-slate-700 bg-slate-850 p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium text-slate-100">{selected.title}</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteContest}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-400">
                  <dt>Scope</dt>
                  <dd>{selected.scope}</dd>
                  <dt>Region</dt>
                  <dd>{selected.regionCode ?? ''}</dd>
                  <dt>Frequency</dt>
                  <dd>{selected.frequency}</dd>
                  <dt>Status</dt>
                  <dd>{selected.status}</dd>
                  <dt>Start</dt>
                  <dd>{new Date(selected.startAt).toLocaleString()}</dd>
                  <dt>End</dt>
                  <dd>{new Date(selected.endAt).toLocaleString()}</dd>
                </dl>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-850 p-4">
                <h3 className="font-medium text-slate-100 mb-3">Prize Rules</h3>
                {(() => {
                  // Determine nextRankStart: 1 + max(rankEnd) if rules exist, else 1
                  const nextRankStart =
                    rules.length > 0
                      ? 1 + Math.max(...rules.map(r => r.rankEnd))
                      : 1

                  // Determine the minimum prize of existing rules (if any)
                  const minPrize =
                    rules.length > 0
                      ? Math.min(...rules.map(r => r.prizeValueCent ?? 0))
                      : 0

                  // Always ensure rankEnd >= rankStart (nextRankStart), default to rankStart
                  const currentRankEnd =
                    ruleForm.rankEnd !== undefined
                      ? Math.max(ruleForm.rankEnd, nextRankStart)
                      : nextRankStart

                  // Prize input: Always default to 0 if undefined (do not default to minPrize)
                  let currentPrizeValueCent =
                    ruleForm.prizeValueCent !== undefined
                      ? Math.max(
                          0,
                          rules.length > 0
                            ? Math.min(ruleForm.prizeValueCent, minPrize)
                            : ruleForm.prizeValueCent
                        )
                      : 0

                  // If rankForm.rankStart out of sync with auto-calculated, set it
                  if (ruleForm.rankStart !== nextRankStart) {
                    setTimeout(() =>
                      setRuleForm(f =>
                        f.rankStart !== nextRankStart
                          ? { ...f, rankStart: nextRankStart, rankEnd: nextRankStart }
                          : f
                      ),
                      0
                    )
                  }

                  // Do not auto-update prizeValueCent for minPrize, only default to 0 if undefined
                  if (ruleForm.prizeValueCent === undefined) {
                    setTimeout(() => {
                      setRuleForm(f =>
                        f.prizeValueCent !== 0 ? { ...f, prizeValueCent: 0 } : f
                      )
                    }, 0)
                  }

                  return (
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span>From</span>
                      <span
                        className="inline-flex items-center px-2 py-1 w-24 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm cursor-not-allowed"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      >
                        {nextRankStart}
                      </span>
                      <span> to</span>
                      <input
                        type="number"
                        min={nextRankStart}
                        placeholder="Rank end"
                        value={currentRankEnd}
                        onChange={e => {
                          const val = e.target.value ? parseInt(e.target.value, 10) : undefined
                          setRuleForm(f => ({
                            ...f,
                            // Always keep rankStart as nextRankStart, keep rankEnd >= rankStart
                            rankStart: nextRankStart,
                            rankEnd: val !== undefined ? Math.max(val, nextRankStart) : nextRankStart
                          }))
                        }}
                        className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                      />
                      <span>: Prize =</span>
                      <input
                        type="number"
                        min={0}
                        max={rules.length > 0 ? minPrize : undefined}
                        placeholder="Prize (¢)"
                        value={currentPrizeValueCent}
                        onChange={e => {
                          let inputVal = e.target.value ? parseInt(e.target.value, 10) : undefined
                          // Enforce minimum 0, and if rules exist, also a maximum of minPrize
                          if (inputVal !== undefined) {
                            if (inputVal < 0) inputVal = 0
                            if (rules.length > 0 && inputVal > minPrize) inputVal = minPrize
                          }
                          setRuleForm(f => ({
                            ...f,
                            prizeValueCent: inputVal
                          }))
                        }}
                        className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                      />

                      <button
                        type="button"
                        onClick={handleAddRule}
                        disabled={saving}
                        className="px-2 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
                      >
                        Add Rule
                      </button>
                    </div>
                  )
                })()}
                <ul className="divide-y divide-slate-700">
                  {rules.map((r) => (
                    <li key={r.id} className="py-2 flex items-center justify-between text-sm">
                      <span className="text-slate-300">From {r.rankStart} to {r.rankEnd}: Prize = {r.prizeValueCent}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(r.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
                {rules.length === 0 && <p className="text-slate-500 text-sm">No prize rules yet.</p>}
              </div>
            </>
          )}
          {(editing || (!selected && !loading)) && (
            <div className="rounded-lg border border-slate-700 bg-slate-850 p-4">
              <h3 className="font-medium text-slate-100 mb-3">{selected ? 'Edit Contest' : 'New Contest'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1">Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Scope</label>
                  <select
                    value={form.scope}
                    onChange={(e) => {
                      const scope = e.target.value as RegionLevel
                      setForm((f) => ({ ...f, scope, regionCode: '' }))
                    }}
                    className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  >
                    {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Region</label>
                  <select
                    value={form.regionCode ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, regionCode: e.target.value ?? '' }))}
                    className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  >
                    <option value="">— Select —</option>
                    {regions.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                    {/* Keep current value as option when editing and it's not in the fetched list */}
                    {form.regionCode && !regions.some((r) => r.code === form.regionCode) && (
                      <option value={form.regionCode}>{form.regionCode}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Frequency</label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as ContestFreq }))}
                    className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  >
                    {FREQS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Audience</label>
                  <select
                    value={form.audience}
                    onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value as ContestAudience }))}
                    className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  >
                    {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ContestStatus }))}
                    className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Start (local datetime)</label>
                  <input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                    className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">End (local datetime)</label>
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                    className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveContest}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                {selected && (
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
