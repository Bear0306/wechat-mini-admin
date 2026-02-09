const API_BASE = '/api/admin'

function getToken(): string | null {
  return localStorage.getItem('admin_token')
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 401) {
    localStorage.removeItem('admin_token')
    window.dispatchEvent(new Event('admin-logout'))
    throw new Error('Unauthorized')
  }
  const text = await res.text()
  if (!res.ok) {
    let msg = res.statusText
    try {
      const j = JSON.parse(text)
      if (j?.error) msg = j.error
    } catch {
      if (text) msg = text
    }
    throw new Error(msg)
  }
  if (res.status === 204 || !text) return undefined as T
  return JSON.parse(text) as T
}

export const adminApi = {
  auth: {
    login: (username: string, password: string) =>
      api<{ token: string; expiresIn: number; admin: { id: number } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
  },
  contest: {
    list: (params?: { page?: number; size?: number; filters?: object }) => {
      const q = new URLSearchParams()
      if (params?.page != null) q.set('page', String(params.page))
      if (params?.size != null) q.set('size', String(params.size))
      if (params?.filters) q.set('filters', JSON.stringify(params.filters))
      const query = q.toString()
      return api<Contest[]>(`/contest${query ? `?${query}` : ''}`)
    },
    getById: (id: number) => api<ContestWithRules>(`/contest/${id}`),
    create: (data: ContestCreate) => api<Contest>('/contest', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: ContestUpdate) => api<Contest>(`/contest/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => api<void>(`/contest/${id}`, { method: 'DELETE' }),
  },
  prizeRule: {
    list: (contestId: number) => api<ContestPrizeRule[]>(`/prize-rule?contestId=${contestId}`),
    getById: (id: number) => api<ContestPrizeRule>(`/prize-rule/${id}`),
    create: (data: PrizeRuleCreate) => api<ContestPrizeRule>('/prize-rule', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: PrizeRuleUpdate) => api<ContestPrizeRule>(`/prize-rule/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => api<void>(`/prize-rule/${id}`, { method: 'DELETE' }),
  },
  prize: {
    listClaims: (params?: { page?: number; size?: number; filters?: object }) =>
      api<ContestPrizeClaim[]>('/prize/claim', {
        method: 'POST',
        body: JSON.stringify({ page: params?.page ?? 1, size: params?.size ?? 50, filters: params?.filters ?? {} }),
      }),
    updateClaimStatus: (claimId: number, status: PrizeClaimStatus) =>
      api<ContestPrizeClaim>(`/prize/claim/${claimId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    assignAgent: (claimId: number, agentId: number | null) =>
      api<ContestPrizeClaim>(`/prize/claim/${claimId}/agent`, {
        method: 'PATCH',
        body: JSON.stringify({ agentId }),
      }),
  },
  user: {
    getById: (id: number) => api<AdminUser>(`/user/${id}`),
    update: (id: number, data: AdminUserUpdate) =>
      api<AdminUser>(`/user/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  leaderboard: {
    getContestRanking: (contestId: number, topN?: number, tailCount?: number) => {
      const q = new URLSearchParams()
      if (topN != null) q.set('topN', String(topN))
      if (tailCount != null) q.set('tailCount', String(tailCount))
      const query = q.toString()
      return api<ContestRanking>(`/leaderboard/contest/${contestId}${query ? `?${query}` : ''}`)
    },
  },
  region: {
    listByLevel: (level: RegionLevel) =>
      api<Region[]>(`/region?level=${encodeURIComponent(level)}`),
  },
  serviceAgent: {
    list: () => api<ServiceAgent[]>('/service-agent'),
    listActive: () => api<ServiceAgent[]>('/service-agent/active'),
    getById: (id: number) => api<ServiceAgent>(`/service-agent/${id}`),
    create: (data: ServiceAgentCreate) =>
      api<ServiceAgent>('/service-agent', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: ServiceAgentUpdate) =>
      api<ServiceAgent>(`/service-agent/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => api<void>(`/service-agent/${id}`, { method: 'DELETE' }),
  },

}

// Types (aligned with backend/Prisma)
export type RegionLevel = 'NONE' | 'CITY' | 'PROVINCE' | 'DISTRICT'

export interface Region {
  code: string
  name: string
  level: RegionLevel
}
export type ContestFreq = 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type ContestAudience = 'ADULTS' | 'YOUTH'
export type ContestStatus = 'SCHEDULED' | 'ONGOING' | 'FINALIZING' | 'FINALIZED' | 'CANCELED'

export interface Contest {
  id: number
  title: string
  scope: RegionLevel
  regionCode: string | ""
  heatLevel: number
  frequency: ContestFreq
  audience: ContestAudience
  status: ContestStatus
  startAt: string
  endAt: string
  createdAt: string
  updatedAt: string
}

export interface ContestWithRules extends Contest {
  contestPrizeRule: ContestPrizeRule[]
}

export interface ContestCreate {
  title: string
  scope: RegionLevel
  regionCode: string | ""
  frequency: ContestFreq
  audience?: ContestAudience
  status?: ContestStatus
  startAt: string
  endAt: string
}

export type ContestUpdate = Partial<ContestCreate>

export interface ContestPrizeRule {
  id: number
  contestId: number
  rankStart: number
  rankEnd: number
  prizeValueCent: number
}

export interface PrizeRuleCreate {
  contestId: number
  rankStart: number
  rankEnd: number
  prizeValueCent: number
}

export type PrizeRuleUpdate = Partial<Omit<PrizeRuleCreate, 'contestId'>>

export type PrizeClaimStatus = 'PENDING' | 'COMPLETED' | 'REJECTED'

export interface ContestPrizeClaim {
  id: number
  contestId: number
  userId: number
  rank: number
  steps: number
  prizeValueCent: number | null
  assignedAgentId: number | null
  assignedAgent?: { id: number; name: string; wechatId: string | null | undefined | "" } | null
  status: PrizeClaimStatus
  useMultiple: boolean
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminUser {
  id: number
  openid: string
  wechatNick: string | null
  avatarUrl: string | null
  canParticipate: boolean
  isPromoter: boolean
  totalRewardsCent: number
  joinCount: number
  prizeMultiplier: number
  createdAt: string
  updatedAt: string
}

export interface AdminUserUpdate {
  isPromoter?: boolean
  canParticipate?: boolean
  totalRewardsCent?: number
}

export type RankRow = { rank: number; userId: number; name: string; steps: number; avatar?: string | null; abnormal?: boolean }

export interface ContestRanking {
  contestId: number
  contestTitle: string
  totalEntries: number
  top: RankRow[]
  tail: RankRow[]
}

export interface ServiceAgent {
  id: number
  name: string
  wechatId: string | null | undefined | ""
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ServiceAgentCreate {
  name: string
  wechatId?: string | null
}

export interface ServiceAgentUpdate {
  name?: string
  wechatId?: string | null
  isActive?: boolean
}
