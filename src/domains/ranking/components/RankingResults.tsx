import { useState, useEffect, useCallback, useMemo } from 'react'
import { DataTable } from '../../../shared/components'
import { type Contest, type ContestRanking, type RankRow } from '../../../api/client'
import * as rankingService from '../services/rankingService'

interface Props {
  contestId?: number;
}

export default function RankingResults({ contestId }: Props) {
  const [contests, setContests] = useState<Contest[]>([])
  const [selectedContestId, setSelectedContestId] = useState<number | null>(null)
  const [ranking, setRanking] = useState<ContestRanking | null>(null)
  const [loading, setLoading] = useState(true)
  const [rankingLoading, setRankingLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedContest = useMemo(
    () => contests.find(c => c.id === selectedContestId) ?? null,
    [contests, selectedContestId]
  )

  const loadContests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await rankingService.loadContests()
      setContests(list)
      if (contestId && !selectedContestId) {
        setSelectedContestId(contestId)
        
      } else if (list.length > 0 && !selectedContestId) {
        setSelectedContestId(list[0].id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '赛事列表加载失败')
    } finally {
      setLoading(false)
    }
  }, [contestId, selectedContestId])

  const loadRanking = useCallback(async () => {
    if (!selectedContestId) return
    setRankingLoading(true)
    setError('')
    try {
      const r = await rankingService.loadContestRanking(selectedContestId)
      setRanking(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : '排名数据加载失败')
      setRanking(null)
    } finally {
      setRankingLoading(false)
    }
  }, [selectedContestId])

  useEffect(() => {
    loadContests()
  }, [loadContests])

  useEffect(() => {
    loadRanking()
  }, [loadRanking])

  const topColumns = [
    { key: 'rank', header: '排名', render: (r: RankRow) => <span className={r.abnormal ? 'text-amber-400 font-medium' : ''}>{r.rank}</span> },
    { key: 'userId', header: '用户ID' },
    { key: 'name', header: '姓名', render: (r: RankRow) => <span className={r.abnormal ? 'text-amber-400 font-medium' : ''}>{r.name}</span> },
    { key: 'steps', header: '步数', render: (r: RankRow) => <span className={r.abnormal ? 'text-amber-400 font-medium' : ''}>{r.steps.toLocaleString()}</span> },
    { key: 'flag', header: '', render: (r: RankRow) => r.abnormal ? <span className="text-amber-400 text-xs">⚠ 异常</span> : null },
  ]

  const tailColumns = [
    { key: 'rank', header: '排名' },
    { key: 'userId', header: '用户ID' },
    { key: 'name', header: '姓名' },
    { key: 'steps', header: '步数', render: (r: RankRow) => r.steps.toLocaleString() },
  ]

  const formatDate = (iso: string | undefined) => {
    if (!iso) return '';
    const d = new Date(iso)
    if (isNaN(d.valueOf())) return '';
    return d.toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-100">排名与成绩</h2>
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm text-slate-400">赛事ID</label>
          <select
            value={selectedContestId ?? ''}
            onChange={(e) => {
              setSelectedContestId(e.target.value ? Number(e.target.value) : null);
            }}
            className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200 text-sm min-w-[240px]"
          >
            {contests.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id}
              </option>
            ))}
          </select>
        {selectedContest && (
          <div className="text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 whitespace-nowrap">
            <span>赛事ID: <span className="text-slate-200">{selectedContest.id}</span></span>
            <span>赛事名称: <span className="text-slate-200">{selectedContest.title}</span></span>
            <span>频率: <span className="text-slate-200">{selectedContest.frequency}</span></span>
            <span>状态: <span className="text-slate-200">{selectedContest.status}</span></span>
            <span>开始: <span className="text-slate-200">{formatDate(selectedContest.startAt)}</span></span>
            <span>结束: <span className="text-slate-200">{formatDate(selectedContest.endAt)}</span></span>
          </div>
        )}
      </div>
      {ranking && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {ranking.contestTitle} — 共 {ranking.totalEntries} 条参赛数据（前 {ranking.top.length} 名 + 后 {ranking.tail.length} 名）
          </p>
          <div className="flex flex-col md:flex-row md:space-x-8 space-y-4 md:space-y-0 w-full">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-slate-400 mb-2">前 N 名</h3>
              <DataTable columns={topColumns} data={ranking.top} keyFn={(r) => r.rank} rowClassName={(r) => r.abnormal ? 'bg-amber-500/10' : ''} />
            </div>
            {ranking.tail.length > 0 && (
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-400 mb-2">末尾数据</h3>
                <DataTable columns={tailColumns} data={ranking.tail} keyFn={(r) => r.rank} />
              </div>
            )}
          </div>
        </div>
      )}
      {!ranking && !rankingLoading && selectedContestId && (
        <p className="text-slate-500 text-sm">暂无排名数据</p>
      )}
      {!selectedContestId && !loading && (
        <p className="text-slate-500 text-sm">请选择赛事以查看排名</p>
      )}
    </div>
  )
}
