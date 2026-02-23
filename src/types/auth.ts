export interface User {
  id: string
  name: string
  email: string
  role: 'council_member' | 'admin' | 'support'
  council_member_id: string
  council_id: string
  avatar?: string
  phone?: string
  bio?: string
  isAdmin?: boolean
  materia_permissions?: string[]
}

export interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SSOCallback {
  token: string
  name: string
  userId: string
}
