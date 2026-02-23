import type { User } from '@/types/auth'

export const sanitizeUserForStorage = (user: User): User => {
  const minimalUser: User = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    council_member_id: user.council_member_id,
    council_id: user.council_id,
  }

  if (user.isAdmin !== undefined) {
    minimalUser.isAdmin = user.isAdmin
  }

  if (user.materia_permissions) {
    minimalUser.materia_permissions = user.materia_permissions;
  }

  return minimalUser
}
