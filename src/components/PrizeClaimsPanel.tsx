import { useState, useEffect, useCallback } from 'react'
import { adminApi, type ContestPrizeClaim, type PrizeClaimStatus } from '../api/client'

const STATUS_OPTIONS: PrizeClaimStatus[] = [
  'PENDING_INFO',
  'SUBMITTED',
  'VERIFIED',
  'SHIPPED',
  'COMPLETED',
  'REJECTED',
]

export default function PrizeClaimsPanel() {
  const [claims, setClaims] = useState<ContestPrizeClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [updating, setUpdating] = useState<number | null>(null)

  const loadClaims = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await adminApi.prize.listClaims({ page, size: 20 })
      setClaims(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load claims')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadClaims()
  }, [loadClaims])

  const handleStatusChange = async (claimId: number, status: PrizeClaimStatus) => {
    setUpdating(claimId)
    setError('')
    try {
      const updated = await adminApi.prize.updateClaimStatus(claimId, status)
      setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="h-full flex flex-col bg-slate-900/30">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
        <h3 className="text-sm font-medium text-slate-300">Prize Claims</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-xs text-slate-500 self-center">Page {page}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={claims.length < 20}
            className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => loadClaims()}
            className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
          >
            Refresh
          </button>
        </div>
      </div>
      {error && (
        <p className="mx-4 mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-2 py-1">{error}</p>
      )}
      <div className="flex-1 overflow-auto px-4 py-2">
        {loading ? (
          <p className="text-slate-500 text-sm">Loading…</p>
        ) : claims.length === 0 ? (
          <p className="text-slate-500 text-sm">No prize claims</p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left py-1.5 font-medium">ID</th>
                <th className="text-left py-1.5 font-medium">Contest</th>
                <th className="text-left py-1.5 font-medium">User</th>
                <th className="text-left py-1.5 font-medium">Rank</th>
                <th className="text-left py-1.5 font-medium">Steps</th>
                <th className="text-left py-1.5 font-medium">Prize (¢)</th>
                <th className="text-left py-1.5 font-medium">Status</th>
                <th className="text-left py-1.5 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id} className="border-b border-slate-800 text-slate-300">
                  <td className="py-1.5">{c.id}</td>
                  <td className="py-1.5">{c.contestId}</td>
                  <td className="py-1.5">{c.userId}</td>
                  <td className="py-1.5">{c.rank}</td>
                  <td className="py-1.5">{c.steps}</td>
                  <td className="py-1.5">{c.prizeValueCent ?? '–'}</td>
                  <td className="py-1.5">
                    <select
                      value={c.status}
                      onChange={(e) => handleStatusChange(c.id, e.target.value as PrizeClaimStatus)}
                      disabled={updating === c.id}
                      className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-slate-200 disabled:opacity-50"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 text-slate-500">{new Date(c.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
