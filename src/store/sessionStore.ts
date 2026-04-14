import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'Admin' | 'Clerk' | 'Supervisor' | 'Court'

export interface SessionUser {
  id: string
  email: string
  displayName: string
  role: UserRole
}

interface SessionState {
  user: SessionUser | null
  setUser: (user: SessionUser | null) => void
  clear: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clear: () => set({ user: null }),
    }),
    { name: 'pod-session' },
  ),
)
