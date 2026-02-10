import type { View } from '../pages/Dashboard'

interface DashboardSidebarProps {
  view: View
  onSelect: (v: View) => void
}

const menu: { id: View; label: string }[] = [
  { id: 'events', label: '赛事管理' },
  { id: 'ranking', label: '排名与成绩' },
  { id: 'reward', label: '奖品与兑奖管理' },
  { id: 'user', label: '用户管理' },
  { id: 'serviceAgent', label: '客服管理' },
]

export default function DashboardSidebar({ view, onSelect }: DashboardSidebarProps) {
  return (
    <aside className="w-56 shrink-0 border-r border-slate-800 bg-slate-900/30 flex flex-col py-4">
      <nav className="px-2 space-y-0.5">
        {menu.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === item.id
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
