import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSessionStore, type UserRole } from '../../store/sessionStore'
import { InputField } from '../../components/ui/InputField'
import { Button } from '../../components/ui/Button'

const DEMO_USERS: { email: string; password: string; displayName: string; role: UserRole }[] = [
  { email: 'admin@pod.local',      password: 'Demo1234!', displayName: 'Alex Admin',     role: 'Admin' },
  { email: 'clerk@pod.local',      password: 'Demo1234!', displayName: 'Carla Clerk',    role: 'Clerk' },
  { email: 'supervisor@pod.local', password: 'Demo1234!', displayName: 'Sam Supervisor', role: 'Supervisor' },
  { email: 'court@pod.local',      password: 'Demo1234!', displayName: 'Judge Cordell',  role: 'Court' },
]

export function LoginPage() {
  const [email, setEmail] = useState('clerk@pod.local')
  const [password, setPassword] = useState('Demo1234!')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showSeed, setShowSeed] = useState(false)
  const [seedMsg, setSeedMsg] = useState<string | null>(null)
  const navigate = useNavigate()
  const setUser = useSessionStore((s) => s.setUser)

  const resolveRole = (e: string): UserRole =>
    DEMO_USERS.find((u) => u.email === e)?.role ?? 'Clerk'

  const resolveName = (e: string): string =>
    DEMO_USERS.find((u) => u.email === e)?.displayName ?? e.split('@')[0]

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (err || !data.user) {
      setError(err?.message ?? 'Sign-in failed')
      setShowSeed(true)
      return
    }
    setUser({
      id: data.user.id,
      email: data.user.email!,
      displayName: resolveName(data.user.email!),
      role: resolveRole(data.user.email!),
    })
    navigate('/dashboard')
  }

  async function initializeDemoUsers() {
    setBusy(true)
    setSeedMsg('Creating demo users…')
    for (const u of DEMO_USERS) {
      await supabase.auth.signUp({ email: u.email, password: u.password })
    }
    setBusy(false)
    setSeedMsg('Demo users created. Try logging in again.')
    setShowSeed(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-secondary/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-surface-container-highest mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">account_balance</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2">POD New System</h1>
          <p className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
            Parking Operations Department
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm ring-1 ring-outline-variant/15">
          <form onSubmit={onSubmit} className="space-y-6">
            <InputField
              label="Email"
              iconLeft="person"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@pod.local"
              required
              autoComplete="username"
            />
            <InputField
              label="Password"
              iconLeft="lock"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            {error && <p className="text-xs text-error">{error}</p>}
            <Button type="submit" size="lg" className="w-full" iconRight="arrow_forward" disabled={busy}>
              {busy ? 'Signing in…' : 'Log In'}
            </Button>
          </form>

          {showSeed && (
            <div className="mt-6 pt-6 border-t border-outline-variant/20">
              <p className="text-xs text-on-surface-variant mb-3">
                First run? Create the four demo users (Admin / Clerk / Supervisor / Court) with
                password <code className="text-primary">Demo1234!</code>.
              </p>
              <Button variant="secondary" size="sm" onClick={initializeDemoUsers} disabled={busy} className="w-full">
                Initialize Demo Users
              </Button>
              {seedMsg && <p className="text-xs text-primary mt-3">{seedMsg}</p>}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-outline-variant/10 flex items-start gap-3">
            <span className="material-symbols-outlined text-secondary text-lg mt-0.5">verified_user</span>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Authorized access only. All activities are monitored and logged.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-6 text-label-sm uppercase tracking-wider text-outline">
          <a href="#" className="hover:text-primary">Privacy</a>
          <span>|</span>
          <a href="#" className="hover:text-primary">Help Desk</a>
          <span>|</span>
          <a href="#" className="hover:text-primary">System Status</a>
        </div>
      </div>
    </div>
  )
}
