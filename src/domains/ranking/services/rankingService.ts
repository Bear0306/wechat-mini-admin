import { adminApi } from '../../../api/client'

export async function loadContests() {
  return adminApi.contest.list({ page: 1, size: 200 })
}

export async function loadContestRanking(contestId: number, topN = 10, tailCount = 5) {
  return adminApi.leaderboard.getContestRanking(contestId, topN, tailCount)
}
