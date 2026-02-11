import { useState, useEffect, useCallback, useMemo } from 'react'
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

// ----- ADD: import RankingResults -----
import type { View } from '../../../pages/Dashboard';

interface EventManagementProps {
  onSelect: (v: View, contestId?: number) => void;
}

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

function isoToInputLocalStr(iso: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const min = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${min}`
}

function inputLocalStrToIso(input: string): string {
  if (!input) return ''
  return new Date(input).toISOString()
}

function validateDateRange(freq: ContestFreq, startAtIso: string, endAtIso: string): string | null {
  if (!startAtIso || !endAtIso) return '请填写开始和结束日期'
  const start = new Date(startAtIso).getTime()
  const end = new Date(endAtIso).getTime()
  if (end <= start) return '结束时间必须在开始时间之后'
  const dayMs = 24 * 60 * 60 * 1000
  if (freq === 'DAILY' && end - start > 2 * dayMs) return '每日竞赛持续时间应≤2天'
  if (freq === 'WEEKLY' && (end - start < 6 * dayMs || end - start > 8 * dayMs)) return '每周竞赛应持续约7天'
  if (freq === 'MONTHLY' && (end - start < 28 * dayMs || end - start > 32 * dayMs)) return '每月竞赛应持续约30天'
  return null
}

type SortState = {
  field: keyof Contest | null
  direction: 'asc' | 'desc'
}

export default function EventManagement({ onSelect }: EventManagementProps) {
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
  // --- View switching state ----

  const regionMap = useMemo(() => {
    const map: Record<string, Region> = {}
    for (const r of regions) map[r.code] = r
    return map
  }, [regions])

  const [searchId, setSearchId] = useState('')
  const [searchTitle, setSearchTitle] = useState('')
  const [searchScope, setSearchScope] = useState('')
  const [searchRegion, setSearchRegion] = useState('')
  const [searchFreq, setSearchFreq] = useState('')
  const [searchAudience, setSearchAudience] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [searchStartAt, setSearchStartAt] = useState('');
  const [searchEndAt, setSearchEndAt] = useState('');
  const [sort, setSort] = useState<SortState>({ field: null, direction: 'asc' })

  const regionOptions = useMemo(() => {
    if (!searchScope || searchScope === "" || searchScope === "NONE") {
      return regions
    }
    return regions.filter(r => r.level === searchScope)
  }, [searchScope, regions])

  useEffect(() => {
    if (searchScope === 'NONE') {
      const noneRegions = regions.filter(r => r.level === 'NONE')
      if (noneRegions.length === 1) {
        if (searchRegion !== noneRegions[0].code) {
          setSearchRegion(noneRegions[0].code)
        }
      }
    }
  }, [searchScope, regions, searchRegion])

  useEffect(() => {
    (async () => {
      try {
        const all = await eventService.loadAllRegions()
        setRegions(all)
      } catch {
        setRegions([])
      }
    })()
  }, [])

  const filterContest = (contest: Contest) => {
    if (searchId && contest.id.toString() !== searchId.trim()) return false
    if (searchStatus && contest.status !== searchStatus) return false
    if (searchTitle && !contest.title.toLowerCase().includes(searchTitle.toLowerCase())) return false
    if (searchScope && contest.scope !== searchScope) return false
    if (searchRegion && contest.regionCode !== searchRegion) return false
    if (searchFreq && contest.frequency !== searchFreq) return false
    if (searchAudience && contest.audience !== searchAudience) return false
    if (searchStartAt) {
      const filterStartIso = inputLocalStrToIso(searchStartAt)
      if (new Date(contest.startAt).getTime() < new Date(filterStartIso).getTime()) {
        return false
      }
    }
    if (searchEndAt) {
      const filterEndIso = inputLocalStrToIso(searchEndAt)
      if (new Date(contest.endAt).getTime() > new Date(filterEndIso).getTime()) {
        return false
      }
    }
    return true
  }

  const sortedFilteredContests = useMemo(() => {
    let filtered = contests.filter(filterContest)

    if (sort.field) {
      filtered = filtered.slice().sort((a, b) => {
        let valA: any = a[sort.field!]
        let valB: any = b[sort.field!]
        if (typeof valA === 'undefined' || valA === null) valA = ''
        if (typeof valB === 'undefined' || valB === null) valB = ''
        if (typeof valA === 'string' && typeof valB === 'string') {
          valA = valA.toLowerCase()
          valB = valB.toLowerCase()
        }
        // For id, compare as number
        if (sort.field === 'id') {
          return (sort.direction === 'asc' ? 1 : -1) * (Number(valA) - Number(valB))
        }
        if (valA < valB) return sort.direction === 'asc' ? -1 : 1
        if (valA > valB) return sort.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [contests, sort, searchId, searchTitle, searchScope, searchRegion, searchFreq, searchAudience, searchStatus, searchStartAt, searchEndAt])

  const loadContests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await eventService.loadContests()
      setContests(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取竞赛失败')
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
        startAt: isoToInputLocalStr(c.startAt),
        endAt: isoToInputLocalStr(c.endAt),
      })
      setRuleForm({ contestId: id, rankStart: 1, rankEnd: 1, prizeValueCent: 0 })
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取竞赛失败')
    }
  }, [])

  useEffect(() => {
    loadContests()
  }, [loadContests])

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
    const startAtIso = inputLocalStrToIso(form.startAt)
    const endAtIso = inputLocalStrToIso(form.endAt)
    const dateErr = validateDateRange(form.frequency, startAtIso, endAtIso)
    if (dateErr) {
      setError(dateErr)
      return
    }
    setSaving(true)
    setError('')
    try {
      if (selected) {
        const update: ContestUpdate = {
          ...form,
          startAt: startAtIso,
          endAt: endAtIso
        }
        await eventService.updateContest(selected.id, update)
        await loadSelected(selected.id)
      } else {
        const created = await eventService.createContest({
          ...form,
          startAt: startAtIso,
          endAt: endAtIso
        })
        await loadContests()
        await loadSelected(created.id)
      }
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteContestById = async (contestId: number) => {
    if (!contestId || !confirm('确定要删除此竞赛吗？')) return
    setSaving(true)
    setError('')
    try {
      await eventService.deleteContest(contestId)
      if (selected?.id === contestId) {
        setSelected(null)
        setRules([])
      }
      await loadContests()
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
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
      setError(e instanceof Error ? e.message : '增加规则失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRule = async (id: number) => {
    if (!confirm('确定要删除此奖励规则吗？')) return
    setSaving(true)
    setError('')
    try {
      await eventService.deletePrizeRule(id)
      if (selected) await loadSelected(selected.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    } finally {
      setSaving(false)
    }
  }

  const handleSortChange = (field: keyof Contest) => {
    setSort(prev => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      } else {
        return { field, direction: 'asc' }
      }
    })
  }

  function statusClass(s: ContestStatus) {
    switch (s) {
      case 'ONGOING': return 'text-green-400'
      case 'SCHEDULED': return 'text-blue-400'
      case 'FINALIZED': return 'text-gray-400'
      case 'CANCELED': return 'text-red-400'
      case 'FINALIZING': return 'text-yellow-400'
      default: return ''
    }
  }

  function getRegionDisplay(regionCode: string): string {
    const found = regionMap[regionCode]
    if (found) return `${found.name} (${found.code})`
    return regionCode ? regionCode : ''
  }

  function getRegionLabelByCode(regionCode: string) {
    const found = regionMap[regionCode]
    if (found) return `${found.name} (${found.code})`
    return regionCode || ''
  }

  function getCodeFromLabel(val: string): string {
    const match = regions.find(r => `${r.name} (${r.code})` === val)
    if (match) return match.code
    return val
  }

  // view jump logic: if rankingContestId is set, only render RankingResults for that contest
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">竞赛管理</h2>
        <button
          type="button"
          onClick={handleCreate}
          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
        >
          新建竞赛
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* FILTERS */}
      <div className="rounded-lg border border-slate-700 bg-slate-850 px-3 py-3 mb-2">
        <div className="flex flex-wrap gap-3 items-end text-sm">
          <div>
            <label className="block text-slate-400 mb-1">竞赛ID</label>
            <input
              value={searchId}
              onChange={e => {
                // numbers only
                const val = e.target.value.replace(/\D/g, '')
                setSearchId(val)
              }}
              className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100"
              placeholder="搜索竞赛ID"
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">竞赛名称</label>
            <input
              value={searchTitle}
              onChange={e => setSearchTitle(e.target.value)}
              className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100"
              placeholder="搜索竞赛名称"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">竞赛范围</label>
            <select
              value={searchScope}
              onChange={e => {
                setSearchScope(e.target.value)
                setSearchRegion('')
              }}
              className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100"
            >
              <option value="">— 全部 —</option>
              {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">所属区域</label>
            <input
              type="text"
              list="region-options"
              value={
                searchRegion
                  ? getRegionLabelByCode(searchRegion)
                  : ""
              }
              onChange={e => {
                const typed = e.target.value
                setSearchRegion(getCodeFromLabel(typed))
              }}
              placeholder="搜索/选择区域"
              className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100"
              disabled={!!searchScope && searchScope === 'NONE'}
              style={{ opacity: !!searchScope && searchScope === 'NONE' ? 0.6 : 1 }}
              autoComplete="off"
            />
            <datalist id="region-options">
              <option value="">— 全部 —</option>
              {regionOptions.map(region => (
                <option key={region.code} value={`${region.name} (${region.code})`} />
              ))}
              {searchRegion &&
                !regionOptions.some(r => r.code === searchRegion) && (
                  <option value={getRegionLabelByCode(searchRegion)}>{getRegionLabelByCode(searchRegion)}</option>
                )}
            </datalist>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">竞赛频率</label>
            <select
              value={searchFreq}
              onChange={e => setSearchFreq(e.target.value)}
              className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100"
            >
              <option value="">— 全部 —</option>
              {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">目标群体</label>
            <select
              value={searchAudience}
              onChange={e => setSearchAudience(e.target.value)}
              className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100"
            >
              <option value="">— 全部 —</option>
              {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">竞赛状态</label>
            <select
              value={searchStatus}
              onChange={e => setSearchStatus(e.target.value)}
              className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100"
            >
              <option value="">— 全部 —</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">从（开始日期时间）</label>
            <input
              type="datetime-local"
              value={searchStartAt}
              onChange={e =>setSearchStartAt(e.target.value)}
              className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100"
              placeholder="开始时间"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">到（结束日期时间）</label>
            <input
              type="datetime-local"
              value={searchEndAt}
              onChange={e => setSearchEndAt(e.target.value)}
              className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100"
              placeholder="结束时间"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={() => {
                setSearchId('')
                setSearchTitle('')
                setSearchScope('')
                setSearchRegion('')
                setSearchFreq('')
                setSearchAudience('')
                setSearchStatus('')
                setSearchStartAt('')
                setSearchEndAt('')
              }}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded"
            >
              清空
            </button>
          </div>
        </div>
        <div className="text-xs text-slate-500 pt-1">
          {searchStatus === 'ONGOING' || !searchStatus
            ? <span>显示全部竞赛。</span>
            : <span>
                <span className={
                  searchStatus === 'SCHEDULED'
                    ? 'text-blue-400 font-semibold'
                    : searchStatus === 'FINALIZED'
                      ? 'text-gray-400 font-semibold'
                      : searchStatus === 'CANCELED'
                        ? 'text-red-400 font-semibold'
                        : searchStatus === 'FINALIZING'
                          ? 'text-yellow-400 font-semibold'
                          : ''
                }>
                  {searchStatus}
                </span> 状态的竞赛被显示。
              </span>
          }
        </div>
      </div>

      {/* TABLE */}
      {(() => {
        const PAGE_SIZE = 10;
        const [page, setPage] = useState(1);
        const total = sortedFilteredContests.length;
        const totalPages = Math.ceil(total / PAGE_SIZE);
        const pagedContests = sortedFilteredContests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

        useEffect(() => {
          if (page > totalPages) setPage(1);
        }, [totalPages, page]);

        return (
          <div className="rounded-lg border border-slate-700 bg-slate-850 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700 text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 cursor-pointer select-none" onClick={() => handleSortChange('id')}>
                    ID
                    {sort.field === 'id' && (sort.direction === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  <th className="px-3 py-2 cursor-pointer select-none" onClick={() => handleSortChange('title')}>
                    名称
                    {sort.field === 'title' && (sort.direction === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  <th className="px-3 py-2 cursor-pointer select-none" onClick={() => handleSortChange('scope')}>
                    范围
                    {sort.field === 'scope' && (sort.direction === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  <th className="px-3 py-2 cursor-pointer select-none" onClick={() => handleSortChange('regionCode')}>
                    区域
                    {sort.field === 'regionCode' && (sort.direction === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  <th className="px-3 py-2 cursor-pointer select-none" onClick={() => handleSortChange('frequency')}>
                    频率
                    {sort.field === 'frequency' && (sort.direction === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  <th className="px-3 py-2 cursor-pointer select-none" onClick={() => handleSortChange('audience')}>
                    目标群体
                    {sort.field === 'audience' && (sort.direction === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  <th className="px-3 py-2 cursor-pointer select-none" onClick={() => handleSortChange('status')}>
                    状态
                    {sort.field === 'status' && (sort.direction === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  <th className="px-3 py-2 cursor-pointer select-none" onClick={() => handleSortChange('startAt')}>
                    开始时间
                    {sort.field === 'startAt' && (sort.direction === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  <th className="px-3 py-2 cursor-pointer select-none" onClick={() => handleSortChange('endAt')}>
                    结束时间
                    {sort.field === 'endAt' && (sort.direction === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  <th className="px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="p-4 text-slate-500 text-center">加载中…</td>
                  </tr>
                ) : pagedContests.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-4 text-slate-500 text-center">无匹配竞赛</td>
                  </tr>
                ) : (
                  pagedContests.map((c) => (
                    <tr
                      key={c.id}
                      className={selected?.id === c.id ? "bg-blue-700/20" : ""}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSelect(c)}
                    >
                      <td className="px-3 py-2 font-mono">{c.id}</td>
                      <td className="px-3 py-2 truncate">{c.title}</td>
                      <td className="px-3 py-2">{c.scope}</td>
                      <td className="px-3 py-2">
                        {getRegionDisplay(c.regionCode)}
                      </td>
                      <td className="px-3 py-2">{c.frequency}</td>
                      <td className="px-3 py-2">{c.audience}</td>
                      <td className={"px-3 py-2 " + statusClass(c.status)}>{c.status}</td>
                      <td className="px-3 py-2">{isoToInputLocalStr(c.startAt).replace('T', ' ')}</td>
                      <td className="px-3 py-2">{isoToInputLocalStr(c.endAt).replace('T', ' ')}</td>
                      <td className="px-3 py-2 flex gap-1 items-center">
                        <button
                          type="button"
                          className="px-2 py-1 bg-blue-800 hover:bg-blue-600 text-slate-100 rounded text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditing(true)
                            loadSelected(c.id)
                          }}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 bg-red-800 hover:bg-red-600 text-white rounded text-xs"
                          onClick={async (e) => {
                            e.stopPropagation()
                            await handleDeleteContestById(c.id)
                          }}
                        >
                          删除
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 bg-green-800 hover:bg-green-600 text-white rounded text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelect) {
                              onSelect('ranking', c.id);
                            }
                          }}
                        >
                          排行榜
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-2 px-4 py-1">
              <div className="text-xs text-slate-400">
                第 {page} / {Math.max(totalPages, 1)} 页 &mdash; 共 {total} 个竞赛
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200 disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="text-xs px-1">{page}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200 disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="space-y-4">
        {selected && !editing && (
          <>
            <div className="rounded-lg border border-slate-700 bg-slate-850 p-4">
              <h3 className="font-medium text-slate-100 mb-3">奖励规则</h3>
              {(() => {
                const nextRankStart =
                  rules.length > 0
                    ? 1 + Math.max(...rules.map(r => r.rankEnd))
                    : 1

                const minPrize =
                  rules.length > 0
                    ? Math.min(...rules.map(r => r.prizeValueCent ?? 0))
                    : 0

                const currentRankEnd =
                  ruleForm.rankEnd !== undefined
                    ? Math.max(ruleForm.rankEnd, nextRankStart)
                    : nextRankStart

                let currentPrizeValueCent =
                  ruleForm.prizeValueCent !== undefined
                    ? Math.max(
                        0,
                        rules.length > 0
                          ? Math.min(ruleForm.prizeValueCent, minPrize)
                          : ruleForm.prizeValueCent
                      )
                    : 0

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

                if (ruleForm.prizeValueCent === undefined) {
                  setTimeout(() => {
                    setRuleForm(f =>
                      f.prizeValueCent !== 0 ? { ...f, prizeValueCent: 0 } : f
                    )
                  }, 0)
                }

                return (
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span>从</span>
                    <span
                      className="inline-flex items-center px-2 py-1 w-24 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm cursor-not-allowed"
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >
                      {nextRankStart}
                    </span>
                    <span> 到</span>
                    <input
                      type="number"
                      min={nextRankStart}
                      placeholder="结束排名"
                      value={currentRankEnd}
                      onChange={e => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : undefined
                        setRuleForm(f => ({
                          ...f,
                          rankStart: nextRankStart,
                          rankEnd: val !== undefined ? Math.max(val, nextRankStart) : nextRankStart
                        }))
                      }}
                      className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                    />
                    <span>奖励 =</span>
                    <input
                      type="number"
                      min={0}
                      max={rules.length > 0 ? minPrize : undefined}
                      placeholder="奖励（分）"
                      value={currentPrizeValueCent}
                      onChange={e => {
                        let inputVal = e.target.value ? parseInt(e.target.value, 10) : undefined
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
                      增加规则
                    </button>
                  </div>
                )
              })()}
              <ul className="divide-y divide-slate-700">
                {rules.map((r) => (
                  <li key={r.id} className="py-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">排名{r.rankStart}到{r.rankEnd}：奖励 {r.prizeValueCent}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(r.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      删除
                    </button>
                  </li>
                ))}
              </ul>
              {rules.length === 0 && <p className="text-slate-500 text-sm">暂无奖励规则。</p>}
            </div>
          </>
        )}

        {(editing || (!selected && !loading)) && (
          <div className="rounded-lg border border-slate-700 bg-slate-850 p-4">
            <h3 className="font-medium text-slate-100 mb-3">{selected ? '编辑竞赛' : '新建竞赛'}</h3>
            <div className="flex flex-wrap gap-3 items-end text-sm w-full">
              <div className="flex flex-col min-w-[120px]">
                <label className="block text-slate-400 mb-1">竞赛名称</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  style={{ minWidth: 0 }}
                />
              </div>
              <div className="flex flex-col min-w-[100px]">
                <label className="block text-slate-400 mb-1">竞赛范围</label>
                <select
                  value={form.scope}
                  onChange={e => {
                    const scope = e.target.value as RegionLevel
                    setForm(f => {
                      let newRegionCode = ''
                      const firstRegionForScope = regions.find(r => r.level === scope)
                      newRegionCode = firstRegionForScope ? firstRegionForScope.code : ''
                      return {
                        ...f,
                        scope,
                        regionCode: newRegionCode
                      }
                    })
                  }}
                  className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                >
                  {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col min-w-[180px]">
                <label className="block text-slate-400 mb-1">所属区域</label>
                <input
                  type="text"
                  list="region-combo-options"
                  value={getRegionLabelByCode(form.regionCode)}
                  onChange={e => {
                    const val = e.target.value
                    setForm(f => {
                      const code = getCodeFromLabel(val)
                      return {
                        ...f,
                        regionCode: code
                      }
                    })
                  }}
                  placeholder={
                    (() => {
                      if (form.scope) {
                        const regionForScope = regions.find(r => r.level === form.scope)
                        if (regionForScope) return `${regionForScope.name} (${regionForScope.code})`
                        return '输入或选择区域'
                      }
                      if (regions.length > 0) return `${regions[0].name} (${regions[0].code})`
                      return '输入或选择区域'
                    })()
                  }
                  className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                  autoComplete="off"
                />
                <datalist id="region-combo-options">
                  {regions
                    .filter(r => (form.scope ? r.level === form.scope : true))
                    .map(r => (
                      <option
                        key={r.code}
                        value={`${r.name} (${r.code})`}
                      />
                    ))}
                </datalist>
                {(() => {
                  const scopedRegions = regions.filter(r => r.level === form.scope)
                  if ((!form.regionCode || !scopedRegions.some(r => r.code === form.regionCode)) && scopedRegions.length > 0) {
                    setTimeout(() => {
                      setForm(f => ({
                        ...f,
                        regionCode: scopedRegions[0].code
                      }))
                    }, 0)
                  }
                  return null
                })()}
              </div>
              <div className="flex flex-col min-w-[100px]">
                <label className="block text-slate-400 mb-1">竞赛频率</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as ContestFreq }))}
                  className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                >
                  {FREQS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="flex flex-col min-w-[100px]">
                <label className="block text-slate-400 mb-1">目标群体</label>
                <select
                  value={form.audience}
                  onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value as ContestAudience }))}
                  className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                >
                  {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="flex flex-col min-w-[100px]">
                <label className="block text-slate-400 mb-1">竞赛状态</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ContestStatus }))}
                  className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col min-w-[170px]">
                <label className="block text-slate-400 mb-1">开始时间（本地）</label>
                <input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      startAt: e.target.value
                    }))
                  }
                  className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
                />
              </div>
              <div className="flex flex-col min-w-[170px]">
                <label className="block text-slate-400 mb-1">结束时间（本地）</label>
                <input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      endAt: e.target.value
                    }))
                  }
                  className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100"
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
                {saving ? '保存中…' : '保存'}
              </button>
              {selected && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm"
                >
                  取消
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
