import { useState, useEffect, useCallback } from 'react'
import { DataTable, InlineInput } from '../../../shared/components'
import type { ServiceAgent } from '../../../api/client'
import * as serviceAgentService from '../services/serviceAgentService'

export default function ServiceAgentManagement() {
  const [agents, setAgents] = useState<ServiceAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', wechatId: '' })

  const loadAgents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await serviceAgentService.loadAgents()
      setAgents(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  const handleCreate = () => {
    setEditing(-1)
    setForm({ name: '', wechatId: '' })
  }

  const handleEdit = (a: ServiceAgent) => {
    setEditing(a.id)
    setForm({ name: a.name, wechatId: a.wechatId ?? '' })
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (editing === -1) {
        await serviceAgentService.createAgent({ name: form.name.trim(), wechatId: form.wechatId.trim() || null })
      } else if (editing != null) {
        await serviceAgentService.updateAgent(editing, {
          name: form.name.trim(),
          wechatId: form.wechatId.trim() || null,
        })
      }
      setEditing(null)
      await loadAgents()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(null)
    setError('')
  }

  const handleToggleActive = async (a: ServiceAgent) => {
    setSaving(true)
    setError('')
    try {
      await serviceAgentService.updateAgent(a.id, { isActive: !a.isActive })
      await loadAgents()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (a: ServiceAgent) => {
    if (!confirm(`Delete agent "${a.name}"?`)) return
    setSaving(true)
    setError('')
    try {
      await serviceAgentService.deleteAgent(a.id)
      setEditing(null)
      await loadAgents()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', header: 'ID', render: (r: ServiceAgent) => r.id },
    { key: 'name', header: 'Name', render: (r: ServiceAgent) => r.name },
    { key: 'wechatId', header: 'WeChat ID', render: (r: ServiceAgent) => r.wechatId ?? '–' },
    {
      key: 'isActive',
      header: 'Status',
      render: (r: ServiceAgent) => (
        <span className={r.isActive ? 'text-emerald-400' : 'text-slate-500'}>{r.isActive ? 'Active' : 'Disabled'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r: ServiceAgent) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleEdit(r)}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleToggleActive(r)}
            disabled={saving}
            className="text-slate-400 hover:text-slate-300 text-sm disabled:opacity-50"
          >
            {r.isActive ? 'Disable' : 'Enable'}
          </button>
          <button
            type="button"
            onClick={() => handleDelete(r)}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Service Agent Management</h2>
        <button
          type="button"
          onClick={handleCreate}
          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
        >
          New Agent
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
      )}
      {(editing === -1 || (editing != null && editing > 0)) && (
        <div className="rounded-lg border border-slate-700 bg-slate-850 p-4 space-y-3">
          <h3 className="font-medium text-slate-100">{editing === -1 ? 'New Agent' : 'Edit Agent'}</h3>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-slate-500 text-sm mb-1">Name</label>
              <InlineInput
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: String(v) }))}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-slate-500 text-sm mb-1">WeChat ID (optional)</label>
              <InlineInput
                value={form.wechatId}
                onChange={(v) => setForm((f) => ({ ...f, wechatId: String(v) }))}
                disabled={saving}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {loading ? (
        <p className="text-slate-500 text-sm py-4">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          data={agents}
          keyFn={(r) => r.id}
          emptyMessage="No service agents"
        />
      )}
    </div>
  )
}
