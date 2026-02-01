import { useState, useEffect, useCallback } from 'react'
import { DataTable } from '../../../shared/components'
import { type Contest, type ContestRanking, type RankRow } from '../../../api/client'
import * as rankingService from '../services/rankingService'

export default function RankingResults() {
  const [contests, setContests] = useState<Contest[]>([])
  const [selectedContestId, setSelectedContestId] = useState<number | null>(null)
  const [ranking, setRanking] = useState<ContestRanking | null>(null)
  const [loading, setLoading] = useState(true)
  const [rankingLoading, setRankingLoading] = useState(false)
  const [error, setError] = useState('')

  const loadContests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await rankingService.loadContests()
      setContests(list)
      if (list.length > 0 && !selectedContestId) setSelectedContestId(list[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contests')
    } finally {
      setLoading(false)
    }
  }, [selectedContestId])

  const loadRanking = useCallback(async () => {
    if (!selectedContestId) return
    setRankingLoading(true)
    setError('')
    try {
      const r = await rankingService.loadContestRanking(selectedContestId)
      setRanking(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ranking')
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
    { key: 'rank', header: 'Rank', render: (r: RankRow) => <span className={r.abnormal ? 'text-amber-400 font-medium' : ''}>{r.rank}</span> },
    { key: 'userId', header: 'User ID' },
    { key: 'name', header: 'Name', render: (r: RankRow) => <span className={r.abnormal ? 'text-amber-400 font-medium' : ''}>{r.name}</span> },
    { key: 'steps', header: 'Steps', render: (r: RankRow) => <span className={r.abnormal ? 'text-amber-400 font-medium' : ''}>{r.steps.toLocaleString()}</span> },
    { key: 'flag', header: '', render: (r: RankRow) => r.abnormal ? <span className="text-amber-400 text-xs">⚠ abnormal</span> : null },
  ]

  const tailColumns = [
    { key: 'rank', header: 'Rank' },
    { key: 'userId', header: 'User ID' },
    { key: 'name', header: 'Name' },
    { key: 'steps', header: 'Steps', render: (r: RankRow) => r.steps.toLocaleString() },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-100">Ranking & Results</h2>
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="flex items-center gap-4">
        <label className="text-sm text-slate-400">Event</label>
        <select
          value={selectedContestId ?? ''}
          onChange={(e) => setSelectedContestId(e.target.value ? Number(e.target.value) : null)}
          className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200 text-sm min-w-[240px]"
        >
          <option value="">Select contest</option>
          {contests.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({c.frequency} / {c.status})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={loadRanking}
          disabled={rankingLoading || !selectedContestId}
          className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-50"
        >
          {rankingLoading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {ranking && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {ranking.contestTitle} — {ranking.totalEntries} entries (top {ranking.top.length} + last {ranking.tail.length})
          </p>
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Top N</h3>
            <DataTable columns={topColumns} data={ranking.top} keyFn={(r) => r.rank} rowClassName={(r) => r.abnormal ? 'bg-amber-500/10' : ''} />
          </div>
          {ranking.tail.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Trailing</h3>
              <DataTable columns={tailColumns} data={ranking.tail} keyFn={(r) => r.rank} />
            </div>
          )}
        </div>
      )}
      {!ranking && !rankingLoading && selectedContestId && (
        <p className="text-slate-500 text-sm">No ranking data</p>
      )}
      {!selectedContestId && !loading && (
        <p className="text-slate-500 text-sm">Select an event to view rankings</p>
      )}
    </div>
  )
}
