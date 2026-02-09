import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import DashboardHeader from '../components/DashboardHeader'
import DashboardSidebar from '../components/DashboardSidebar'
import EventManagement from '../domains/event/components/EventManagement'
import RankingResults from '../domains/ranking/components/RankingResults'
import RewardClaimManagement from '../domains/reward/components/RewardClaimManagement'
import UserManagement from '../domains/user/components/UserManagement'
import ServiceAgentManagement from '../domains/serviceAgent/components/ServiceAgentManagement'

export type View =
  | 'events'
  | 'ranking'
  | 'reward'
  | 'user'
  | 'serviceAgent'

const VIEW_COMPONENTS: Record<View, React.ComponentType> = {
  events: EventManagement,
  ranking: RankingResults,
  reward: RewardClaimManagement,
  user: UserManagement,
  serviceAgent: ServiceAgentManagement,
}

export default function Dashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState<View>('events')

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const Content = VIEW_COMPONENTS[view]

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <DashboardHeader onLogout={handleLogout} />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar view={view} onSelect={setView} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto border-l border-slate-800 p-4">
            <Content />
          </div>
        </main>
      </div>
      <footer className="border-t border-slate-800 py-2 px-4 text-slate-500 text-xs text-center">
        WeChat Mini Admin — Domain-driven dashboard
      </footer>
    </div>
  )
}
