import { useState, useEffect, useCallback } from 'react'
import { InlineSelect } from '../../../shared/components'
import { adminApi, type ContestPrizeClaim, type PrizeClaimStatus, type ServiceAgent } from '../../../api/client'
import * as rewardService from '../services/rewardService'

const STATUS_OPTIONS: { value: PrizeClaimStatus; label: string }[] = [
  { value: 'PENDING_INFO', label: 'Pending Info' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'SHIPPED', label: 'Fulfilled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
]

const COMPLETED_STATUS = 'COMPLETED'

export default function RewardClaimManagement() {
  const [claims, setClaims] = useState<ContestPrizeClaim[]>([])
  const [agents, setAgents] = useState<ServiceAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [updating, setUpdating] = useState<number | null>(null)

  const loadClaims = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await rewardService.loadClaims(page, 30)
      setClaims(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load claims')
    } finally {
      setLoading(false)
    }
  }, [page])

  const loadAgents = useCallback(async () => {
    try {
      const list = await adminApi.serviceAgent.listActive()
      setAgents(list)
    } catch {
      setAgents([])
    }
  }, [])

  useEffect(() => {
    loadClaims()
  }, [loadClaims])

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  const handleStatusChange = async (claimId: number, status: PrizeClaimStatus) => {
    setUpdating(claimId)
    setError('')
    try {
      const updated = await rewardService.updateClaimStatus(claimId, status)
      setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setUpdating(null)
    }
  }

  const handleAssignAgent = async (claimId: number, agentId: number | null) => {
    setUpdating(claimId)
    setError('')
    try {
      const updated = await rewardService.assignAgent(claimId, agentId)
      setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assign failed')
    } finally {
      setUpdating(null)
    }
  }

  const isCompleted = (status: PrizeClaimStatus) => status === COMPLETED_STATUS

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Reward & Claim Management</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-2 py-1.5 text-sm rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-slate-500 self-center px-2">Page {page}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={claims.length < 30}
            className="px-2 py-1.5 text-sm rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => loadClaims()}
            className="px-2 py-1.5 text-sm rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
          >
            Refresh
          </button>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700 bg-slate-800/50">
              <th className="text-left py-3 px-4 font-medium">ID</th>
              <th className="text-left py-3 px-4 font-medium">Contest</th>
              <th className="text-left py-3 px-4 font-medium">User</th>
              <th className="text-left py-3 px-4 font-medium">Rank</th>
              <th className="text-left py-3 px-4 font-medium">Steps</th>
              <th className="text-left py-3 px-4 font-medium">Prize (¢)</th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
              <th className="text-left py-3 px-4 font-medium">Agent</th>
              <th className="text-left py-3 px-4 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : claims.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  No prize claims
                </td>
              </tr>
            ) : (
              claims.map((c) => {
                const done = isCompleted(c.status)
                return (
                  <tr key={c.id} className="border-b border-slate-800 text-slate-300 hover:bg-slate-800/30">
                    <td className="py-3 px-4">{c.id}</td>
                    <td className="py-3 px-4">{c.contestId}</td>
                    <td className="py-3 px-4">{c.userId}</td>
                    <td className="py-3 px-4">{c.rank}</td>
                    <td className="py-3 px-4">{c.steps.toLocaleString()}</td>
                    <td className="py-3 px-4">{c.prizeValueCent ?? '–'}</td>
                    <td className="py-3 px-4">
                      <InlineSelect
                        value={c.status}
                        options={STATUS_OPTIONS}
                        onChange={(v) => handleStatusChange(c.id, v as PrizeClaimStatus)}
                        disabled={done || updating === c.id}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={c.assignedAgentId ?? ''}
                        onChange={(e) =>
                          handleAssignAgent(c.id, e.target.value ? Number(e.target.value) : null)
                        }
                        disabled={done || updating === c.id}
                        className="min-w-[120px] rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                      >
                        <option value="">—</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(c.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
