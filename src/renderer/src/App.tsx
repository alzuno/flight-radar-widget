import type React from 'react'
import { useEffect, useState } from 'react'
import type { AppSettings, FlightState } from '../../shared/types'
import './App.css'
import CredentialsGate from './CredentialsGate'
import Radar from './Radar'
import SettingsPanel from './SettingsPanel'

function App(): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [flights, setFlights] = useState<FlightState[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null)

  useEffect(() => {
    window.api.getSettings().then(setSettings)
  }, [])

  useEffect(() => {
    window.api.hasCredentials().then(setHasCredentials)
  }, [])

  useEffect(() => {
    return window.api.onFlightsUpdate((received) => {
      console.log('[renderer] vuelos recibidos:', received)
      setFlights(received)
    })
  }, [])

  useEffect(() => {
    return window.api.onSettingsUpdated(setSettings)
  }, [])

  useEffect(() => {
    return window.api.onSettingsOpenRequest(() => setPanelOpen(true))
  }, [])

  const home = settings
    ? { latitude: settings.homeLatitude, longitude: settings.homeLongitude }
    : null

  return (
    <div
      className="app-drag-region"
      style={{
        color: 'white',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="app-widget-frame">
        {home && settings ? (
          <Radar home={home} flights={flights} pollIntervalSeconds={settings.pollIntervalSeconds} />
        ) : (
          'Cargando...'
        )}

        {hasCredentials !== false && (
          <button
            type="button"
            className="app-settings-toggle"
            onClick={() => setPanelOpen(true)}
            aria-label="Abrir configuración"
          >
            ⚙
          </button>
        )}
      </div>

      {hasCredentials === false && (
        <CredentialsGate
          onSave={(credentials) => window.api.saveCredentials(credentials)}
          onSaved={() => setHasCredentials(true)}
        />
      )}

      {panelOpen && settings && (
        <SettingsPanel
          settings={settings}
          onSave={(next) => window.api.saveSettings(next)}
          onSaveCredentials={(credentials) => window.api.saveCredentials(credentials)}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  )
}

export default App
