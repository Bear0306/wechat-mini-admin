import { adminApi, type PrizeClaimStatus } from '../../../api/client'

export async function loadClaims(page = 1, size = 50, filters?: object) {
  return adminApi.prize.listClaims({ page, size, filters })
}

export async function updateClaimStatus(claimId: number, status: PrizeClaimStatus) {
  return adminApi.prize.updateClaimStatus(claimId, status)
}

export async function assignAgent(claimId: number, agentId: number | null) {
  return adminApi.prize.assignAgent(claimId, agentId)
}
