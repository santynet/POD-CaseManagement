import type { UserRole } from '../store/sessionStore'

export type Action =
  | 'case.view'
  | 'case.edit'
  | 'case.dismiss'
  | 'case.transferLiability'
  | 'payment.accept'
  | 'hearing.request'
  | 'hearing.decide'
  | 'motion.request'
  | 'document.upload'
  | 'queue.view'
  | 'queue.process'
  | 'notice.send'
  | 'admin.users'

const matrix: Record<UserRole, Action[]> = {
  Admin: [
    'case.view', 'case.edit', 'case.dismiss', 'case.transferLiability',
    'payment.accept', 'hearing.request', 'hearing.decide',
    'motion.request', 'document.upload',
    'queue.view', 'queue.process', 'notice.send', 'admin.users',
  ],
  Supervisor: [
    'case.view', 'case.edit', 'case.dismiss', 'case.transferLiability',
    'payment.accept', 'hearing.request', 'motion.request', 'document.upload',
    'queue.view', 'queue.process', 'notice.send',
  ],
  Clerk: [
    'case.view', 'case.edit', 'case.transferLiability',
    'payment.accept', 'hearing.request', 'motion.request',
    'document.upload', 'queue.view',
  ],
  Court: [
    'case.view', 'hearing.decide', 'document.upload',
  ],
}

export const can = (role: UserRole | undefined | null, action: Action): boolean => {
  if (!role) return false
  return matrix[role].includes(action)
}
