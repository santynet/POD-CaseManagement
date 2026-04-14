import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { LoginPage } from './app/routes/LoginPage'
import { DashboardPage } from './app/routes/DashboardPage'
import { SearchPage } from './app/routes/SearchPage'
import { CaseDetailPage } from './app/routes/CaseDetailPage'
import { PartyDetailPage } from './app/routes/PartyDetailPage'
import { PlateHistoryPage } from './app/routes/PlateHistoryPage'
import { LedgerDocketPage } from './app/routes/LedgerDocketPage'
import { TransferLiabilityPage } from './app/routes/TransferLiabilityPage'
import { RegistrationQueuePage } from './app/routes/RegistrationQueuePage'
import { NoticeQueuePage } from './app/routes/NoticeQueuePage'
import { useSessionStore } from './store/sessionStore'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useSessionStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="cases/:caseId" element={<CaseDetailPage />} />
        <Route path="cases/:caseId/ledger" element={<LedgerDocketPage />} />
        <Route path="cases/:caseId/transfer" element={<TransferLiabilityPage />} />
        <Route path="parties/:partyId" element={<PartyDetailPage />} />
        <Route path="plates/:plateId" element={<PlateHistoryPage />} />
        <Route path="lookups" element={<RegistrationQueuePage />} />
        <Route path="notices" element={<NoticeQueuePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
