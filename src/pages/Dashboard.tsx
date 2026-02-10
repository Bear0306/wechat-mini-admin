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

export default function Dashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState<View>('events')
  const [rankingContestId, setRankingContestId] = useState<number | null>(null);

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const renderContent = () => {
    switch (view) {
      case 'events':
        return (
          <EventManagement
            onSelect={(v: View, contestId?: number | null) => {
              setView(v);
              if (contestId) setRankingContestId(contestId);
            }}
          />  
        )
      case 'ranking':
        // Ensure contestId is a number, as required by RankingResults
        return rankingContestId !== null ? (
          <RankingResults contestId={rankingContestId} />
        ) : (
          <RankingResults />
        );
      case 'reward':
        return <RewardClaimManagement />;
      case 'user':
        return <UserManagement />;
      case 'serviceAgent':
        return <ServiceAgentManagement />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <DashboardHeader onLogout={handleLogout} />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar view={view} onSelect={setView} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto border-l border-slate-800 p-4">
            {renderContent()}
          </div>
        </main>
      </div>
      <footer className="border-t border-slate-800 py-2 px-4 text-slate-500 text-xs text-center">
        WeChat Mini Admin — Domain-driven dashboard
      </footer>
    </div>
  )
}
