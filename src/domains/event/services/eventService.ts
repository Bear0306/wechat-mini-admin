import {
  adminApi,
  type Contest,
  type ContestWithRules,
  type ContestCreate,
  type ContestUpdate,
  type ContestPrizeRule,
  type PrizeRuleCreate,
  type PrizeRuleUpdate,
  type Region,
  type RegionLevel,
} from '../../../api/client'

export async function loadRegionsByLevel(level: RegionLevel): Promise<Region[]> {
  return adminApi.region.listByLevel(level)
}

export async function loadAllRegions(): Promise<Region[]> {
  return adminApi.region.listAll()
}


export async function loadContests(page = 1, size = 100): Promise<Contest[]> {
  return adminApi.contest.list({ page, size })
}

export async function loadContest(id: number): Promise<ContestWithRules> {
  return adminApi.contest.getById(id)
}

export async function createContest(data: ContestCreate): Promise<Contest> {
  return adminApi.contest.create(data)
}

export async function updateContest(id: number, data: ContestUpdate): Promise<Contest> {
  return adminApi.contest.update(id, data)
}

export async function deleteContest(id: number): Promise<void> {
  return adminApi.contest.delete(id)
}

export async function createPrizeRule(data: PrizeRuleCreate): Promise<ContestPrizeRule> {
  return adminApi.prizeRule.create(data)
}

export async function updatePrizeRule(id: number, data: PrizeRuleUpdate): Promise<ContestPrizeRule> {
  return adminApi.prizeRule.update(id, data)
}

export async function deletePrizeRule(id: number): Promise<void> {
  return adminApi.prizeRule.delete(id)
}
