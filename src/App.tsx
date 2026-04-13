import { useEffect, useState } from 'react'
import { dataService, type Case } from './services/dataService'

export default function App() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dataService.listCases()
      .then(setCases)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="container">
      <header>
        <h1>POD Parking Case Management</h1>
        <p>Track and manage parking enforcement cases.</p>
      </header>

      <section>
        <h2>Cases</h2>
        {loading && <p>Loading…</p>}
        {!loading && cases.length === 0 && <p>No cases yet.</p>}
        <ul>
          {cases.map((c) => (
            <li key={c.id}>
              <strong>#{c.id}</strong> — {c.plate} — {c.status}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
