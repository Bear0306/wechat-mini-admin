import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import DashboardHeader from '../components/DashboardHeader'
import DashboardSidebar from '../components/DashboardSidebar'
import ContestCrud from '../components/ContestCrud'
import PrizeClaimsPanel from '../components/PrizeClaimsPanel'

export type View = 'contests'

export default function Dashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState<View>('contests')

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <DashboardHeader onLogout={handleLogout} />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar view={view} onSelect={setView} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto border-l border-slate-800 p-4">
            <ContestCrud />
          </div>
          <div className="border-t border-slate-800 flex-shrink-0" style={{ minHeight: 280 }}>
            <PrizeClaimsPanel />
          </div>
        </main>
      </div>
      <footer className="border-t border-slate-800 py-2 px-4 text-slate-500 text-xs text-center">
        WeChat Mini Admin — Contest & Prize Management
      </footer>
    </div>
  )
}
