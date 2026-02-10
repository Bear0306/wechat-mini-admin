interface DashboardHeaderProps {
  onLogout: () => void
}

export default function DashboardHeader({ onLogout }: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
      <h1 className="text-lg font-semibold text-slate-100">管理后台</h1>
      <button
        type="button"
        onClick={onLogout}
        className="px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-colors"
      >
        退出登录
      </button>
    </header>
  )
}
