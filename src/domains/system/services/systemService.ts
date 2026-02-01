import { adminApi, type SystemConfig } from '../../../api/client'

export async function loadConfig() {
  return adminApi.system.getConfig()
}

export async function updateConfig(data: Partial<SystemConfig>) {
  return adminApi.system.updateConfig(data)
}
