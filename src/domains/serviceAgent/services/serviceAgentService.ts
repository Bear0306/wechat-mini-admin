import { adminApi, type ServiceAgentCreate, type ServiceAgentUpdate } from '../../../api/client'

export async function loadAgents() {
  return adminApi.serviceAgent.list()
}

export async function loadActiveAgents() {
  return adminApi.serviceAgent.listActive()
}

export async function createAgent(data: ServiceAgentCreate) {
  return adminApi.serviceAgent.create(data)
}

export async function updateAgent(id: number, data: ServiceAgentUpdate) {
  return adminApi.serviceAgent.update(id, data)
}

export async function deleteAgent(id: number) {
  return adminApi.serviceAgent.delete(id)
}
