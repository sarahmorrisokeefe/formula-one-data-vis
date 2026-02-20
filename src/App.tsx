import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { SeasonProvider } from '@/context/SeasonContext'
import { AppShell } from '@/components/layout/AppShell'
import { Dashboard } from '@/pages/Dashboard'
import { DriversChampionship } from '@/pages/DriversChampionship'
import { ConstructorsChampionship } from '@/pages/ConstructorsChampionship'
import { RaceCenter } from '@/pages/RaceCenter'
import { RaceDetail } from '@/pages/RaceDetail'
import { DriversList } from '@/pages/DriversList'
import { DriverProfile } from '@/pages/DriverProfile'
import { CircuitGuide } from '@/pages/CircuitGuide'
import { CircuitDetail } from '@/pages/CircuitDetail'
import { PerformanceAnalysis } from '@/pages/PerformanceAnalysis'
import { HeadToHead } from '@/pages/HeadToHead'

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <span className="text-6xl">🏎️</span>
      <h1 className="text-2xl font-bold text-gray-200">Page Not Found</h1>
      <p className="text-gray-500">This section of the track doesn't exist.</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <SeasonProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/championship/drivers" element={<DriversChampionship />} />
              <Route path="/championship/constructors" element={<ConstructorsChampionship />} />
              <Route path="/races" element={<RaceCenter />} />
              <Route path="/races/:round" element={<RaceDetail />} />
              <Route path="/drivers" element={<DriversList />} />
              <Route path="/drivers/:driverId" element={<DriverProfile />} />
              <Route path="/circuits" element={<CircuitGuide />} />
              <Route path="/circuits/:circuitId" element={<CircuitDetail />} />
              <Route path="/analysis" element={<PerformanceAnalysis />} />
              <Route path="/compare" element={<HeadToHead />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        </SeasonProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
