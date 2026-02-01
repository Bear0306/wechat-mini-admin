import { adminApi, type AdminUserUpdate } from '../../../api/client'

export async function getUserById(id: number) {
  return adminApi.user.getById(id)
}

export async function updateUser(id: number, data: AdminUserUpdate) {
  return adminApi.user.update(id, data)
}
