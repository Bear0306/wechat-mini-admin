import { useState, useEffect, useCallback } from 'react'
import {
  adminApi,
  type Contest,
  type ContestWithRules,
  type ContestPrizeRule,
  type ContestCreate,
  type ContestUpdate,
  type PrizeRuleCreate,
  type PrizeRuleUpdate,
  type ContestScope,
  type ContestFreq,
  type ContestAudience,
  type ContestStatus,
} from '../api/client'

const SCOPES: ContestScope[] = ['CITY', 'PROVINCE', 'DISTRICT']
const FREQS: ContestFreq[] = ['DAILY', 'WEEKLY', 'MONTHLY']
const AUDIENCES: ContestAudience[] = ['ADULTS', 'YOUTH']
const STATUSES: ContestStatus[] = ['SCHEDULED', 'ONGOING', 'FINALIZING', 'FINALIZED', 'CANCELED']

const defaultContestForm: ContestCreate = {
  title: '',
  scope: 'CITY',
  regionCode: '',
  heatLevel: 0,
  frequency: 'DAILY',
  audience: 'ADULTS',
  status: 'SCHEDULED',
  rewardTopN: 10,
  prizeMin: 0,
  prizeMax: 0,
  startAt: '',
  endAt: '',
}

export default function ContestCrud() {
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<ContestWithRules | null>(null)
  const [form, setForm] = useState<ContestCreate>(defaultContestForm)
  const [rules, setRules] = useState<ContestPrizeRule[]>([])
  const [ruleForm, setRuleForm] = useState<Partial<PrizeRuleCreate>>({ rankStart: 1, rankEnd: 1, prizeValueCent: 0, audience: null })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadContests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await adminApi.contest.list({ page: 1, size: 100 })
      setContests(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadContests()
  }, [loadContests])

  const loadSelected = useCallback(async (id: number) => {
    try {
      const c = await adminApi.contest.getById(id)
      setSelected(c)
      setRules(c.ContestPrizeRule ?? [])
      setForm({
        title: c.title,
        scope: c.scope,
        regionCode: c.regionCode,
        heatLevel: c.heatLevel,
        frequency: c.frequency,
        audience: c.audience,
        status: c.status,
        rewardTopN: c.rewardTopN,
        prizeMin: c.prizeMin,
        prizeMax: c.prizeMax,
        startAt: c.startAt.slice(0, 16),
        endAt: c.endAt.slice(0, 16),
      })
      setRuleForm({ contestId: id, rankStart: 1, rankEnd: 1, prizeValueCent: 0, audience: null })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contest')
    }
  }, [])

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
    if (!form.startAt || !form.endAt) {
      setError('Start and end dates required')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (selected) {
        const update: ContestUpdate = { ...form }
        await adminApi.contest.update(selected.id, update)
        await loadSelected(selected.id)
      } else {
        const created = await adminApi.contest.create(form)
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
      await adminApi.contest.delete(selected.id)
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
      await adminApi.prizeRule.create({
        contestId: selected.id,
        rankStart: ruleForm.rankStart,
        rankEnd: ruleForm.rankEnd,
        prizeValueCent: ruleForm.prizeValueCent,
        audience: ruleForm.audience ?? undefined,
      })
      await loadSelected(selected.id)
      setRuleForm({ contestId: selected.id, rankStart: 1, rankEnd: 1, prizeValueCent: 0, audience: null })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Add rule failed')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateRule = async (id: number, data: PrizeRuleUpdate) => {
    setSaving(true)
    setError('')
    try {
      await adminApi.prizeRule.update(id, data)
      if (selected) await loadSelected(selected.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update rule failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRule = async (id: number) => {
    if (!confirm('Delete this prize rule?')) return
    setSaving(true)
    setError('')
    try {
      await adminApi.prizeRule.delete(id)
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
        <h2 className="text-lg font-semibold text-slate-100">Contests & Prize Rules</h2>
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
                        {c.title} ({c.status})
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
                  <dd>{selected.regionCode}</dd>
                  <dt>Frequency</dt>
                  <dd>{selected.frequency}</dd>
                  <dt>Status</dt>
                  <dd>{selected.status}</dd>
                  <dt>Start</dt>
                  <dd>{new Date(selected.startAt).toLocaleString()}</dd>
                  <dt>End</dt>
                  <dd>{new Date(selected.endAt).toLocaleString()}</dd>
                  <dt>Prize (min–max)</dt>
                  <dd>{selected.prizeMin}–{selected.prizeMax}¢</dd>
                </dl>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-850 p-4">
                <h3 className="font-medium text-slate-100 mb-3">Prize Rules</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  <input
                    type="number"
                    min={1}
                    placeholder="Rank start"
                    value={ruleForm.rankStart ?? ''}
                    onChange={(e) => setRuleForm((f) => ({ ...f, rankStart: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
                    className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Rank end"
                    value={ruleForm.rankEnd ?? ''}
                    onChange={(e) => setRuleForm((f) => ({ ...f, rankEnd: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
                    className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Prize (¢)"
                    value={ruleForm.prizeValueCent ?? ''}
                    onChange={(e) => setRuleForm((f) => ({ ...f, prizeValueCent: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
                    className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                  />
                  <select
                    value={ruleForm.audience ?? ''}
                    onChange={(e) => setRuleForm((f) => ({ ...f, audience: (e.target.value || null) as ContestAudience | null }))}
                    className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                  >
                    <option value="">Any</option>
                    {AUDIENCES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddRule}
                    disabled={saving}
                    className="px-2 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
                  >
                    Add Rule
                  </button>
                </div>
                <ul className="divide-y divide-slate-700">
                  {rules.map((r) => (
                    <li key={r.id} className="py-2 flex items-center justify-between text-sm">
                      <span className="text-slate-300">Rank {r.rankStart}–{r.rankEnd}: {r.prizeValueCent}¢ {r.audience ? `(${r.audience})` : ''}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(r.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
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
                    onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as ContestScope }))}
                    className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  >
                    {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Region code</label>
                  <input
                    value={form.regionCode}
                    onChange={(e) => setForm((f) => ({ ...f, regionCode: e.target.value }))}
                    className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Heat level</label>
                  <input
                    type="number"
                    value={form.heatLevel}
                    onChange={(e) => setForm((f) => ({ ...f, heatLevel: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  />
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
                  <label className="block text-slate-400 mb-1">Reward top N</label>
                  <input
                    type="number"
                    min={1}
                    value={form.rewardTopN}
                    onChange={(e) => setForm((f) => ({ ...f, rewardTopN: parseInt(e.target.value, 10) || 10 }))}
                    className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Prize min (¢)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.prizeMin}
                    onChange={(e) => setForm((f) => ({ ...f, prizeMin: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Prize max (¢)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.prizeMax}
                    onChange={(e) => setForm((f) => ({ ...f, prizeMax: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  />
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
